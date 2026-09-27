# NexaHub — PABWE P3

## Identitas proyek
Format nama repository/folder:
`{username-kamu}-pabwe-p3`

Contoh:
`ifs18005-pabwe-p3`

## Deskripsi
NexaHub adalah aplikasi web single-page berbasis HTML, CSS, dan JavaScript yang memiliki tiga fitur:

1. Catatan Pengeluaran Harian
   - CRUD transaksi
   - Ringkasan pemasukan, pengeluaran, saldo
   - Search, filter tipe, sorting
   - Validasi form
   - localStorage

2. Bookmark / Link Manager
   - CRUD bookmark
   - Validasi URL HTTP/HTTPS
   - Search dan sorting
   - Link dibuka di tab baru dengan `noopener noreferrer`
   - localStorage terpisah

3. Kuis Interaktif
   - Soal berbentuk array of object
   - Minimal 5 soal
   - Pilihan ganda
   - Feedback jawaban
   - Skor akhir
   - High score menggunakan localStorage

## Struktur
```text
nama-repo/
├── index.html
├── assets/
│   └── script.js
└── README.md
```

## Menjalankan
Tidak membutuhkan backend.

Cara paling sederhana:
- buka `index.html` di browser.

Atau gunakan VS Code + Live Server jika tersedia.

## localStorage key
- `nexahub_expenses_v1`
- `nexahub_bookmarks_v1`
- `nexahub_quiz_highscore_v1`
- `nexahub_active_tab_v1`

## Catatan
CDN yang digunakan:
- Google Fonts: DM Sans + Plus Jakarta Sans
- Lucide Icons
