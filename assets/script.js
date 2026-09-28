/* =========================================================================
   HARIAN — script.js
   Tiga fitur dalam satu proyek: Expense Tracker, Bookmark Manager, Quiz App.
   Dipisah per bagian dengan komentar. Semua data disimpan di localStorage
   dengan key yang berbeda supaya tidak saling menimpa.
   ========================================================================= */

/* ============================ UTIL UMUM ============================ */

const LS_KEYS = {
  EXPENSES: 'harian:expenses',
  BOOKMARKS: 'harian:bookmarks',
  HIGHSCORE: 'harian:highscore',
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn('Gagal membaca localStorage untuk', key, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatRupiah(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

function formatDate(isoDate) {
  if (!isoDate) return '-';
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* Ikon memakai Tabler Icons (webfont via CDN). Semua dikumpulkan di satu tempat
   dan disisipkan lewat ICONS.* atau atribut data-icon di HTML. */
const tabler = (name, size = 'text-base') =>
  `<i class="ti ti-${name} ${size}" aria-hidden="true"></i>`;

const ICONS = {
  edit: () => tabler('pencil'),
  trash: () => tabler('trash'),
  wallet: () => tabler('wallet', 'text-lg'),
  bookmark: () => tabler('bookmark', 'text-lg'),
  target: () => tabler('target', 'text-lg'),
};

function injectIcons(scope = document) {
  $$('[data-icon]', scope).forEach((el) => {
    el.innerHTML = ICONS[el.dataset.icon]?.() ?? '';
  });
}

/* ---------------------- Validasi form (dipakai semua form) ---------------------- */
/* rules: array of { ok: boolean, message: string } — mengembalikan pesan error pertama. */
function firstError(rules) {
  const failed = rules.find((rule) => !rule.ok);
  return failed ? failed.message : null;
}

function showFormError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

function iconBtn(icon, dataAttr, extraClasses = '') {
  return `<button type="button" ${dataAttr} class="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-line text-ink/50 hover:text-ink hover:border-ink/40 transition-colors ${extraClasses}">${icon}</button>`;
}

/* -------------------------- Modal helpers -------------------------- */

function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  el.classList.remove('flex');
}

$$('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});

$$('.modal-shell').forEach((shell) => {
  shell.addEventListener('click', (e) => {
    if (e.target === shell) closeModal(shell.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal-shell').forEach((shell) => {
      if (!shell.classList.contains('hidden')) closeModal(shell.id);
    });
  }
});

/* Shared delete-confirmation modal, used by both Expense and Bookmark */
let pendingDelete = null; // { type: 'expense' | 'bookmark', id }

function askDelete(type, id, label) {
  pendingDelete = { type, id };
  $('#confirmModalText').textContent = label
    ? `"${label}" akan dihapus permanen.`
    : 'Tindakan ini tidak bisa dibatalkan.';
  openModal('confirmModal');
}

$('#confirmDeleteBtn').addEventListener('click', () => {
  if (!pendingDelete) return;
  if (pendingDelete.type === 'expense') {
    expenses = expenses.filter((item) => item.id !== pendingDelete.id);
    saveJSON(LS_KEYS.EXPENSES, expenses);
    renderExpenses();
  } else if (pendingDelete.type === 'bookmark') {
    bookmarks = bookmarks.filter((item) => item.id !== pendingDelete.id);
    saveJSON(LS_KEYS.BOOKMARKS, bookmarks);
    renderBookmarks();
  }
  pendingDelete = null;
  closeModal('confirmModal');
});

/* ============================ TAB NAVIGATION ============================ */

const panels = {
  expense: $('#panel-expense'),
  bookmark: $('#panel-bookmark'),
  quiz: $('#panel-quiz'),
};
const tabIndicator = $('#tabIndicator');
let currentTab = 'expense';

function moveIndicator(name) {
  const btn = $(`.tab-btn[data-tab="${name}"]`);
  if (!btn) return;
  tabIndicator.style.width = btn.offsetWidth + 'px';
  tabIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
}

const VALID_TABS = Object.keys(panels);

/* Tab aktif dibaca dari query string (?tab=expense|bookmark|quiz). */
function getTabFromUrl() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return VALID_TABS.includes(tab) ? tab : 'expense';
}

/* Tulis pilihan tab ke URL tanpa menambah riwayat browser. */
function syncTabToUrl(name) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', name);
  history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function setActiveTab(name) {
  currentTab = name;
  $$('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('text-ink', active);
    btn.classList.toggle('text-ink/50', !active);
    btn.setAttribute('aria-selected', String(active));
  });
  Object.entries(panels).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
    el.classList.toggle('flex', key === name);
  });
  moveIndicator(name);
  syncTabToUrl(name);
  if (name === 'quiz') updateHighScoreDisplay();
}

$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveTab(btn.dataset.tab);
  });
});

window.addEventListener('resize', () => moveIndicator(currentTab));

/* ============================ EXPENSE TRACKER ============================ */

const CATEGORY_OPTIONS = {
  Pemasukan: ['Uang Saku', 'Gaji', 'Beasiswa', 'Bonus', 'Lainnya'],
  Pengeluaran: ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Pendidikan', 'Lainnya'],
};

let expenses = loadJSON(LS_KEYS.EXPENSES, []);

const expenseSearch = $('#expenseSearch');
const expenseFilterType = $('#expenseFilterType');
const expenseFilterCategory = $('#expenseFilterCategory');
const expenseSort = $('#expenseSort');
const expenseList = $('#expenseList');
const expenseEmpty = $('#expenseEmpty');

const expenseModal = $('#expenseModal');
const expenseForm = $('#expenseForm');
const expenseModalTitle = $('#expenseModalTitle');
const expenseIdInput = $('#expenseIdInput');
const expenseTitleInput = $('#expenseTitleInput');
const expenseTypeInput = $('#expenseTypeInput');
const expenseCategoryInput = $('#expenseCategoryInput');
const expenseAmountInput = $('#expenseAmountInput');
const expenseDateInput = $('#expenseDateInput');
const expenseFormError = $('#expenseFormError');

function populateCategorySelect(selectEl, type, selectedValue) {
  const options = CATEGORY_OPTIONS[type] || [];
  selectEl.innerHTML = options
    .map((cat) => `<option value="${cat}" ${cat === selectedValue ? 'selected' : ''}>${cat}</option>`)
    .join('');
}

function populateFilterCategoryOnce() {
  const all = [...new Set([...CATEGORY_OPTIONS.Pemasukan, ...CATEGORY_OPTIONS.Pengeluaran])].sort();
  expenseFilterCategory.insertAdjacentHTML(
    'beforeend',
    all.map((cat) => `<option value="${cat}">${cat}</option>`).join('')
  );
}
populateFilterCategoryOnce();

expenseTypeInput.addEventListener('change', () => {
  populateCategorySelect(expenseCategoryInput, expenseTypeInput.value);
});

function resetExpenseForm() {
  expenseIdInput.value = '';
  expenseTitleInput.value = '';
  expenseTypeInput.value = 'Pengeluaran';
  populateCategorySelect(expenseCategoryInput, 'Pengeluaran');
  expenseAmountInput.value = '';
  expenseDateInput.value = new Date().toISOString().slice(0, 10);
  expenseFormError.classList.add('hidden');
}

$('#openExpenseModalBtn').addEventListener('click', () => {
  resetExpenseForm();
  expenseModalTitle.textContent = 'Tambah Transaksi';
  openModal('expenseModal');
  expenseTitleInput.focus();
});

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = expenseTitleInput.value.trim();
  const type = expenseTypeInput.value;
  const category = expenseCategoryInput.value;
  const amount = Number(expenseAmountInput.value);
  const date = expenseDateInput.value;

  const error = firstError([
    { ok: title !== '', message: 'Judul transaksi wajib diisi.' },
    { ok: date !== '', message: 'Tanggal wajib diisi.' },
    { ok: Number.isFinite(amount) && amount > 0, message: 'Jumlah harus berupa angka lebih dari 0.' },
  ]);
  if (error) return showFormError(expenseFormError, error);

  const id = expenseIdInput.value;
  if (id) {
    const existing = expenses.find((item) => item.id === id);
    if (existing) Object.assign(existing, { title, type, category, amount, date });
  } else {
    expenses.push({ id: uid(), title, type, category, amount, date, createdAt: Date.now() });
  }

  saveJSON(LS_KEYS.EXPENSES, expenses);
  closeModal('expenseModal');
  renderExpenses();
});

function openExpenseEdit(id) {
  const item = expenses.find((e) => e.id === id);
  if (!item) return;
  expenseFormError.classList.add('hidden');
  expenseModalTitle.textContent = 'Ubah Transaksi';
  expenseIdInput.value = item.id;
  expenseTitleInput.value = item.title;
  expenseTypeInput.value = item.type;
  populateCategorySelect(expenseCategoryInput, item.type, item.category);
  expenseAmountInput.value = item.amount;
  expenseDateInput.value = item.date;
  openModal('expenseModal');
}

function getFilteredSortedExpenses() {
  const q = expenseSearch.value.trim().toLowerCase();
  const typeFilter = expenseFilterType.value;
  const catFilter = expenseFilterCategory.value;
  const sortMode = expenseSort.value;

  let result = expenses.filter((item) => {
    if (q && !item.title.toLowerCase().includes(q)) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (catFilter !== 'all' && item.category !== catFilter) return false;
    return true;
  });

  result.sort((a, b) => {
    switch (sortMode) {
      case 'oldest':
        return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'newest':
      default:
        return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
    }
  });

  return result;
}

function renderExpenseStats() {
  const income = expenses.filter((e) => e.type === 'Pemasukan').reduce((sum, e) => sum + e.amount, 0);
  const expense = expenses.filter((e) => e.type === 'Pengeluaran').reduce((sum, e) => sum + e.amount, 0);
  $('#statIncome').textContent = formatRupiah(income);
  $('#statExpense').textContent = formatRupiah(expense);
  $('#statBalance').textContent = formatRupiah(income - expense);
}

function renderExpenses() {
  renderExpenseStats();
  const items = getFilteredSortedExpenses();

  if (expenses.length === 0) {
    expenseEmpty.classList.remove('hidden');
    expenseList.innerHTML = '';
    return;
  }
  expenseEmpty.classList.add('hidden');

  if (items.length === 0) {
    expenseList.innerHTML = `<li class="text-center text-sm text-ink/40 py-10">Tidak ada transaksi yang cocok dengan pencarian/filter.</li>`;
    return;
  }

  expenseList.innerHTML = items
    .map((item) => {
      const isIncome = item.type === 'Pemasukan';
      return `
      <li class="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
            isIncome ? 'bg-pinedim text-pine' : 'bg-rustdim text-rust'
          }">${isIncome ? '+' : '-'}</span>
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate">${escapeHtml(item.title)}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[11px] font-medium rounded-full bg-paperdim px-2 py-0.5 text-ink/60">${escapeHtml(item.category)}</span>
              <span class="text-xs text-ink/40">${formatDate(item.date)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-sm font-semibold tabular-nums ${isIncome ? 'text-pine' : 'text-rust'}">${
        isIncome ? '+' : '-'
      } ${formatRupiah(item.amount)}</span>
          ${iconBtn(ICONS.edit(), `data-edit-expense="${item.id}"`)}
          ${iconBtn(ICONS.trash(), `data-delete-expense="${item.id}"`, 'hover:!border-rust hover:!text-rust')}
        </div>
      </li>`;
    })
    .join('');

  $$('[data-edit-expense]', expenseList).forEach((btn) =>
    btn.addEventListener('click', () => openExpenseEdit(btn.dataset.editExpense))
  );
  $$('[data-delete-expense]', expenseList).forEach((btn) =>
    btn.addEventListener('click', () => {
      const item = expenses.find((e) => e.id === btn.dataset.deleteExpense);
      askDelete('expense', btn.dataset.deleteExpense, item?.title);
    })
  );
}

[expenseSearch].forEach((el) => el.addEventListener('input', renderExpenses));
[expenseFilterType, expenseFilterCategory, expenseSort].forEach((el) =>
  el.addEventListener('change', renderExpenses)
);

/* ============================ BOOKMARK MANAGER ============================ */

let bookmarks = loadJSON(LS_KEYS.BOOKMARKS, []);

const bookmarkSearch = $('#bookmarkSearch');
const bookmarkSort = $('#bookmarkSort');
const bookmarkGrid = $('#bookmarkGrid');
const bookmarkEmpty = $('#bookmarkEmpty');

const bookmarkModal = $('#bookmarkModal');
const bookmarkForm = $('#bookmarkForm');
const bookmarkModalTitle = $('#bookmarkModalTitle');
const bookmarkIdInput = $('#bookmarkIdInput');
const bookmarkNameInput = $('#bookmarkNameInput');
const bookmarkUrlInput = $('#bookmarkUrlInput');
const bookmarkCategoryInput = $('#bookmarkCategoryInput');
const bookmarkNoteInput = $('#bookmarkNoteInput');
const bookmarkFormError = $('#bookmarkFormError');

function isValidUrl(value) {
  return /^https?:\/\/.+/i.test(value.trim());
}

function resetBookmarkForm() {
  bookmarkIdInput.value = '';
  bookmarkNameInput.value = '';
  bookmarkUrlInput.value = '';
  bookmarkCategoryInput.value = '';
  bookmarkNoteInput.value = '';
  bookmarkFormError.classList.add('hidden');
}

$('#openBookmarkModalBtn').addEventListener('click', () => {
  resetBookmarkForm();
  bookmarkModalTitle.textContent = 'Tambah Tautan';
  openModal('bookmarkModal');
  bookmarkNameInput.focus();
});

bookmarkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = bookmarkNameInput.value.trim();
  const url = bookmarkUrlInput.value.trim();
  const category = bookmarkCategoryInput.value.trim();
  const note = bookmarkNoteInput.value.trim();

  const error = firstError([
    { ok: name !== '', message: 'Nama tautan wajib diisi.' },
    { ok: isValidUrl(url), message: 'URL harus diawali http:// atau https://' },
    { ok: category !== '', message: 'Kategori/tag wajib diisi.' },
  ]);
  if (error) return showFormError(bookmarkFormError, error);

  const id = bookmarkIdInput.value;
  if (id) {
    const existing = bookmarks.find((item) => item.id === id);
    if (existing) Object.assign(existing, { name, url, category, note });
  } else {
    bookmarks.push({ id: uid(), name, url, category, note, createdAt: Date.now() });
  }

  saveJSON(LS_KEYS.BOOKMARKS, bookmarks);
  closeModal('bookmarkModal');
  renderBookmarks();
});

function openBookmarkEdit(id) {
  const item = bookmarks.find((b) => b.id === id);
  if (!item) return;
  bookmarkFormError.classList.add('hidden');
  bookmarkModalTitle.textContent = 'Ubah Tautan';
  bookmarkIdInput.value = item.id;
  bookmarkNameInput.value = item.name;
  bookmarkUrlInput.value = item.url;
  bookmarkCategoryInput.value = item.category;
  bookmarkNoteInput.value = item.note || '';
  openModal('bookmarkModal');
}

function getFilteredSortedBookmarks() {
  const q = bookmarkSearch.value.trim().toLowerCase();
  const sortMode = bookmarkSort.value;

  let result = bookmarks.filter((item) => {
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  result.sort((a, b) => {
    switch (sortMode) {
      case 'az':
        return a.name.localeCompare(b.name);
      case 'za':
        return b.name.localeCompare(a.name);
      case 'newest':
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return result;
}

function renderBookmarks() {
  const items = getFilteredSortedBookmarks();

  if (bookmarks.length === 0) {
    bookmarkEmpty.classList.remove('hidden');
    bookmarkGrid.innerHTML = '';
    return;
  }
  bookmarkEmpty.classList.add('hidden');

  if (items.length === 0) {
    bookmarkGrid.innerHTML = `<p class="col-span-full text-center text-sm text-ink/40 py-10">Tidak ada tautan yang cocok dengan pencarian.</p>`;
    return;
  }

  bookmarkGrid.innerHTML = items
    .map(
      (item) => `
      <div class="rounded-2xl border border-line bg-white p-4 flex flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"
               class="text-sm font-semibold hover:text-mangodark truncate block">${escapeHtml(item.name)}</a>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"
               class="text-xs text-ink/40 hover:text-ink/60 truncate block">${escapeHtml(item.url)}</a>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${iconBtn(ICONS.edit(), `data-edit-bookmark="${item.id}"`)}
            ${iconBtn(ICONS.trash(), `data-delete-bookmark="${item.id}"`, 'hover:!border-rust hover:!text-rust')}
          </div>
        </div>
        <span class="text-[11px] font-medium rounded-full bg-paperdim px-2 py-0.5 text-ink/60 w-fit">${escapeHtml(item.category)}</span>
        ${item.note ? `<p class="text-xs text-ink/50">${escapeHtml(item.note)}</p>` : ''}
      </div>`
    )
    .join('');

  $$('[data-edit-bookmark]', bookmarkGrid).forEach((btn) =>
    btn.addEventListener('click', () => openBookmarkEdit(btn.dataset.editBookmark))
  );
  $$('[data-delete-bookmark]', bookmarkGrid).forEach((btn) =>
    btn.addEventListener('click', () => {
      const item = bookmarks.find((b) => b.id === btn.dataset.deleteBookmark);
      askDelete('bookmark', btn.dataset.deleteBookmark, item?.name);
    })
  );
}

[bookmarkSearch, bookmarkSort].forEach((el) => {
  const evt = el === bookmarkSearch ? 'input' : 'change';
  el.addEventListener(evt, renderBookmarks);
});

/* ============================ QUIZ APP ============================ */

const QUESTIONS = [
  {
    q: 'Tag HTML apa yang digunakan untuk membuat tautan ke halaman lain?',
    options: ['<link>', '<a>', '<href>', '<nav>'],
    correct: 1,
  },
  {
    q: 'Properti CSS apa yang mengatur jarak di dalam elemen, antara konten dan border?',
    options: ['margin', 'padding', 'gap', 'border-spacing'],
    correct: 1,
  },
  {
    q: 'Method array JavaScript mana yang menghasilkan array baru berisi elemen yang lolos suatu kondisi?',
    options: ['map()', 'forEach()', 'filter()', 'reduce()'],
    correct: 2,
  },
  {
    q: 'Cara yang benar untuk menyimpan data ke localStorage adalah…',
    options: ['localStorage.save(key, value)', 'localStorage.setItem(key, value)', 'localStorage.put(key, value)', 'localStorage.add(key, value)'],
    correct: 1,
  },
  {
    q: 'Selector CSS mana yang digunakan untuk memilih elemen berdasarkan class?',
    options: ['#nama', '.nama', '*nama', '&nama'],
    correct: 1,
  },
  {
    q: 'Apa kegunaan JSON.parse() dalam JavaScript?',
    options: [
      'Mengubah objek JavaScript menjadi teks',
      'Mengubah teks JSON menjadi objek/array JavaScript',
      'Menghapus data dari localStorage',
      'Memformat tampilan angka',
    ],
    correct: 1,
  },
];

const QUESTION_TIME = 20;

const quizStart = $('#quizStart');
const quizPlay = $('#quizPlay');
const quizResult = $('#quizResult');
const quizProgressLabel = $('#quizProgressLabel');
const quizTimerLabel = $('#quizTimerLabel');
const quizTimerBar = $('#quizTimerBar');
const quizQuestionText = $('#quizQuestionText');
const quizOptions = $('#quizOptions');
const quizNextBtn = $('#quizNextBtn');
const quizScoreDisplay = $('#quizScoreDisplay');
const quizHighScoreMsg = $('#quizHighScoreMsg');

let quizState = { index: 0, score: 0, timeLeft: QUESTION_TIME, answered: false, timer: null };

function updateHighScoreDisplay() {
  const hs = Number(localStorage.getItem(LS_KEYS.HIGHSCORE) || 0);
  $('#quizHighScoreDisplay').textContent = `${hs}/${QUESTIONS.length}`;
}

function showQuizScreen(name) {
  quizStart.classList.toggle('hidden', name !== 'start');
  quizStart.classList.toggle('flex', name === 'start');
  quizPlay.classList.toggle('hidden', name !== 'play');
  quizPlay.classList.toggle('flex', name === 'play');
  quizResult.classList.toggle('hidden', name !== 'result');
  quizResult.classList.toggle('flex', name === 'result');
}

$('#startQuizBtn').addEventListener('click', () => {
  quizState = { index: 0, score: 0, timeLeft: QUESTION_TIME, answered: false, timer: null };
  showQuizScreen('play');
  loadQuestion(0);
});

function loadQuestion(index) {
  if (index >= QUESTIONS.length) return finishQuiz();

  quizState.index = index;
  quizState.answered = false;
  quizState.timeLeft = QUESTION_TIME;

  quizProgressLabel.textContent = `Soal ${index + 1} dari ${QUESTIONS.length}`;
  quizQuestionText.textContent = QUESTIONS[index].q;
  quizNextBtn.classList.add('hidden');

  quizOptions.innerHTML = QUESTIONS[index].options
    .map(
      (opt, i) =>
        `<button type="button" data-index="${i}" class="quiz-option text-left rounded-xl border border-line px-4 py-3 text-sm hover:border-mango transition-colors">${escapeHtml(
          opt
        )}</button>`
    )
    .join('');

  $$('.quiz-option', quizOptions).forEach((btn) =>
    btn.addEventListener('click', () => selectAnswer(Number(btn.dataset.index)))
  );

  startTimer();
}

function startTimer() {
  clearInterval(quizState.timer);
  updateTimerUI();
  quizState.timer = setInterval(() => {
    quizState.timeLeft -= 1;
    updateTimerUI();
    if (quizState.timeLeft <= 0) {
      clearInterval(quizState.timer);
      autoTimeout();
    }
  }, 1000);
}

function updateTimerUI() {
  quizTimerLabel.textContent = `${quizState.timeLeft} dtk`;
  quizTimerBar.style.width = `${(quizState.timeLeft / QUESTION_TIME) * 100}%`;
}

function selectAnswer(idx) {
  if (quizState.answered) return;
  quizState.answered = true;
  clearInterval(quizState.timer);

  const correct = QUESTIONS[quizState.index].correct;
  $$('.quiz-option', quizOptions).forEach((btn) => {
    const bi = Number(btn.dataset.index);
    btn.disabled = true;
    if (bi === correct) btn.dataset.state = 'correct';
    else if (bi === idx) btn.dataset.state = 'wrong';
  });

  if (idx === correct) quizState.score += 1;
  quizNextBtn.classList.remove('hidden');
}

function autoTimeout() {
  if (quizState.answered) return;
  quizState.answered = true;
  const correct = QUESTIONS[quizState.index].correct;
  $$('.quiz-option', quizOptions).forEach((btn) => {
    btn.disabled = true;
    if (Number(btn.dataset.index) === correct) btn.dataset.state = 'reveal';
  });
  quizNextBtn.classList.remove('hidden');
}

quizNextBtn.addEventListener('click', () => loadQuestion(quizState.index + 1));

function finishQuiz() {
  showQuizScreen('result');
  quizScoreDisplay.textContent = `${quizState.score}/${QUESTIONS.length}`;

  const hs = Number(localStorage.getItem(LS_KEYS.HIGHSCORE) || 0);
  if (quizState.score > hs) {
    localStorage.setItem(LS_KEYS.HIGHSCORE, String(quizState.score));
    quizHighScoreMsg.textContent = 'Rekor baru! Skor tertinggi diperbarui.';
  } else {
    quizHighScoreMsg.textContent = `Skor tertinggi tetap ${hs}/${QUESTIONS.length}.`;
  }
  updateHighScoreDisplay();
}

$('#restartQuizBtn').addEventListener('click', () => showQuizScreen('start'));

/* ============================ INIT ============================ */

function init() {
  injectIcons();
  renderExpenses();
  renderBookmarks();
  updateHighScoreDisplay();

  setActiveTab(getTabFromUrl());
  // Hitung ulang posisi indikator setelah font/layout selesai dimuat.
  window.addEventListener('load', () => moveIndicator(currentTab));
}

init();