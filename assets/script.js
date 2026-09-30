/* =========================================================
   NEXAHUB — PABWE P3
   Semua logika interaksi aplikasi berada di file ini.
   ========================================================= */

"use strict";

/* ----------------------------- 
   1. Konstanta & Helper
------------------------------ */
const STORAGE = {
  expenses: "nexahub_expenses_v1",
  bookmarks: "nexahub_bookmarks_v1",
  highScore: "nexahub_quiz_highscore_v1",
  activeTab: "nexahub_active_tab_v1"
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const uid = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const loadJSON = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Gagal membaca ${key}:`, error);
    return fallback;
  }
};

const saveJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const escapeHTML = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
};

const todayISO = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function showToast(message) {
  const toast = $("#toast");
  $("#toastMessage").textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 2600);
}

function setFieldError(input, message) {
  const error = $(`#${input.id}Error`);
  input.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message || "";
}

/* ----------------------------- 
   2. Tab Navigation
------------------------------ */
const tabs = $$(".tab-btn");
const panels = $$(".panel");

function activateTab(tabName) {
  const allowed = ["expense", "bookmark", "quiz"];
  const name = allowed.includes(tabName) ? tabName : "expense";

  tabs.forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${name}`);
  });

  localStorage.setItem(STORAGE.activeTab, name);
}

tabs.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

/* ----------------------------- 
   3. Expense Tracker
------------------------------ */
let expenses = loadJSON(STORAGE.expenses, []);

const expenseForm = $("#expenseForm");
const expenseList = $("#expenseList");

$("#expenseDate").value = todayISO();

function validateExpenseForm() {
  const title = $("#expenseTitle");
  const category = $("#expenseCategory");
  const amount = $("#expenseAmount");
  const date = $("#expenseDate");

  let valid = true;

  if (!title.value.trim()) {
    setFieldError(title, "Judul wajib diisi.");
    valid = false;
  } else setFieldError(title, "");

  if (!category.value) {
    setFieldError(category, "Pilih kategori.");
    valid = false;
  } else setFieldError(category, "");

  if (!amount.value || Number(amount.value) <= 0 || !Number.isFinite(Number(amount.value))) {
    setFieldError(amount, "Jumlah harus berupa angka lebih dari 0.");
    valid = false;
  } else setFieldError(amount, "");

  if (!date.value) {
    setFieldError(date, "Tanggal wajib diisi.");
    valid = false;
  } else setFieldError(date, "");

  return valid;
}

function updateExpenseSummary() {
  const income = expenses
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expense = expenses
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  $("#totalIncome").textContent = formatRupiah(income);
  $("#totalExpense").textContent = formatRupiah(expense);
  $("#balance").textContent = formatRupiah(income - expense);
}

function getFilteredExpenses() {
  const query = $("#expenseSearch").value.trim().toLowerCase();
  const type = $("#expenseFilterType").value;
  const sort = $("#expenseSort").value;

  const filtered = expenses.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query);
    const matchesType = type === "all" || item.type === type;
    return matchesQuery && matchesType;
  });

  filtered.sort((a, b) => {
    if (sort === "newest") return new Date(b.date) - new Date(a.date);
    if (sort === "oldest") return new Date(a.date) - new Date(b.date);
    if (sort === "highest") return Number(b.amount) - Number(a.amount);
    if (sort === "lowest") return Number(a.amount) - Number(b.amount);
    return 0;
  });

  return filtered;
}

function renderExpenses() {
  updateExpenseSummary();
  updateActivityCount();

  const filtered = getFilteredExpenses();

  if (!filtered.length) {
    expenseList.innerHTML = `
      <div class="empty">
        <div class="empty-icon"><i data-lucide="receipt-text"></i></div>
        <h4>${expenses.length ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}</h4>
        <p>${expenses.length ? "Coba ubah kata pencarian atau filter yang digunakan." : "Tambahkan transaksi pertamamu melalui formulir di sebelah kiri."}</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  expenseList.innerHTML = filtered.map((item) => `
    <article class="item">
      <div class="item-main">
        <div>
          <h4 class="item-title">${escapeHTML(item.title)}</h4>
          <div class="item-meta">
            <span class="badge ${item.type === "income" ? "badge-income" : "badge-expense"}">
              ${item.type === "income" ? "Pemasukan" : "Pengeluaran"}
            </span>
            <span class="badge">${escapeHTML(item.category)}</span>
            <span>${formatDate(item.date)}</span>
          </div>
        </div>
        <div class="amount ${item.type}">
          ${item.type === "income" ? "+" : "-"} ${formatRupiah(item.amount)}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-soft btn-sm" data-action="edit-expense" data-id="${item.id}" type="button">
          <i data-lucide="pencil"></i> Ubah
        </button>
        <button class="btn btn-danger btn-sm" data-action="delete-expense" data-id="${item.id}" type="button">
          <i data-lucide="trash-2"></i> Hapus
        </button>
      </div>
    </article>
  `).join("");

  lucide.createIcons();
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateExpenseForm()) return;

  const item = {
    id: uid("exp"),
    title: $("#expenseTitle").value.trim(),
    category: $("#expenseCategory").value,
    amount: Number($("#expenseAmount").value),
    type: $("#expenseType").value,
    date: $("#expenseDate").value,
    createdAt: Date.now()
  };

  expenses.push(item);
  saveJSON(STORAGE.expenses, expenses);
  expenseForm.reset();
  $("#expenseDate").value = todayISO();

  renderExpenses();
  showToast("Transaksi berhasil disimpan.");
});

["input", "change"].forEach((eventName) => {
  ["#expenseSearch", "#expenseFilterType", "#expenseSort"].forEach((selector) => {
    $(selector).addEventListener(eventName, renderExpenses);
  });
});

expenseList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit-expense") openExpenseEditModal(id);
  if (action === "delete-expense") openDeleteModal("expense", id);
});

/* ----------------------------- 
   4. Bookmark Manager
------------------------------ */
let bookmarks = loadJSON(STORAGE.bookmarks, []);

const bookmarkForm = $("#bookmarkForm");
const bookmarkList = $("#bookmarkList");

function isValidURL(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateBookmarkForm() {
  const name = $("#bookmarkName");
  const url = $("#bookmarkUrl");
  const category = $("#bookmarkCategory");

  let valid = true;

  if (!name.value.trim()) {
    setFieldError(name, "Nama bookmark wajib diisi.");
    valid = false;
  } else setFieldError(name, "");

  if (!isValidURL(url.value)) {
    setFieldError(url, "URL harus diawali http:// atau https://.");
    valid = false;
  } else setFieldError(url, "");

  if (!category.value.trim()) {
    setFieldError(category, "Kategori wajib diisi.");
    valid = false;
  } else setFieldError(category, "");

  return valid;
}

function getFilteredBookmarks() {
  const query = $("#bookmarkSearch").value.trim().toLowerCase();
  const sort = $("#bookmarkSort").value;

  const filtered = bookmarks.filter((item) => {
    const searchable = `${item.name} ${item.url} ${item.category}`.toLowerCase();
    return searchable.includes(query);
  });

  filtered.sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name, "id");
    if (sort === "za") return b.name.localeCompare(a.name, "id");
    return b.createdAt - a.createdAt;
  });

  return filtered;
}

function renderBookmarks() {
  updateActivityCount();
  const filtered = getFilteredBookmarks();

  if (!filtered.length) {
    bookmarkList.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <div class="empty-icon"><i data-lucide="bookmark-x"></i></div>
        <h4>${bookmarks.length ? "Bookmark tidak ditemukan" : "Belum ada bookmark"}</h4>
        <p>${bookmarks.length ? "Coba kata pencarian lain." : "Simpan link pentingmu melalui formulir di sebelah kiri."}</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  bookmarkList.innerHTML = filtered.map((item) => {
    const initial = escapeHTML(item.name.trim().charAt(0) || "W");
    return `
      <article class="bookmark-card">
        <div class="bookmark-top">
          <div class="site-icon">${initial}</div>
          <div style="min-width:0;flex:1">
            <h4>${escapeHTML(item.name)}</h4>
            <a class="bookmark-url" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHTML(item.url)}
            </a>
          </div>
        </div>
        <div class="item-meta">
          <span class="badge badge-primary">${escapeHTML(item.category)}</span>
          <span>${formatDate(new Date(item.createdAt).toISOString().slice(0, 10))}</span>
        </div>
        ${item.note ? `<p class="bookmark-note">${escapeHTML(item.note)}</p>` : ""}
        <div class="item-actions">
          <button class="btn btn-soft btn-sm" data-action="edit-bookmark" data-id="${item.id}" type="button">
            <i data-lucide="pencil"></i> Ubah
          </button>
          <button class="btn btn-danger btn-sm" data-action="delete-bookmark" data-id="${item.id}" type="button">
            <i data-lucide="trash-2"></i> Hapus
          </button>
        </div>
      </article>
    `;
  }).join("");

  lucide.createIcons();
}

bookmarkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateBookmarkForm()) return;

  const item = {
    id: uid("bm"),
    name: $("#bookmarkName").value.trim(),
    url: $("#bookmarkUrl").value.trim(),
    category: $("#bookmarkCategory").value.trim(),
    note: $("#bookmarkNote").value.trim(),
    createdAt: Date.now()
  };

  bookmarks.push(item);
  saveJSON(STORAGE.bookmarks, bookmarks);
  bookmarkForm.reset();

  renderBookmarks();
  showToast("Bookmark berhasil disimpan.");
});

["input", "change"].forEach((eventName) => {
  ["#bookmarkSearch", "#bookmarkSort"].forEach((selector) => {
    $(selector).addEventListener(eventName, renderBookmarks);
  });
});

bookmarkList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit-bookmark") openBookmarkEditModal(id);
  if (action === "delete-bookmark") openDeleteModal("bookmark", id);
});

$("#clearBookmarks").addEventListener("click", () => {
  if (!bookmarks.length) {
    showToast("Belum ada bookmark untuk dibersihkan.");
    return;
  }
  openDeleteModal("all-bookmarks", null);
});

/* ----------------------------- 
   5. Quiz App
------------------------------ */
const questions = [
  {
    question: "Tag HTML apa yang paling tepat untuk membuat tautan?",
    options: ["<link>", "<a>", "<href>", "<url>"],
    answer: 1
  },
  {
    question: "Properti CSS apa yang digunakan untuk mengubah warna teks?",
    options: ["font-color", "text-color", "color", "foreground"],
    answer: 2
  },
  {
    question: "Method JavaScript mana yang digunakan untuk menambahkan item ke akhir array?",
    options: ["push()", "add()", "append()", "insert()"],
    answer: 0
  },
  {
    question: "Web Storage API yang dapat menyimpan data setelah browser ditutup adalah...",
    options: ["sessionStorage", "localStorage", "tempStorage", "cookieStorage"],
    answer: 1
  },
  {
    question: "Manakah yang merupakan selector DOM yang valid?",
    options: ["querySelector()", "selectDOM()", "getElement()", "findNode()"],
    answer: 0
  },
  {
    question: "Atribut HTML yang membuat link dibuka pada tab baru adalah...",
    options: ["new-tab", "target='_blank'", "open='new'", "tab='blank'"],
    answer: 1
  }
];

let quizState = {
  index: 0,
  score: 0,
  answered: false
};

const highScore = () => Number(localStorage.getItem(STORAGE.highScore)) || 0;

function updateHighScoreUI() {
  const value = `${highScore()} / ${questions.length}`;
  $("#startHighScore").textContent = value;
  $("#resultHighScore").textContent = value;
}

function startQuiz() {
  quizState = { index: 0, score: 0, answered: false };
  $("#quizStart").hidden = true;
  $("#quizResult").hidden = true;
  $("#quizQuestionView").hidden = false;
  renderQuestion();
}

function renderQuestion() {
  const current = questions[quizState.index];
  const number = quizState.index + 1;
  const percent = Math.round((number / questions.length) * 100);

  quizState.answered = false;
  $("#questionCounter").textContent = `Soal ${number} dari ${questions.length}`;
  $("#questionPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#quizQuestion").textContent = current.question;
  $("#quizFeedback").hidden = true;
  $("#nextQuestion").disabled = true;

  $("#quizOptions").innerHTML = current.options.map((option, index) => `
    <button class="option" data-option="${index}" type="button">
      <span class="option-key">${String.fromCharCode(65 + index)}</span>
      <span>${escapeHTML(option)}</span>
    </button>
  `).join("");

  lucide.createIcons();
}

$("#quizOptions").addEventListener("click", (event) => {
  const option = event.target.closest(".option");
  if (!option || quizState.answered) return;

  quizState.answered = true;

  const selected = Number(option.dataset.option);
  const correct = questions[quizState.index].answer;
  const options = $$(".option");

  options.forEach((button) => {
    button.disabled = true;
    const value = Number(button.dataset.option);
    if (value === correct) button.classList.add("correct");
    if (value === selected && selected !== correct) button.classList.add("wrong");
  });

  if (selected === correct) {
    quizState.score += 1;
    $("#quizFeedback").innerHTML = `<strong>Benar!</strong> Jawabanmu tepat.`;
  } else {
    $("#quizFeedback").innerHTML = `<strong>Belum tepat.</strong> Jawaban yang benar adalah <strong>${escapeHTML(questions[quizState.index].options[correct])}</strong>.`;
  }

  $("#quizFeedback").hidden = false;
  $("#nextQuestion").disabled = false;
});

$("#nextQuestion").addEventListener("click", () => {
  if (!quizState.answered) return;

  if (quizState.index < questions.length - 1) {
    quizState.index += 1;
    renderQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  const score = quizState.score;
  const currentHigh = highScore();

  if (score > currentHigh) {
    localStorage.setItem(STORAGE.highScore, String(score));
  }

  $("#quizQuestionView").hidden = true;
  $("#quizResult").hidden = false;
  $("#scoreCircle").textContent = `${score} / ${questions.length}`;
  $("#resultTitle").textContent = score === questions.length ? "Perfect score! 🎉" : "Kuis selesai!";
  $("#resultDescription").textContent =
    score === questions.length
      ? "Semua jawaban benar. Keren, pemahaman dasarmu sangat solid."
      : `Kamu menjawab ${score} dari ${questions.length} soal dengan benar. Coba lagi untuk meningkatkan skor terbaikmu.`;

  updateHighScoreUI();
  showToast(score > currentHigh ? "High score baru! 🏆" : "Kuis selesai. Good job!");
}

$("#startQuiz").addEventListener("click", startQuiz);
$("#restartQuiz").addEventListener("click", startQuiz);
$("#resetQuiz").addEventListener("click", () => {
  $("#quizQuestionView").hidden = true;
  $("#quizResult").hidden = true;
  $("#quizStart").hidden = false;
  updateHighScoreUI();
});

/* ----------------------------- 
   6. Modal CRUD
------------------------------ */
const modalBackdrop = $("#modalBackdrop");
const modalBody = $("#modalBody");

function openModal(title, bodyHTML) {
  $("#modalTitle").textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalBackdrop.hidden = false;
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  lucide.createIcons();
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("#modalClose").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});

function openExpenseEditModal(id) {
  const item = expenses.find((entry) => entry.id === id);
  if (!item) return;

  openModal("Ubah transaksi", `
    <form id="editExpenseForm" novalidate>
      <div class="field">
        <label for="editExpenseTitle">Judul / deskripsi</label>
        <input class="input" id="editExpenseTitle" value="${escapeHTML(item.title)}">
        <p class="form-error" id="editExpenseTitleError"></p>
      </div>
      <div class="field">
        <label for="editExpenseCategory">Kategori</label>
        <select class="select" id="editExpenseCategory">
          ${["Makanan","Transportasi","Belanja","Tagihan","Hiburan","Pendidikan","Lainnya"].map((cat) =>
            `<option ${cat === item.category ? "selected" : ""}>${cat}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="editExpenseAmount">Jumlah (Rp)</label>
        <input class="input" id="editExpenseAmount" type="number" min="1" value="${Number(item.amount)}">
        <p class="form-error" id="editExpenseAmountError"></p>
      </div>
      <div class="field">
        <label for="editExpenseType">Tipe</label>
        <select class="select" id="editExpenseType">
          <option value="expense" ${item.type === "expense" ? "selected" : ""}>Pengeluaran</option>
          <option value="income" ${item.type === "income" ? "selected" : ""}>Pemasukan</option>
        </select>
      </div>
      <div class="field">
        <label for="editExpenseDate">Tanggal</label>
        <input class="input" id="editExpenseDate" type="date" value="${escapeHTML(item.date)}">
        <p class="form-error" id="editExpenseDateError"></p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
        <button class="btn btn-primary" style="width:auto" type="submit"><i data-lucide="save"></i> Simpan perubahan</button>
      </div>
    </form>
  `);

  $("#editExpenseForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#editExpenseTitle");
    const amount = $("#editExpenseAmount");
    const date = $("#editExpenseDate");
    let valid = true;

    if (!title.value.trim()) {
      $("#editExpenseTitleError").textContent = "Judul wajib diisi.";
      title.classList.add("invalid");
      valid = false;
    } else {
      $("#editExpenseTitleError").textContent = "";
      title.classList.remove("invalid");
    }

    if (!amount.value || Number(amount.value) <= 0) {
      $("#editExpenseAmountError").textContent = "Jumlah harus lebih dari 0.";
      amount.classList.add("invalid");
      valid = false;
    } else {
      $("#editExpenseAmountError").textContent = "";
      amount.classList.remove("invalid");
    }

    if (!date.value) {
      $("#editExpenseDateError").textContent = "Tanggal wajib diisi.";
      date.classList.add("invalid");
      valid = false;
    } else {
      $("#editExpenseDateError").textContent = "";
      date.classList.remove("invalid");
    }

    if (!valid) return;

    Object.assign(item, {
      title: title.value.trim(),
      category: $("#editExpenseCategory").value,
      amount: Number(amount.value),
      type: $("#editExpenseType").value,
      date: date.value
    });

    saveJSON(STORAGE.expenses, expenses);
    renderExpenses();
    closeModal();
    showToast("Transaksi berhasil diperbarui.");
  });

  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
}

function openBookmarkEditModal(id) {
  const item = bookmarks.find((entry) => entry.id === id);
  if (!item) return;

  openModal("Ubah bookmark", `
    <form id="editBookmarkForm" novalidate>
      <div class="field">
        <label for="editBookmarkName">Nama / judul</label>
        <input class="input" id="editBookmarkName" value="${escapeHTML(item.name)}">
        <p class="form-error" id="editBookmarkNameError"></p>
      </div>
      <div class="field">
        <label for="editBookmarkUrl">URL</label>
        <input class="input" id="editBookmarkUrl" type="url" value="${escapeHTML(item.url)}">
        <p class="form-error" id="editBookmarkUrlError"></p>
      </div>
      <div class="field">
        <label for="editBookmarkCategory">Kategori / tag</label>
        <input class="input" id="editBookmarkCategory" value="${escapeHTML(item.category)}">
        <p class="form-error" id="editBookmarkCategoryError"></p>
      </div>
      <div class="field">
        <label for="editBookmarkNote">Catatan</label>
        <textarea class="textarea" id="editBookmarkNote">${escapeHTML(item.note || "")}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
        <button class="btn btn-primary" style="width:auto" type="submit"><i data-lucide="save"></i> Simpan perubahan</button>
      </div>
    </form>
  `);

  $("#editBookmarkForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#editBookmarkName");
    const url = $("#editBookmarkUrl");
    const category = $("#editBookmarkCategory");
    let valid = true;

    if (!name.value.trim()) {
      $("#editBookmarkNameError").textContent = "Nama wajib diisi.";
      name.classList.add("invalid");
      valid = false;
    } else {
      $("#editBookmarkNameError").textContent = "";
      name.classList.remove("invalid");
    }

    if (!isValidURL(url.value)) {
      $("#editBookmarkUrlError").textContent = "URL harus diawali http:// atau https://.";
      url.classList.add("invalid");
      valid = false;
    } else {
      $("#editBookmarkUrlError").textContent = "";
      url.classList.remove("invalid");
    }

    if (!category.value.trim()) {
      $("#editBookmarkCategoryError").textContent = "Kategori wajib diisi.";
      category.classList.add("invalid");
      valid = false;
    } else {
      $("#editBookmarkCategoryError").textContent = "";
      category.classList.remove("invalid");
    }

    if (!valid) return;

    Object.assign(item, {
      name: name.value.trim(),
      url: url.value.trim(),
      category: category.value.trim(),
      note: $("#editBookmarkNote").value.trim()
    });

    saveJSON(STORAGE.bookmarks, bookmarks);
    renderBookmarks();
    closeModal();
    showToast("Bookmark berhasil diperbarui.");
  });

  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
}

function openDeleteModal(type, id) {
  const isAll = type === "all-bookmarks";
  const title = isAll ? "Bersihkan semua bookmark?" : "Hapus item?";
  const description = isAll
    ? "Semua bookmark yang tersimpan akan dihapus dari browser dan tidak dapat dikembalikan."
    : "Item yang dipilih akan dihapus dari penyimpanan lokal.";

  openModal(title, `
    <p style="color:var(--muted);font-size:13px;margin:0 0 18px">${description}</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-danger" type="button" id="confirmDelete"><i data-lucide="trash-2"></i> Hapus</button>
    </div>
  `);

  $("#confirmDelete").addEventListener("click", () => {
    if (type === "expense") {
      expenses = expenses.filter((item) => item.id !== id);
      saveJSON(STORAGE.expenses, expenses);
      renderExpenses();
      showToast("Transaksi dihapus.");
    } else if (type === "bookmark") {
      bookmarks = bookmarks.filter((item) => item.id !== id);
      saveJSON(STORAGE.bookmarks, bookmarks);
      renderBookmarks();
      showToast("Bookmark dihapus.");
    } else {
      bookmarks = [];
      saveJSON(STORAGE.bookmarks, bookmarks);
      renderBookmarks();
      showToast("Semua bookmark berhasil dibersihkan.");
    }
    closeModal();
  });

  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
}

/* ----------------------------- 
   7. UI Count & Initial State
------------------------------ */
function updateActivityCount() {
  $("#activityCount").textContent = expenses.length + bookmarks.length;
}

function initialize() {
  renderExpenses();
  renderBookmarks();
  updateHighScoreUI();
  updateActivityCount();

  const savedTab = localStorage.getItem(STORAGE.activeTab);
  activateTab(savedTab || "expense");

  lucide.createIcons();
}

initialize();
