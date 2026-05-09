# 🏆 SAKTI API — Backend Service

<div align="center">

[![Champion](https://img.shields.io/badge/🥇_Juara_1-Hackin_Fest_2025-FFD700?style=for-the-badge&labelColor=1B3A6B)](https://www.sucofindo.co.id)
[![Category](https://img.shields.io/badge/Kategori-Inovasi_Layanan-2E86AB?style=for-the-badge)](https://www.sucofindo.co.id)
[![Organizer](https://img.shields.io/badge/Organizer-PT_Sucofindo-00A651?style=for-the-badge)](https://www.sucofindo.co.id)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white&style=flat-square)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white&style=flat-square)](https://mysql.com)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.x-52B0E7?logo=sequelize&logoColor=white&style=flat-square)](https://sequelize.org)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?logo=cloudinary&logoColor=white&style=flat-square)](https://cloudinary.com)
[![Railway](https://img.shields.io/badge/Hosted_on-Railway-0B0D0E?logo=railway&logoColor=white&style=flat-square)](https://railway.app)

**RESTful API backend untuk aplikasi SAKTI — platform manajemen dan distribusi layanan inspeksi & sertifikasi PT Sucofindo.**

*Dibangun sebagai pemenang pertama Hackin Fest 2025, kategori Inovasi Layanan.*

</div>

---

## 📖 Daftar Isi

- [Executive Summary](#-executive-summary)
- [Tech Stack](#️-tech-stack)
- [Arsitektur Sistem](#️-arsitektur-sistem)
- [Desain Keamanan](#-desain-keamanan)
- [Optimasi Database](#-optimasi-database)
- [Role & Akses Sistem](#-role--akses-sistem)
- [API Reference Lengkap](#-api-reference-lengkap)
- [Instalasi & Setup Lokal](#️-instalasi--setup-lokal)
- [Environment Variables](#-environment-variables)
- [Deployment Checklist](#-deployment-checklist)
- [Keputusan Teknis (Why)](#-keputusan-teknis-why)

---

## 📋 Executive Summary

**SAKTI** *(Sistem Administrasi Katalog dan Teknis Informasi)* adalah platform internal PT Sucofindo yang mendigitalisasi, menstandarisasi, dan mendistribusikan informasi layanan inspeksi & sertifikasi ke seluruh unit kerja — dari level Unit Bisnis (SBU) hingga Manajemen Pusat.

### Konteks Bisnis

PT Sucofindo adalah perusahaan BUMN yang bergerak di bidang inspeksi, pengujian, dan sertifikasi. Sebelum SAKTI, informasi layanan tersebar dan tidak terstandarisasi antar unit. SAKTI menjadi solusi terpusat untuk:

- Mengelola katalog layanan dengan hierarki Portfolio → Sub Portfolio → Sektor → Sub Sektor
- Mendistribusikan marketing kit (brosur, datasheet) dengan sistem download teraudit
- Menyediakan dashboard administrasi dengan statistik penggunaan real-time
- Mengelola akun pengguna dengan proses verifikasi dan otorisasi berbasis role + unit
- Memproses permintaan perubahan role **dan** unit kerja secara atomik melalui approval admin

### Peran Pengembang

Dibangun oleh **Fullstack Developer Utama (pihak eksternal)** dari nol hingga production-ready dalam waktu kompetisi, dengan fokus pada tiga pilar:

| Pilar | Implementasi |
|---|---|
| **Keamanan Data** | Dual-token JWT, Argon2 hashing, rate limiting berlapis, RBAC 5-strategi |
| **Performa & Skalabilitas** | Database index per tabel, connection pooling, query optimization, cloud-native storage |
| **Maintainability** | Separation of concerns ketat, JSDoc pada setiap route & fungsi, validators terpusat, migration-driven schema |

### Scope Backend

- **7 domain resource** dengan logika bisnis terpisah
- **8 route file** terdokumentasi penuh dengan JSDoc inline per endpoint
- **16 migration file** — schema versioning lengkap dan bisa dirollback
- **5 strategi middleware otorisasi** yang dapat dikombinasikan secara fleksibel
- **2 utilitas terpusat** — `validators.js` dan `email.js` sebagai shared module lintas controller
- Frontend repo: `sakti-app-hackinfest2025` | Deployed: [sakti-drab.vercel.app](https://sakti-drab.vercel.app)

---

## 🛠️ Tech Stack

### Runtime & Framework

| Teknologi | Versi | Alasan Pemilihan |
|---|---|---|
| **Node.js** | 18+ | Event-loop non-blocking cocok untuk I/O-heavy API (DB + Cloudinary) |
| **Express.js** | ~4.16 | Minimalis tapi kaya ekosistem; tidak memaksakan struktur |
| **Sequelize ORM** | ^6.37 | Schema-as-code via migrations, model associations, parameterized query aman |
| **MySQL** | 8.x | Data relasional kompleks dengan hierarki bertingkat; standar enterprise Indonesia |

### Keamanan & Autentikasi

| Library | Versi | Fungsi |
|---|---|---|
| **argon2** | ^0.43 | Password hashing — lebih tahan GPU/ASIC cracking dibanding bcrypt |
| **jsonwebtoken** | ^9.0.2 | JWT signing & verifikasi (access token + refresh token) |
| **helmet** | ^8.1 | Memasang 11+ HTTP security headers otomatis (XSS, clickjacking, MIME sniffing) |
| **express-rate-limit** | ^8.0.1 | Rate limiting per-IP, dikonfigurasi terpusat di `app.js` via `app.locals` |
| **cors** | ^2.8.5 | Whitelist origin policy yang ketat |
| **crypto** (built-in) | Node.js | SHA-256 hash untuk refresh token; AES-256-CBC untuk temporary password |

### Media & File Handling

| Library | Versi | Fungsi |
|---|---|---|
| **cloudinary** | ^1.41 | Cloud CDN untuk aset marketing kit (PDF, dokumen) |
| **multer** | ^2.0.1 | Parsing multipart/form-data sebelum upload |
| **multer-storage-cloudinary** | ^4.0 | Stream langsung Multer → Cloudinary (file tidak transit di server) |

### Utilitas & Komunikasi

| Library | Versi | Fungsi |
|---|---|---|
| **nodemailer** | ^7.0.5 | Email notifikasi via SMTP (reset password, verifikasi akun) |
| **axios** | ^1.10.0 | HTTP client untuk integrasi eksternal jika diperlukan |
| **uuid** | ^11.1.0 | Primary key UUID v4 yang tidak dapat di-enumerate |
| **morgan** | ~1.9.1 | HTTP request logger — `combined` di production, `dev` di development |
| **dotenv** | ^17.2.0 | Environment variable loader |
| **nodemon** | ^3.1.14 | Hot-reload untuk development server |
| **xlsx** | ^0.18.5 | Export data ke format spreadsheet |

### Platform & Hosting

| Platform | Penggunaan |
|---|---|
| **Railway** | Managed MySQL hosting via `DATABASE_URL` single string |
| **Cloudinary** | File storage CDN; signed URL expire 60 detik per request download |
| **Vercel** | Frontend hosting (origin yang di-whitelist di CORS config) |

---

## 🏗️ Arsitektur Sistem

### Struktur Direktori

```
sakti-api-hackinfest2025/
│
├── app.js                          # Entry point: middleware chain, route registry,
│                                   # global error handler, rate limiter config & expose
├── bin/www                         # HTTP server bootstrap (port binding, startup errors)
│
├── config/
│   ├── database.js                 # Sequelize instance + connection pool config
│   ├── config.js                   # Sequelize CLI config per environment (dev/test/prod)
│   └── cloudinary.js               # Cloudinary SDK initialization
│
├── controllers/                    # Business logic — fat controller, satu file per domain
│   ├── adminController.js          # Dashboard stats, CRUD user, verifikasi, reset PW,
│   │                               # audit log, change request processing
│   ├── authController.js           # Dual-token auth, profil, ganti PW, forgot PW,
│   │                               # change request (role + unit)
│   ├── marketingKitController.js   # CRUD kit, upload multi-file, signed download URL
│   ├── portfolioController.js      # CRUD Portfolio + Sub Portfolio (nested resource)
│   ├── sectorController.js         # CRUD Sektor + Sub Sektor (nested resource)
│   ├── serviceController.js        # CRUD Layanan + relasi sektor/portfolio + revenue
│   └── unitController.js           # CRUD Unit Kerja (publik GET, admin-only write)
│
├── middlewares/
│   ├── authMiddleware.js           # 5 strategi otorisasi: authenticate, authorize,
│   │                               # authorizeAdvanced, denyRole, unitAccess
│   └── uploadCloudinary.js         # Multer config + Cloudinary storage + handleMulterError
│
├── models/                         # Sequelize models — schema-as-code, satu file per entitas
│   ├── index.js                    # Auto-discovery + association loader
│   ├── user.js                     # User (UUID PK, role, is_active, is_verified, last_login)
│   ├── unit.js                     # Unit Kerja (6 tipe valid)
│   ├── service.js                  # Layanan (core entity)
│   ├── marketingKit.js             # Marketing Kit (file, file_type, cloudinary_public_id)
│   ├── marketingKitService.js      # Pivot many-to-many: marketing_kit ↔ service
│   ├── portfolio.js                # Portfolio
│   ├── subportfolio.js             # Sub Portfolio
│   ├── sector.js                   # Sektor
│   ├── subsector.js                # Sub Sektor
│   ├── servicesector.js            # Pivot: service ↔ sector
│   ├── servicesubsector.js         # Pivot: service ↔ sub_sector
│   ├── serviceRevenue.js           # Revenue per layanan per pelanggan
│   ├── refreshToken.js             # Dual-token store (token_hash SHA-256, expires_at, is_revoked)
│   ├── downloadlog.js              # Audit trail setiap aktivitas download marketing kit
│   ├── passwordresetrequest.js     # Permintaan reset password (user → admin)
│   └── changerequest.js            # Permintaan perubahan role DAN/ATAU unit (user → admin)
│
├── routes/                         # Thin routes — hanya mapping endpoint ke middleware + controller
│   ├── index.js                    # Route aggregator
│   ├── authRoutes.js               # /api/auth/*
│   ├── adminRoutes.js              # /api/admin/* (semua admin-only)
│   ├── serviceRoutes.js            # /api/services/*
│   ├── marketingKitRoutes.js       # /api/marketing-kits/*
│   ├── portfolioRoutes.js          # /api/portfolios/* (route statis sebelum dinamis)
│   ├── sectorRoutes.js             # /api/sectors/*
│   └── unitRoutes.js               # /api/units/* (GET publik, write admin-only)
│
├── utils/
│   ├── validators.js               # Validator terpusat: isValidEmail, isStrongPassword,
│   │                               # isValidUUID, isPositiveNumber, parsePagination,
│   │                               # sanitizeString, ERROR_MESSAGES, MAX_PAGINATION_LIMIT
│   └── email.js                    # Nodemailer transporter + fungsi kirim email
│                                   # (lazy init untuk validasi env vars di awal)
│
└── migrations/                     # 16 migration file — schema versioning penuh
    ├── 20260509104701-create-units-table.js
    ├── 20260509104750-create-users-table.js
    ├── 20260509104820-create-portfolios-table.js
    ├── 20260509104832-create-sub-portfolios-table.js
    ├── 20260509104845-create-sectors-table.js
    ├── 20260509104901-create-sub-sectors-table.js
    ├── 20260509104913-create-services-table.js
    ├── 20260509104925-create-marketing-kits-table.js
    ├── 20260509104944-create-download-logs-table.js
    ├── 20260509105000-create-password-reset-requests-table.js
    ├── 20260509105016-create-refresh-tokens-table.js
    ├── 20260509105029-create-services-revenues-table.js
    ├── 20260509105045-create-marketing-kit-services-table.js
    ├── 20260509105104-create-service-sectors-table.js
    ├── 20260509105117-create-service-sub-sectors-table.js
    └── 20260509105139-create-change-requests-table.js
```

### Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  CORS Policy                                                 │
│  → Whitelist: localhost:5173, sakti-drab.vercel.app          │
│  → Preflight OPTIONS ditangani otomatis                      │
│                                                              │
│  Helmet                                                      │
│  → 11+ HTTP security headers (XSS, clickjacking, dll)       │
│                                                              │
│  Global Rate Limiter (app.locals.globalLimiter)              │
│  → 100 request / 15 menit / IP                               │
│                                                              │
│  Body Parser (JSON + URL-encoded)                            │
│  → Limit 2MB — mencegah memory pressure attack               │
│                                                              │
│  Morgan Logger → stdout                                      │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Express Router                                                       │
│                                                                       │
│  /api/auth/login, /register, /refresh, /forgot-password               │
│    → loginRateLimit (dari app.locals.loginLimiter)                    │
│    → 10 percobaan GAGAL / 15 menit / IP (skipSuccessfulRequests)      │
│    → fallback no-op tersedia untuk test/development                   │
│    → Controller (tanpa token untuk endpoint publik)                   │
│                                                                       │
│  /api/units (GET)                                                     │
│    → Controller langsung — sengaja publik untuk form registrasi       │
│                                                                       │
│  Semua endpoint lain                                                  │
│    → authenticate (JWT verify + DB lookup user aktif)                 │
│    → authorize / authorizeAdvanced / denyRole / unitAccess            │
│    → Controller → Sequelize ORM → MySQL (Railway)                    │
│    → Upload? → Multer → handleMulterError → Cloudinary CDN            │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
Response JSON { success, data/pesan, ... }
        │
        ▼ (jika terjadi error tidak tertangani)
Global Error Handler
→ Log stack trace penuh di server
→ Pesan generik ke client di production; detail di development
```

### Database Schema (Entity Relationships)

```
units ──────────────────── users (FK: unit_kerja_id)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
change_requests    password_reset_requests    refresh_tokens
(role + unit)                                download_logs

portfolios                  sectors
  └── sub_portfolios            └── sub_sectors
           │                              │
           └──────── services ────────────┘
                         │
           ┌─────────────┴───────────────┐
           │                             │
   service_revenues      marketing_kit_services (pivot)
                                         │
                                  marketing_kits
                                         │
                                  download_logs (audit trail)
```

---

## 🔒 Desain Keamanan

### 1. Sistem Dual-Token Authentication

```
[POST /api/auth/login]
  Server generate:
    - access_token   : JWT, expire 1 jam (ACCESS_TOKEN_EXPIRES_IN)
    - raw_token      : Buffer.randomBytes → hex string
  Server simpan SHA-256(raw_token) ke tabel refresh_tokens — BUKAN plaintext
  Client menerima keduanya

[Setiap API Request]
  Header: Authorization: Bearer <access_token>
  authenticate middleware → verifikasi JWT + DB lookup user aktif

[access_token kadaluarsa]
  POST /api/auth/refresh { refresh_token: "<raw_token>" }
  Server: SHA-256(raw_token) → cari di DB
    → Validasi: is_revoked = false DAN expires_at > NOW()
    → Kembalikan access_token baru

[Logout satu perangkat]
  DELETE /api/auth/logout { refresh_token }
  Server set is_revoked = true untuk token tersebut

[Logout semua perangkat]
  DELETE /api/auth/logout-all
  Server set is_revoked = true untuk SEMUA refresh_token milik user
```

**Mengapa SHA-256, bukan simpan plaintext?**
Jika database bocor, attacker hanya mendapat hash — tidak bisa langsung digunakan sebagai refresh token tanpa mengetahui nilai preimage-nya.

### 2. Password Security

| Aspek | Implementasi |
|---|---|
| Algoritma hashing | Argon2id — lebih tahan GPU/ASIC dibanding bcrypt (pemenang PHC 2015) |
| Validasi kekuatan | `isStrongPassword()` di `utils/validators.js` — min 8 karakter, huruf besar, kecil, angka, simbol |
| Temporary password | Dienkripsi AES-256-CBC sebelum disimpan — dekripsi hanya via endpoint admin khusus |
| User enumeration prevention | Password dicek dulu sebelum `is_verified`/`is_active` — semua kasus gagal mendapat pesan error identik |

### 3. Rate Limiting Berlapis

Rate limiter dikonfigurasi terpusat di `app.js` dan di-expose via `app.locals` untuk dipakai di route file tanpa circular dependency:

```javascript
// Konfigurasi di app.js
globalLimiter : 100 request / 15 menit / IP  →  semua endpoint
loginLimiter  : 10 percobaan GAGAL / 15 menit / IP
              → /register, /login, /refresh, /forgot-password
              → skipSuccessfulRequests: true (login berhasil tidak dihitung)
              → fallback no-op tersedia untuk NODE_ENV=test atau RATE_LIMIT_SKIP=true
```

### 4. HTTP Security Headers (via Helmet)

Dipasang otomatis: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Content-Security-Policy`, dan lainnya.

### 5. Input & Query Security

| Mekanisme | Implementasi |
|---|---|
| SQL Injection | Semua query via Sequelize ORM → parameterized queries otomatis |
| Sort injection | Whitelist field sorting di controller — parameter tidak dikenal ditolak |
| Data dump | `MAX_PAGINATION_LIMIT = 100` di `utils/validators.js` — tidak bisa fetch ribuan baris |
| ID enumeration | UUID v4 sebagai primary key — tidak bisa ditebak seperti auto-increment |
| Body overflow | `express.json({ limit: '2mb' })` — mencegah memory pressure attack |
| CORS | Whitelist ketat: `localhost:5173` dan `sakti-drab.vercel.app` |
| Input sanitization | `sanitizeString()` di `utils/validators.js` — trim + normalisasi sebelum ke DB |

### 6. File Upload Security

- File di-stream langsung Multer → Cloudinary — tidak pernah tersimpan di server
- Error Multer (ukuran/tipe file tidak valid) ditangani `handleMulterError` → return 400 (bukan 500)
- Batas ukuran dan tipe file dikonfigurasi di `middlewares/uploadCloudinary.js`

---

## ⚡ Optimasi Database

### Connection Pool

```javascript
pool: {
  max:     5,       // Maks 5 koneksi aktif simultan
  min:     0,       // Tidak ada idle connection (hemat resource)
  acquire: 30000,   // 30 detik timeout sebelum error
  idle:    10000,   // Koneksi idle > 10 detik dikembalikan ke pool
}
```

### Database Indexes per Tabel

Index dimasukkan langsung ke dalam setiap migration table-creation — tidak terpisah sebagai migration tersendiri — sehingga setiap tabel langsung optimal sejak pertama kali dibuat:

| Tabel | Index |
|---|---|
| `users` | `idx_users_email` (UNIQUE), `is_verified`, `last_login`, `unit_kerja_id` |
| `refresh_tokens` | `idx_rt_token_hash` (UNIQUE), `user_id`, `(expires_at, is_revoked)` |
| `download_logs` | `user_id`, `marketing_kit_id`, `created_at` |
| `password_reset_requests` | `is_processed`, `user_id`, `(is_processed, created_at)` |
| `change_requests` | `status`, `user_id` |
| `marketing_kits` | `uploaded_by`, `file_type` |
| `services` | `portfolio_id`, `sub_portfolio_id`, `sbu_owner_id`, `created_by` |
| `sub_portfolios` | `portfolio_id` |
| `sub_sectors` | `sector_id` |
| `service_revenues` | `service_id`, `unit_id`, `customer_name` |
| `marketing_kit_services` | `service_id` |
| `service_sectors` | `sector_id` |
| `service_sub_sectors` | `sub_sector_id` |

> **Maintenance**: Jalankan cleanup job berkala untuk mencegah tabel `refresh_tokens` tumbuh tidak terbatas:
> ```sql
> DELETE FROM refresh_tokens WHERE expires_at < NOW() AND is_revoked = true;
> ```

---

## 👥 Role & Akses Sistem

### Tiga Role Pengguna

| Role | Kemampuan | Cara Mendapatkan |
|---|---|---|
| `admin` | Akses penuh ke seluruh endpoint + operasi administrasi | Dibuat langsung di DB atau oleh admin lain via `/api/admin/users` |
| `management` | Baca semua + write service/kit/portfolio/sektor (unit SBU/PPK) | Registrasi publik → verifikasi admin |
| `viewer` | Baca terbatas — tidak bisa akses marketing kit sama sekali | Registrasi publik → verifikasi admin |

### Lima Strategi Middleware Otorisasi

Seluruh logika otorisasi terpusat di `middlewares/authMiddleware.js` dan dapat dikombinasikan:

```javascript
// 1. authenticate — verifikasi JWT + DB lookup, isi req.user
router.get('/profile', authenticate, ctrl.getProfile);

// 2. authorize(...roles) — whitelist role
router.delete('/users/:id', authenticate, authorize('admin'), ctrl.deleteUser);

// 3. authorizeAdvanced({ roles, allowUnits }) — kombinasi role + tipe unit
//    Admin selalu lolos; management hanya jika unit bertipe sbu/ppk
const managementAccess = authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

// 4. denyRole(...roles) — blacklist role (kebalikan authorize)
//    Admin tidak boleh ajukan change-request untuk dirinya sendiri
router.post('/change-request', authenticate, denyRole('admin'), ctrl.requestChange);

// 5. unitAccess([unitTypes]) — filter tipe unit saja, tanpa cek role
//    Untuk skenario semua role diizinkan tapi hanya unit tertentu
```

### Matriks Akses per Domain

| Domain | Publik | Viewer | Management (SBU/PPK) | Admin |
|---|---|---|---|---|
| Auth: login, register, refresh, forgot-pw | ✅ | ✅ | ✅ | ✅ |
| Auth: profile, logout, ganti password | — | ✅ | ✅ | ✅ |
| Auth: change-request (role + unit) | — | ✅ | ✅ | ❌ denyRole |
| Units: GET | ✅ | ✅ | ✅ | ✅ |
| Units: POST, PUT, DELETE | — | — | — | ✅ |
| Services: GET | — | ✅ | ✅ | ✅ |
| Services: POST, PUT, revenue | — | — | ✅ | ✅ |
| Services: DELETE | — | — | — | ✅ |
| Marketing Kits: GET, download | — | ❌ denyRole | ✅ | ✅ |
| Marketing Kits: POST, PUT, DELETE | — | — | ✅ | ✅ |
| Portfolio, Sektor: GET | — | ✅ | ✅ | ✅ |
| Portfolio, Sektor: write | — | — | ✅ | ✅ |
| Admin endpoints (/api/admin/*) | — | — | — | ✅ |

---

## 📡 API Reference Lengkap

**Legenda kolom Auth:**

| Simbol | Arti |
|---|---|
| `Publik` | Tidak memerlukan token |
| `Publik + RL` | Publik + rate limiter (10 gagal / 15 menit) |
| `Login` | Memerlukan `Authorization: Bearer <access_token>` |
| `Admin` | Token dengan role `admin` |
| `Mgmt` | Token role `admin` atau `management` (unit SBU/PPK) |
| `Non-Viewer` | Semua role kecuali `viewer` |

---

### 🔑 Autentikasi & Profil — `/api/auth`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/register` | `Publik + RL` | Daftar akun baru. Status: pending verifikasi admin. Role `admin` tidak bisa didaftar via endpoint ini. |
| `POST` | `/login` | `Publik + RL` | Login → terima `access_token` + `refresh_token`. Urutan cek aman mencegah user enumeration. |
| `POST` | `/refresh` | `Publik + RL` | Tukar refresh token valid → access token baru. |
| `POST` | `/forgot-password` | `Publik + RL` | Ajukan permintaan reset password ke admin. Response selalu sukses (tidak bocorkan info email terdaftar). |
| `GET` | `/profile` | `Login` | Profil user saat ini — diambil dari DB, bukan dari JWT payload, selalu up-to-date. |
| `PUT` | `/update-password` | `Login` | Ganti password. Memerlukan password lama. Semua refresh token di-revoke sesudahnya. |
| `DELETE` | `/logout` | `Login` | Logout dari perangkat ini (revoke 1 refresh token). Body: `{ refresh_token }`. |
| `DELETE` | `/logout-all` | `Login` | Logout dari semua perangkat (revoke semua refresh token milik user). |
| `POST` | `/change-request` | `Login (non-admin)` | Ajukan perubahan role dan/atau unit kerja. Min. 1 field wajib diisi: `requested_role` atau `requested_unit_id`. Satu user hanya bisa punya 1 permintaan pending. |

---

### 🏢 Unit Kerja — `/api/units`

Tipe valid: `sbu` · `ppk` · `cabang` · `unit` · `divisi` · `lainnya`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Publik` | Daftar unit. Query: `type`, `search`, `page`, `limit`. Sengaja publik untuk form registrasi. |
| `GET` | `/:id` | `Publik` | Detail satu unit kerja. |
| `POST` | `/` | `Admin` | Buat unit baru. Body: `name`*, `code` (opsional, unik), `type`*. |
| `PUT` | `/:id` | `Admin` | Update parsial. Kirim `code: ""` untuk hapus kode. |
| `DELETE` | `/:id` | `Admin` | Hapus unit. Gagal 409 jika masih ada user aktif (FK constraint). |

---

### 📋 Layanan — `/api/services`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Daftar layanan. Query: `search`, `portfolio_id`, `sector_id`, `sort`, `order`, `page`, `limit`. |
| `GET` | `/:id` | `Login` | Detail lengkap: portfolio, sub portfolio, sektor, sub sektor, marketing kit, revenue. |
| `POST` | `/` | `Mgmt` | Buat layanan. Dibungkus DB transaction. Body: `name`*, `group`, `intro_video_url`, `overview`, `scope`, `benefit`, `output`, `regulation_ref`, `portfolio_id`, `sub_portfolio_id`, `sbu_owner_id`, `sectors[]`, `sub_sectors[]`. |
| `PUT` | `/:id` | `Mgmt` | Update parsial. Kirim `sectors: []` untuk hapus semua relasi sektor. |
| `DELETE` | `/:id` | `Admin` | Hapus permanen + CASCADE semua data terkait. |
| `POST` | `/:id/revenue` | `Mgmt` | Tambah pendapatan. Body: `customer_name`*, `revenue`* (angka positif, divalidasi `isPositiveNumber()`), `unit_id`*. |

---

### 📦 Marketing Kit — `/api/marketing-kits`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Non-Viewer` | Daftar kit. Query: `search`, `service`, `file_type`. |
| `GET` | `/:id` | `Non-Viewer` | Detail kit + relasi layanan dan uploader. |
| `POST` | `/:id/download` | `Non-Viewer` | Generate signed URL (expire 60 detik) + dicatat ke `download_logs`. Body: `purpose`* (wajib). |
| `POST` | `/` | `Mgmt` | Upload multi-file. Form-data: `files[]`* (maks 10, maks 10MB/file), `service_ids[]`*, `file_types[]`*. |
| `PUT` | `/:id` | `Mgmt` | Update metadata/ganti file. Form-data: `file`, `file_type`, `service_ids[]` (semua opsional). |
| `DELETE` | `/:id` | `Mgmt` | Hapus dari DB dan Cloudinary sekaligus. Tidak bisa dibatalkan. |

---

### 🗂️ Portfolio & Sub Portfolio — `/api/portfolios`

> **Catatan implementasi**: Route statis `/sub-portfolios` didefinisikan **sebelum** route dinamis `/:id` untuk mencegah bug Express route ordering.

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Semua portfolio + sub portfolio (cocok untuk dropdown). |
| `GET` | `/sub-portfolios` | `Login` | Semua sub portfolio. Query: `portfolio_id` (opsional). |
| `GET` | `/sub-portfolios/:id` | `Login` | Detail satu sub portfolio. |
| `GET` | `/:id` | `Login` | Detail portfolio + sub portfolio-nya. |
| `POST` | `/` | `Mgmt` | Buat portfolio. Body: `name`* (unik). |
| `PUT` | `/:id` | `Mgmt` | Update portfolio. |
| `DELETE` | `/:id` | `Mgmt` | Hapus + CASCADE sub portfolio. Gagal jika ada layanan aktif. |
| `POST` | `/:portfolio_id/sub-portfolios` | `Mgmt` | Buat sub portfolio. Body: `name`*, `code`*. |
| `PUT` | `/:portfolio_id/sub-portfolios/:id` | `Mgmt` | Update sub portfolio. |
| `DELETE` | `/:portfolio_id/sub-portfolios/:id` | `Mgmt` | Hapus sub portfolio. |

---

### 🏭 Sektor & Sub Sektor — `/api/sectors`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Semua sektor + sub sektor. Query: `search`. |
| `GET` | `/:id` | `Login` | Detail sektor + sub sektor. |
| `POST` | `/` | `Mgmt` | Buat sektor. Body: `name`*, `code`*. |
| `PUT` | `/:id` | `Mgmt` | Update sektor. |
| `DELETE` | `/:id` | `Mgmt` | Hapus + CASCADE. Gagal jika ada layanan aktif. |
| `POST` | `/:sector_id/sub-sectors` | `Mgmt` | Buat sub sektor. Body: `name`*, `code`*. |
| `PUT` | `/:sector_id/sub-sectors/:id` | `Mgmt` | Update sub sektor. |
| `DELETE` | `/:sector_id/sub-sectors/:id` | `Mgmt` | Hapus sub sektor. |

---

### 👑 Administrasi — `/api/admin` *(Semua endpoint: Admin Only)*

**Dashboard**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/dashboard` | Statistik: total user terverifikasi, user pending, aktif 30 hari, total download, change request pending, reset PW pending. |

**Manajemen User**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/users` | Daftar user. Query: `search`, `role`, `unit`, `is_active`, `verified`, `sort`, `direction`, `page`, `limit`. Maks 100/halaman. |
| `POST` | `/users` | Buat akun (langsung verified). Password acak di-generate — dikembalikan **sekali** dalam response. |
| `PUT` | `/users/:id` | Update parsial. Hanya field yang dikirim yang berubah. |
| `DELETE` | `/users/:id` | Hapus permanen. Guard: tidak bisa hapus diri sendiri atau satu-satunya admin. |
| `GET` | `/users/:id/temporary-password` | Ambil temporary password (dekripsi AES-256-CBC). |

**Verifikasi Pendaftaran**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/waiting-users` | User pending verifikasi (is_verified = null), diurutkan FIFO. |
| `POST` | `/waiting-users/:id/approve` | Setujui pendaftaran → `is_verified = true`. |
| `POST` | `/waiting-users/:id/reject` | Tolak pendaftaran → hapus user (jika tidak punya data terkait). |

**Reset Password**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/password-reset-requests` | Permintaan reset yang belum diproses — satu terawal per user. |
| `POST` | `/password-reset-requests/:id/reset` | Reset password → password acak baru. Revoke semua refresh token. Password dikembalikan sekali. |

**Change Request (Role + Unit)**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/change-requests` | Daftar semua permintaan perubahan. Query: `status`, `page`, `limit`. |
| `PUT` | `/change-requests/:request_id/process` | Approve atau reject secara atomik (DB transaction). Body: `action` (approve/reject), `admin_notes` (opsional). Approve akan update role dan/atau unit sesuai permintaan. |

**Audit Log**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/download-logs` | Log semua aktivitas download marketing kit. Cari berdasarkan nama kit, nama user, atau tujuan. |

---

## ⚙️ Instalasi & Setup Lokal

### Prasyarat

- Node.js >= 18.x
- npm >= 9.x
- MySQL 8.x (lokal atau cloud)
- Akun Cloudinary (untuk fitur upload file)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/[username]/sakti-api-hackinfest2025.git
cd sakti-api-hackinfest2025

# 2. Install dependencies
npm install

# 3. Buat file environment
cp .env.example .env
# Edit .env sesuai konfigurasi Anda

# 4. Buat database (jika menggunakan MySQL lokal)
mysql -u root -p -e "CREATE DATABASE sakti;"

# 5. Jalankan semua migrations
npx sequelize-cli db:migrate

# 6. (Opsional) Jalankan seeders untuk data awal
npm run seed

# 7. Jalankan development server
npm run dev
# Server berjalan di http://localhost:3000
```

### Scripts yang Tersedia

```bash
npm start       # Production server (node ./bin/www)
npm run dev     # Development dengan hot-reload (nodemon ./bin/www)
npm run seed    # Jalankan semua database seeders (sequelize db:seed:all)
```

### Rollback Migration

```bash
npx sequelize-cli db:migrate:undo         # Rollback satu migration terakhir
npx sequelize-cli db:migrate:undo:all     # Rollback semua (menghapus semua tabel)
```

---

## 🔧 Environment Variables

```env
# ─── Aplikasi ─────────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development          # development | test | production

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=mysql://user:password@host:port/dbname

# ─── JWT & Token ──────────────────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=ganti_dengan_string_random_minimal_64_karakter
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=ganti_dengan_string_random_berbeda
REFRESH_TOKEN_EXPIRES_IN=7d

# ─── Enkripsi Temporary Password ──────────────────────────────────────────────
# WAJIB tepat 32 karakter (AES-256-CBC key length)
TEMP_PASSWORD_SECRET_KEY=tepat_32_karakter_di_sini_xxxxxxx

# ─── Cloudinary ───────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=nama_cloud_anda
CLOUDINARY_API_KEY=api_key_anda
CLOUDINARY_API_SECRET=api_secret_anda

# ─── Email SMTP (utils/email.js — lazy init, validasi saat fungsi dipanggil) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASS=app_password_anda
SMTP_FROM=no-reply@sakti.sucofindo.co.id   # opsional, fallback ke SMTP_USER
FRONTEND_URL=https://sakti-drab.vercel.app  # untuk link di body email

# ─── Testing ──────────────────────────────────────────────────────────────────
# RATE_LIMIT_SKIP=true   # Nonaktifkan rate limiting — HANYA untuk testing lokal
```

> **⚠️ Keamanan**: Jangan pernah commit file `.env` ke repository.
> Pastikan `.gitignore` mencakup `.env`.
>
> Jika `.env` terlanjur ter-commit, bersihkan dengan:
> ```bash
> git filter-branch --force --index-filter \
>   "git rm --cached --ignore-unmatch .env" \
>   --prune-empty --tag-name-filter cat -- --all
> ```
> Kemudian **rotate semua credentials** (JWT secrets, Cloudinary API, DB password, SMTP password).

---

## 🚀 Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Semua JWT secrets diganti dengan nilai random kuat (minimal 64 karakter)
- [ ] `TEMP_PASSWORD_SECRET_KEY` tepat 32 karakter
- [ ] `RATE_LIMIT_SKIP` tidak di-set atau di-set `false`
- [ ] `DATABASE_URL` mengarah ke database production
- [ ] Seluruh 16 migration sudah berjalan (`npx sequelize-cli db:migrate`)
- [ ] Cloudinary credentials production sudah dikonfigurasi
- [ ] SMTP credentials terisi (untuk fungsi reset password via email)
- [ ] CORS `origin` array hanya mengizinkan domain production
- [ ] `trust proxy` aktif — sudah otomatis saat `NODE_ENV=production`
- [ ] Cron job cleanup `refresh_tokens` sudah disetup
- [ ] Monitor ukuran tabel `refresh_tokens` secara berkala

---

## 💡 Keputusan Teknis (Why)

### Mengapa MySQL, bukan PostgreSQL atau MongoDB?

Data SAKTI sangat relasional — hierarki portfolio → sub portfolio → sektor → sub sektor membentuk dependensi kuat antar tabel. MySQL menangani foreign key, join, dan CASCADE dengan baik dan merupakan standar di ekosistem enterprise Indonesia. MongoDB akan mempersulit query join yang kompleks tanpa benefit sepadan untuk use case ini.

### Mengapa Sequelize ORM, bukan raw query?

Schema-as-code via migration memastikan semua developer dan environment memiliki skema identik. Parameterized queries mencegah SQL injection secara otomatis. Trade-off: sedikit lebih verbose untuk query sangat kompleks — acceptable untuk scope dan timeline proyek ini.

### Mengapa UUID sebagai primary key?

UUID v4 tidak bisa di-enumerate. Dengan auto-increment, attacker bisa fishing data dengan mencoba ID `1, 2, 3, ...`. UUID v4 (128-bit random) secara praktis tidak bisa ditebak. Biaya: sedikit lebih lambat untuk JOIN pada data sangat besar — tidak signifikan di skala SAKTI.

### Mengapa `utils/validators.js` sebagai modul terpusat?

Sentralisasi logika validasi memastikan aturan bisnis — format password, batas pagination, sanitasi string — cukup diubah di satu tempat dan berlaku di seluruh controller. Juga memudahkan unit testing validasi secara terisolasi tanpa melibatkan HTTP layer.

### Mengapa `change_requests` menggabungkan perubahan role dan unit dalam satu tabel?

Permintaan perubahan role dan unit kerja sering datang bersamaan (contoh: promosi ke management di unit SBU baru). Satu tabel dengan kolom `requested_role` dan `requested_unit_id` (keduanya nullable) lebih efisien dari dua tabel terpisah dan memungkinkan approval atomik dalam satu DB transaction.

### Mengapa rate limiter dikonfigurasi di `app.js` dan di-expose via `app.locals`?

Pola ini memungkinkan `authRoutes.js` mengakses limiter yang sama tanpa circular dependency. Selain itu, `app.locals.loginLimiter` mudah di-mock saat testing — cukup set `RATE_LIMIT_SKIP=true` tanpa perlu patch module. Fallback no-op di `authRoutes.js` memastikan development tetap berjalan meski limiter tidak di-set.

### Mengapa `handleMulterError` dipasang sebagai middleware terpisah?

Error dari Multer secara default menghasilkan 500 Internal Server Error jika tidak ditangani secara eksplisit. `handleMulterError` mengubahnya menjadi respons 400 Bad Request yang informatif — tanpa ini, client tidak mendapat feedback yang berguna tentang mengapa upload gagal.

### Mengapa file di-stream langsung ke Cloudinary?

Server yang menyimpan file upload adalah attack surface tambahan. Dengan pipeline Multer → Cloudinary stream, file tidak pernah ada di server SAKTI — jika server dikompromis, file tetap aman di CDN terpisah dengan access control sendiri. Bonus: tidak perlu maintain disk storage, auto-CDN, dan transformasi file tersedia tanpa konfigurasi tambahan.

### Mengapa `utils/email.js` menggunakan lazy initialization?

Transporter Nodemailer dibuat saat fungsi pertama kali dipanggil (bukan saat module di-load). Ini memungkinkan validasi environment variables SMTP dilakukan dengan pesan error yang jelas, dan mencegah crash saat startup jika email belum dikonfigurasi — sangat berguna di environment yang tidak memerlukan email (misalnya staging tanpa SMTP).

---

*Dibuat untuk Hackin Fest 2025 — PT Sucofindo | 🥇 Juara 1 Kategori Inovasi Layanan*
