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
- [Bug Fix Log](#-bug-fix-log)
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
- Mengelola akun pengguna dengan proses verifikasi dan role berbasis unit kerja

### Peran Pengembang

Dibangun oleh **Fullstack Developer Utama (pihak eksternal)** dari nol hingga production-ready dalam waktu kompetisi, dengan fokus pada tiga pilar:

| Pilar | Implementasi |
|---|---|
| **Keamanan Data** | Dual-token JWT, Argon2 hashing, rate limiting berlapis, RBAC 5-strategi |
| **Performa & Skalabilitas** | 16 database index, connection pooling, query optimization, cloud-native storage |
| **Maintainability** | Separation of concerns ketat, 150+ inline comments bertujuan, migration-driven schema |

### Scope Backend

- **7 domain resource** dengan logika bisnis berbeda
- **55+ endpoint** terdokumentasi lengkap
- **20 migration file** (schema versioning penuh)
- **5 strategi otorisasi** yang dapat dikombinasikan
- Frontend repo: `sakti-app-hackinfest2025` | Deployed: [sakti-drab.vercel.app](https://sakti-drab.vercel.app)

---

## 🛠️ Tech Stack

### Runtime & Framework

| Teknologi | Versi | Alasan Pemilihan |
|---|---|---|
| **Node.js** | 18+ | Event-loop non-blocking cocok untuk I/O-heavy API (DB + Cloudinary) |
| **Express.js** | ~4.16 | Minimalis tapi kaya ekosistem; tidak memaksakan struktur |
| **Sequelize ORM** | ^6.37 | Schema-as-code via migrations, model associations, query builder aman |
| **MySQL** | 8.x | Data relasional kompleks (hierarki portfolio, unit, sektor); standar enterprise Indonesia |

### Keamanan & Autentikasi

| Library | Versi | Fungsi |
|---|---|---|
| **argon2** | ^0.43 | Password hashing — lebih tahan GPU/ASIC cracking dibanding bcrypt |
| **jsonwebtoken** | ^9.0.2 | JWT signing & verifikasi (access token + reset token) |
| **helmet** | ^8.1 | Memasang 11 HTTP security headers otomatis (XSS, clickjacking, MIME sniffing) |
| **express-rate-limit** | ^8.0.1 | Rate limiting per-IP dengan sliding window |
| **cors** | ^2.8.5 | Whitelist origin policy (hanya Vite dev + Vercel prod) |
| **crypto** (built-in) | Node.js | SHA-256 hash untuk refresh token; AES-256-CBC untuk temporary password |

### Media & File Handling

| Library | Versi | Fungsi |
|---|---|---|
| **cloudinary** | ^1.41 | Cloud CDN untuk aset marketing kit (PDF, gambar) |
| **multer** | ^2.0.1 | Parsing multipart/form-data sebelum upload |
| **multer-storage-cloudinary** | ^4.0 | Stream langsung dari Multer ke Cloudinary (file tidak transit di server) |

### Utilitas

| Library | Fungsi |
|---|---|
| **uuid** | Primary key UUID v4 (tidak dapat di-enumerate seperti auto-increment) |
| **morgan** | HTTP request logger — format `combined` di production, `dev` di development |
| **nodemailer** | Email notifikasi (reset password, verifikasi akun) |
| **dotenv** | Environment variable loader dengan sanitasi inline comment |
| **nodemon** | Hot-reload untuk development server |
| **xlsx** | Export data ke format spreadsheet |

### Platform & Hosting

| Platform | Penggunaan |
|---|---|
| **Railway** | Managed MySQL hosting dengan koneksi via `DATABASE_URL` single string |
| **Cloudinary** | File storage CDN; signed URL expire 60 detik per request download |
| **Vercel** | Frontend hosting (origin yang di-whitelist di CORS config) |

---

## 🏗️ Arsitektur Sistem

### Struktur Direktori & Tanggung Jawab

```
sakti-api-hackinfest2025/
│
├── app.js                          # Entry point: middleware chain, route registry, global error handler
├── bin/www                         # HTTP server bootstrap (port, error handling startup)
│
├── config/
│   ├── database.js                 # Sequelize instance + connection pool (max:5, idle:10s)
│   ├── config.js                   # Sequelize CLI config per environment (dev/test/prod)
│   └── cloudinary.js               # Cloudinary SDK initialization
│
├── controllers/                    # BUSINESS LOGIC — fat controller pattern, satu file per domain
│   ├── adminController.js          # Dashboard stats, CRUD user, verifikasi, reset PW, audit logs
│   ├── authController.js           # Dual-token auth, profil, ganti PW, forgot PW, unit change req
│   ├── marketingKitController.js   # CRUD marketing kit, upload multi-file, signed download URL
│   ├── portfolioController.js      # CRUD Portfolio + Sub Portfolio (nested resource)
│   ├── sectorController.js         # CRUD Sektor + Sub Sektor (nested resource)
│   ├── serviceController.js        # CRUD Layanan + relasi sektor/portfolio + revenue
│   └── unitController.js           # CRUD Unit Kerja (publik GET, admin-only write)
│
├── middlewares/
│   ├── authMiddleware.js           # 5 strategi otorisasi (lihat bagian Role & Akses)
│   └── uploadCloudinary.js         # Multer config + Cloudinary storage + handleMulterError
│
├── models/                         # SEQUELIZE MODELS — schema-as-code
│   ├── index.js                    # Auto-discovery + association loader
│   ├── user.js                     # User (UUID PK, role, is_active, is_verified, last_login)
│   ├── unit.js                     # Unit Kerja (tipe: sbu|ppk|cabang|unit|divisi|lainnya)
│   ├── service.js                  # Layanan (core entity, relasi ke portfolio/sektor/kit)
│   ├── marketingKit.js             # Marketing Kit (file, file_type, cloudinary_public_id)
│   ├── marketingKitService.js      # Pivot table many-to-many (marketing_kit ↔ service)
│   ├── portofolio.js               # Portfolio (parent dari sub portfolio)
│   ├── subportfolio.js             # Sub Portfolio (child dari portfolio)
│   ├── sector.js                   # Sektor (parent dari sub sektor)
│   ├── subsector.js                # Sub Sektor (child dari sektor)
│   ├── serviceRevenue.js           # Revenue per layanan per pelanggan
│   ├── refreshToken.js             # Dual-token store (token_hash SHA-256, expires_at, is_revoked)
│   ├── downloadlog.js              # Audit trail setiap aktivitas download marketing kit
│   ├── passwordresetrequest.js     # Permintaan reset password (user → admin)
│   └── unitChangeRequest.js        # Permintaan pindah unit kerja (user → admin)
│
├── routes/                         # THIN ROUTES — hanya mapping endpoint ke middleware + controller
│   ├── authRoutes.js               # /api/auth/*
│   ├── adminRoutes.js              # /api/admin/* (semua admin-only)
│   ├── serviceRoutes.js            # /api/services/*
│   ├── marketingKitRoutes.js       # /api/marketing-kits/*
│   ├── portfolioRoutes.js          # /api/portfolios/* (termasuk nested /sub-portfolios)
│   ├── sectorRoutes.js             # /api/sectors/* (termasuk nested /sub-sectors)
│   └── unitRoutes.js               # /api/units/*
│
└── migrations/                     # 20 MIGRATION FILES — schema versioning penuh
    ├── 20250718174443-create-units.js
    ├── 20250718174501-create-users.js
    ├── 20250718174545-create-portfolios.js
    ├── 20250718174553-create-sub-portfolios.js
    ├── 20250718174620-create-sectors.js
    ├── 20250718174626-create-sub-sectors.js
    ├── 20250718174705-create-services.js
    ├── 20250718174733-create-marketing-kits.js
    ├── 20250718174750-create-download-logs.js
    ├── 20250718174803-create-password-reset-requests.js
    ├── 20250720155702-create-unit-change-requests.js
    ├── 20250722001558-add-cloudinary-public-id-to-marketing-kit.js
    ├── 20250725070954-update-service-name-length.js
    ├── 20250725072932-create-marketing-kit-services.js
    ├── 20250725073003-remove-service-id-from-marketing-kits.js
    ├── 20250728002240-update-service-name-length.js
    ├── 20250730025024-create-service-revenue.js
    ├── 20260504005818-create-refresh-tokens-table.js
    ├── 20260505060425-add-performance-indexes.js
    └── 20260505235104-add-code-column-to-units.js
```

### Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  CORS Policy                                          │
│  → Whitelist: localhost:5173, sakti-drab.vercel.app   │
│  → Preflight OPTIONS ditangani otomatis               │
│                                                       │
│  Helmet                                               │
│  → 11 HTTP security headers (XSS, clickjacking, dll) │
│                                                       │
│  Global Rate Limiter                                  │
│  → 100 request / 15 menit / IP                        │
│                                                       │
│  Body Parser (JSON + URL-encoded)                     │
│  → Limit 2MB mencegah memory pressure attack          │
│                                                       │
│  Morgan Logger → stdout                               │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Express Router                                                       │
│                                                                       │
│  /api/auth/login, /register, /refresh, /forgot-password              │
│    → Login Rate Limiter (10 percobaan GAGAL / 15 menit / IP)         │
│    → Controller (tanpa token untuk endpoint publik)                   │
│                                                                       │
│  /api/units (GET)                                                     │
│    → Controller langsung — sengaja publik untuk form registrasi       │
│                                                                       │
│  Semua endpoint lain                                                  │
│    → authenticate (verify JWT + DB lookup user aktif)                 │
│    → authorize / authorizeAdvanced / denyRole / unitAccess            │
│    → Controller → Sequelize ORM → MySQL (Railway)                    │
│    → Upload? → Multer → stream → Cloudinary CDN                      │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
Response JSON { success, data/pesan, ... }
        │
        ▼ (jika terjadi error tidak tertangani)
Global Error Handler
→ Log penuh di server, pesan generik di production
```

### Database Schema (Relasi Antar Entitas)

```
units ──────────────────────── users (FK: unit_kerja_id)
                                    │
                             ┌──────┴──────────────────────┐
                             │                             │
                    unit_change_requests          refresh_tokens
                    password_reset_requests       download_logs

portfolios                   sectors
  └── sub_portfolios           └── sub_sectors
            │                            │
            └──────── services ──────────┘
                          │
                   marketing_kit_services (pivot many-to-many)
                          │
                   marketing_kits
                          │
                   download_logs (audit setiap download)

services ──── service_revenues (pendapatan per pelanggan)
```

---

## 🔒 Desain Keamanan

### 1. Sistem Dual-Token Authentication

Alih-alih single JWT, SAKTI mengimplementasikan dual-token untuk meminimalkan window penyalahgunaan jika token bocor:

```
[POST /api/auth/login]
  Server generate:
    - access_token   : JWT, expire 1 jam
    - raw_token      : hex random 40 byte (80 karakter)
  Server simpan SHA-256(raw_token) di tabel refresh_tokens
    → BUKAN plaintext — jika DB bocor, hash tidak bisa langsung dipakai
  Client menerima keduanya

[Setiap API Request]
  Header: Authorization: Bearer <access_token>
  Server verifikasi JWT signature & expiry

[access_token kadaluarsa]
  POST /api/auth/refresh { refresh_token: "<raw_token>" }
  Server: hash(raw_token) → cari di DB
    → Validasi: is_revoked=false DAN expires_at > NOW()
    → Kembalikan access_token baru
  Refresh token TIDAK berubah (tetap valid hingga expired/revoked)

[Logout satu perangkat]
  DELETE /api/auth/logout { refresh_token: "<raw_token>" }
  Server set is_revoked=true untuk token tersebut saja

[Logout semua perangkat / akun dicurigai diretas]
  DELETE /api/auth/logout-all
  Server set is_revoked=true untuk SEMUA refresh_token milik user

[Admin nonaktifkan / ganti role user]
  Seluruh refresh_token user di-revoke secara paksa
```

### 2. Password Security

| Aspek | Implementasi |
|---|---|
| Algoritma hashing | Argon2id — lebih tahan GPU/ASIC dibanding bcrypt (pemenang PHC 2015) |
| Temporary password | Dienkripsi AES-256-CBC sebelum disimpan di kolom `temporary_password` |
| User enumeration prevention | Password dicek SEBELUM `is_verified`/`is_active` — semua kasus gagal login mendapat pesan error yang sama |

### 3. Rate Limiting Berlapis

```
Global Limiter  →  100 request / 15 menit / IP  →  SEMUA endpoint
Login Limiter   →  10 percobaan GAGAL / 15 menit / IP
                →  /register, /login, /refresh, /forgot-password
                →  skipSuccessfulRequests: true (login berhasil tidak dihitung)
```

### 4. HTTP Security Headers (via Helmet)

Dipasang otomatis: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Content-Security-Policy`, dan 6 header lainnya.

### 5. Input & Query Security

| Mekanisme | Implementasi |
|---|---|
| SQL Injection | Semua query via Sequelize ORM → parameterized queries otomatis |
| Sort injection | Whitelist `ALLOWED_USER_SORT_FIELDS` → `?sort=` yang tidak ada di list ditolak |
| Data dump | `MAX_PAGINATION_LIMIT = 100` → tidak bisa fetch ribuan baris sekaligus |
| ID enumeration | UUID v4 sebagai primary key → tidak bisa ditebak |
| Body overflow | `express.json({ limit: '2mb' })` → mencegah memory pressure |
| CORS | Whitelist ketat: `localhost:5173` dan `sakti-drab.vercel.app` saja |

---

## ⚡ Optimasi Database

### Connection Pool Config

```javascript
pool: {
  max: 5,       // Maks 5 koneksi aktif simultan
  min: 0,       // Tidak ada idle connection (hemat resource)
  acquire: 30000,  // 30 detik timeout sebelum error
  idle: 10000,     // Koneksi idle > 10 detik dikembalikan ke pool
}
```

### 16 Performance Indexes

Ditambahkan sebagai migration terpisah (`add-performance-indexes`) SETELAH query pattern nyata terbentuk:

| Index | Tabel | Kolom | Dampak Estimasi |
|---|---|---|---|
| `idx_users_email` (UNIQUE) | users | email | Login query: **-80%** |
| `idx_users_is_verified` | users | is_verified | Dashboard count: **-70%** |
| `idx_users_last_login` | users | last_login | Statistik aktif 30 hari |
| `idx_users_unit_kerja_id` | users | unit_kerja_id | Filter/join unit: **-60%** |
| `idx_users_role` | users | role | Filter by role |
| `idx_users_active_verified` | users | is_active, is_verified | Composite query: **-60%** |
| `idx_prr_user_id` | password_reset_requests | user_id | Lookup per user |
| `idx_prr_processed_created` | password_reset_requests | is_processed, created_at | Admin dashboard: **-60%** |
| `idx_dl_user_id` | download_logs | user_id | Filter log per user |
| `idx_dl_marketing_kit_id` | download_logs | marketing_kit_id | Filter log per kit |
| `idx_dl_created_at` | download_logs | created_at | Sort log terbaru: **-50%** |
| `idx_ucr_status` | unit_change_requests | status | Filter pending |
| `idx_ucr_user_id` | unit_change_requests | user_id | Lookup per user |
| `idx_rt_token_hash` (UNIQUE) | refresh_tokens | token_hash | Refresh lookup: **-90%** |
| `idx_rt_user_id` | refresh_tokens | user_id | Logout all devices |
| `idx_rt_cleanup` | refresh_tokens | expires_at, is_revoked | Cleanup job |

> **Maintenance**: Jalankan cleanup job berkala:
> ```sql
> DELETE FROM refresh_tokens WHERE expires_at < NOW() AND is_revoked = true;
> ```

---

## 👥 Role & Akses Sistem

### Tiga Role Pengguna

| Role | Kemampuan | Cara Mendapatkan |
|---|---|---|
| `admin` | Akses penuh ke semua endpoint + operasi administrasi | Dibuat langsung di DB atau oleh admin lain via `/api/admin/users` |
| `management` | Baca semua + write service/kit/portfolio/sektor (unit SBU/PPK) | Registrasi publik → verifikasi admin |
| `viewer` | Baca terbatas — tidak bisa akses marketing kit sama sekali | Registrasi publik → verifikasi admin |

### Lima Strategi Middleware Otorisasi

```javascript
// 1. authenticate — verifikasi JWT, isi req.user
router.get('/profile', authenticate, ctrl.getProfile);

// 2. authorize(...roles) — whitelist role
router.delete('/users/:id', authenticate, authorize('admin'), ctrl.deleteUser);

// 3. authorizeAdvanced({ roles, allowUnits }) — role + tipe unit
//    Admin selalu lolos; management hanya jika unit bertipe sbu/ppk
const managementAccess = authorizeAdvanced({
  roles: ['admin', 'management'],
  allowUnits: ['sbu', 'ppk'],
});

// 4. denyRole(...roles) — blacklist role
router.post('/unit-change-request', authenticate, denyRole('admin'), ctrl.requestUnitChange);

// 5. unitAccess([unitTypes]) — filter tipe unit saja tanpa cek role
```

### Matriks Akses per Domain

| Domain | Publik | Viewer | Management (SBU/PPK) | Admin |
|---|---|---|---|---|
| Auth: login, register, refresh, forgot-pw | Bisa | Bisa | Bisa | Bisa |
| Auth: profile, logout, ganti password | — | Bisa | Bisa | Bisa |
| Units: GET | Bisa | Bisa | Bisa | Bisa |
| Units: POST, PUT, DELETE | — | — | — | Bisa |
| Services: GET | — | Bisa | Bisa | Bisa |
| Services: POST, PUT, revenue | — | — | Bisa | Bisa |
| Services: DELETE | — | — | — | Bisa |
| Marketing Kits: GET, download | — | — | Bisa | Bisa |
| Marketing Kits: POST, PUT, DELETE | — | — | Bisa | Bisa |
| Portfolio, Sektor: GET | — | Bisa | Bisa | Bisa |
| Portfolio, Sektor: write | — | — | Bisa | Bisa |
| Admin endpoints (/api/admin/*) | — | — | — | Bisa |

---

## 📡 API Reference Lengkap

**Legenda kolom Auth:**

| Simbol | Arti |
|---|---|
| `Publik` | Tidak memerlukan token — siapa pun bisa akses |
| `Publik + RL` | Publik tapi dibatasi rate limiter (10 gagal / 15 menit) |
| `Login` | Memerlukan `Authorization: Bearer <access_token>` |
| `Login + RL` | Login + rate limiter pada endpoint sensitif |
| `Admin` | Token dengan role `admin` |
| `Mgmt` | Token role `admin` atau `management` dengan unit `sbu`/`ppk` |
| `Non-Viewer` | Semua role kecuali `viewer` |

---

### Autentikasi & Profil — `/api/auth`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/register` | `Publik + RL` | Daftar akun baru. Status awal: pending verifikasi admin. Role `admin` tidak bisa didaftar via endpoint ini. |
| `POST` | `/login` | `Publik + RL` | Login → terima `access_token` (1 jam) + `refresh_token` (7 hari). |
| `POST` | `/refresh` | `Publik + RL` | Tukar refresh token valid → access token baru. |
| `POST` | `/forgot-password` | `Publik + RL` | Ajukan reset password ke admin. Selalu sukses (tidak bocorkan email terdaftar). |
| `GET` | `/profile` | `Login` | Profil user saat ini — diambil dari DB, bukan dari JWT. |
| `PUT` | `/update-password` | `Login` | Ganti password. Semua refresh token di-revoke sesudahnya. |
| `DELETE` | `/logout` | `Login` | Logout dari perangkat ini (revoke 1 refresh token). Body: `refresh_token`. |
| `DELETE` | `/logout-all` | `Login` | Logout dari semua perangkat (revoke semua refresh token). |
| `POST` | `/unit-change-request` | `Login (non-admin)` | Ajukan pindah unit kerja. Body: `requested_unit_id`. |

---

### Unit Kerja — `/api/units`

Tipe valid: `sbu` · `ppk` · `cabang` · `unit` · `divisi` · `lainnya`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Publik` | Daftar unit. Query: `type`, `search`, `page`, `limit`. Publik untuk kebutuhan form registrasi. |
| `GET` | `/:id` | `Publik` | Detail satu unit. |
| `POST` | `/` | `Admin` | Buat unit baru. Body: `name`*, `code` (opsional, unik), `type`*. |
| `PUT` | `/:id` | `Admin` | Update data unit. Kirim `code: ""` untuk hapus kode. |
| `DELETE` | `/:id` | `Admin` | Hapus unit. Gagal 409 jika masih ada user aktif (FK constraint). |

---

### Layanan — `/api/services`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Daftar layanan. Query: `search`, `portfolio_id`, `sector_id`, `sort`, `order`, `page`, `limit`. |
| `GET` | `/:id` | `Login` | Detail lengkap: portfolio, sub portfolio, sektor, sub sektor, marketing kit, revenue. |
| `POST` | `/` | `Mgmt` | Buat layanan. Body: `name`*, `group`, `intro_video_url`, `overview`, `scope`, `benefit`, `output`, `regulation_ref`, `portfolio_id`, `sub_portfolio_id`, `sbu_owner_id`, `sectors[]`, `sub_sectors[]`. |
| `PUT` | `/:id` | `Mgmt` | Update parsial. Kirim `sectors: []` untuk hapus semua relasi sektor. |
| `DELETE` | `/:id` | `Admin` | Hapus permanen + CASCADE semua data terkait. |
| `POST` | `/:id/revenue` | `Mgmt` | Tambah data pendapatan. Body: `customer_name`*, `revenue`* (angka positif), `unit_id`*. |

---

### Marketing Kit — `/api/marketing-kits`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Non-Viewer` | Daftar kit. Query: `search`, `service`, `file_type`. |
| `GET` | `/:id` | `Non-Viewer` | Detail kit + relasi layanan dan uploader. |
| `POST` | `/:id/download` | `Non-Viewer` | Generate signed URL (expire 60 detik) + redirect. Dicatat di `download_logs`. Body: `purpose`* (alasan download wajib diisi). |
| `POST` | `/` | `Mgmt` | Upload multi-file. Form-data: `files[]`* (maks 10, maks 10MB/file), `service_ids[]`*, `file_types[]`*. |
| `PUT` | `/:id` | `Mgmt` | Update metadata/ganti file. Form-data: `file`, `file_type`, `service_ids[]` (semua opsional). |
| `DELETE` | `/:id` | `Mgmt` | Hapus dari DB dan Cloudinary. Tidak bisa dibatalkan. |

---

### Portfolio & Sub Portfolio — `/api/portfolios`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Semua portfolio + sub portfolio (cocok untuk dropdown). |
| `GET` | `/:id` | `Login` | Detail portfolio + sub portfolio-nya. |
| `GET` | `/sub-portfolios` | `Login` | Semua sub portfolio. Query: `portfolio_id`. |
| `GET` | `/sub-portfolios/:id` | `Login` | Detail satu sub portfolio. |
| `POST` | `/` | `Mgmt` | Buat portfolio. Body: `name`* (unik). |
| `PUT` | `/:id` | `Mgmt` | Update portfolio. Body: `name`. |
| `DELETE` | `/:id` | `Mgmt` | Hapus portfolio + CASCADE sub portfolio. Gagal jika ada layanan aktif. |
| `POST` | `/:portfolio_id/sub-portfolios` | `Mgmt` | Buat sub portfolio. Body: `name`*, `code`* (unik dalam portfolio). |
| `PUT` | `/:portfolio_id/sub-portfolios/:sub_portfolio_id` | `Mgmt` | Update sub portfolio. Body: `name`, `code`. |
| `DELETE` | `/:portfolio_id/sub-portfolios/:sub_portfolio_id` | `Mgmt` | Hapus sub portfolio. |

---

### Sektor & Sub Sektor — `/api/sectors`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/` | `Login` | Semua sektor + sub sektor. Query: `search`. |
| `GET` | `/:id` | `Login` | Detail sektor + sub sektor. |
| `POST` | `/` | `Mgmt` | Buat sektor. Body: `name`*, `code`* (unik). |
| `PUT` | `/:id` | `Mgmt` | Update sektor. Body: `name`, `code`. |
| `DELETE` | `/:id` | `Mgmt` | Hapus + CASCADE. Gagal jika ada layanan aktif. |
| `POST` | `/:sector_id/sub-sectors` | `Mgmt` | Buat sub sektor. Body: `name`*, `code`* (unik dalam sektor). |
| `PUT` | `/:sector_id/sub-sectors/:sub_sector_id` | `Mgmt` | Update sub sektor. Body: `name`, `code`. |
| `DELETE` | `/:sector_id/sub-sectors/:sub_sector_id` | `Mgmt` | Hapus sub sektor. |

---

### Administrasi — `/api/admin` *(Semua: Admin Only)*

**Dashboard**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/dashboard` | Statistik: user terverifikasi, user pending, aktif 30 hari, total download, unit change pending, reset PW pending. |

**Manajemen User**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/users` | Daftar user. Query: `search`, `role`, `unit`, `is_active`, `is_verified`, `sort`, `order`, `page`, `limit`. Maks 100/halaman. |
| `POST` | `/users` | Buat akun (langsung verified). Password acak 96-bit dikembalikan SEKALI. Body: `full_name`*, `email`*, `role`*, `unit_kerja_id`. |
| `PUT` | `/users/:id` | Update user. Hanya field yang dikirim yang berubah. |
| `DELETE` | `/users/:id` | Hapus permanen. Tidak bisa hapus diri sendiri atau satu-satunya admin. |
| `GET` | `/users/:id/temporary-password` | Ambil temporary password (dekripsi AES). |

**Verifikasi Pendaftaran**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/waiting-users` | User pending verifikasi (is_verified = null), diurutkan FIFO. |
| `POST` | `/waiting-users/:id/approve` | Setujui pendaftaran → `is_verified = true`. |
| `POST` | `/waiting-users/:id/reject` | Tolak pendaftaran → `is_verified = false`. |

**Reset Password**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/password-reset-requests` | Daftar permintaan reset yang belum diproses. |
| `POST` | `/password-reset-requests/:id/reset` | Reset password → password acak baru. Revoke semua refresh token user. Password dikembalikan SEKALI. |

**Unit Change Request**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/unit-change-requests` | Daftar permintaan. Query: `status`, `page`, `limit`. |
| `PUT` | `/unit-change-requests/:request_id/process` | Approve (atomik, DB transaction) atau reject. Body: `status`, `notes`. |

**Audit Log**

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/download-logs` | Log semua aktivitas download. Cari: nama kit, nama user, tujuan download. |

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

# 4. Buat database (jika MySQL lokal)
mysql -u root -p -e "CREATE DATABASE sakti;"

# 5. Jalankan semua migrations
npx sequelize-cli db:migrate

# 6. (Opsional) Seed data awal
npm run seed

# 7. Jalankan server development
npm run dev
# Server berjalan di http://localhost:3000
```

### Scripts

```bash
npm start       # Production server (node ./bin/www)
npm run dev     # Development dengan hot-reload (nodemon)
npm run seed    # Jalankan semua database seeders
```

### Rollback Migration

```bash
npx sequelize-cli db:migrate:undo           # Rollback satu migration terakhir
npx sequelize-cli db:migrate:undo:all       # Rollback semua (hapus semua tabel)
```

---

## 🔧 Environment Variables

```env
# ─── Aplikasi ──────────────────────────────────────────────────────────
APP_NAME=sakti-api
PORT=3000
NODE_ENV=development          # development | test | production

# ─── Database ──────────────────────────────────────────────────────────
DATABASE_URL=mysql://user:password@host:port/dbname

# ─── JWT & Token ───────────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=ganti_dengan_string_random_panjang
JWT_EXPIRES_IN=30d
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=ganti_dengan_string_random_berbeda
REFRESH_TOKEN_EXPIRES_IN=7d
JWT_RESET_SECRET=ganti_dengan_string_random_ketiga

# ─── Enkripsi Temporary Password ───────────────────────────────────────
TEMP_PASSWORD_SECRET_KEY=tepat_32_karakter_di_sini_xxxx

# ─── Cloudinary ────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=nama_cloud
CLOUDINARY_API_KEY=api_key
CLOUDINARY_API_SECRET=api_secret

# ─── Email (Opsional) ──────────────────────────────────────────────────
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_FROM=no-reply@example.com

# ─── Testing ───────────────────────────────────────────────────────────
# RATE_LIMIT_SKIP=true    # Aktifkan HANYA saat testing, matikan di production
```

---

## 🚀 Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Semua JWT secrets diganti dengan nilai random kuat (minimal 64 karakter)
- [ ] `RATE_LIMIT_SKIP` tidak di-set atau di-set `false`
- [ ] `DATABASE_URL` mengarah ke database production
- [ ] Seluruh migration sudah berjalan di database production
- [ ] Cloudinary credentials production sudah dikonfigurasi
- [ ] CORS `origin` hanya mengizinkan domain production
- [ ] Cron job cleanup `refresh_tokens` sudah disetup
- [ ] Monitor ukuran tabel `refresh_tokens` secara berkala

---

## 💡 Keputusan Teknis (Why)

### Mengapa MySQL, bukan PostgreSQL atau MongoDB?

Data SAKTI sangat relasional — hierarki portfolio → sub portfolio → sektor → sub sektor membentuk dependensi yang kuat. MySQL menangani foreign key, join, dan cascade dengan baik dan merupakan standar di ekosistem enterprise Indonesia. MongoDB akan mempersulit query join tanpa benefit sepadan untuk use case ini.

### Mengapa Sequelize ORM, bukan raw query?

Schema-as-code via migration memastikan semua developer dan environment memiliki skema identik. Parameterized queries mencegah SQL injection secara otomatis. Model associations membuat relasi mudah di-query. Trade-off: sedikit lebih verbose untuk query sangat kompleks.

### Mengapa UUID sebagai primary key?

UUID v4 tidak bisa di-enumerate. Auto-increment membuat attacker bisa fishing data dengan mencoba ID `1, 2, 3, ...`. UUID v4 (128-bit random) secara praktis tidak bisa ditebak. Biaya: sedikit lebih lambat untuk JOIN data besar — tidak signifikan di skala SAKTI.

### Mengapa index database ditambahkan di migration terpisah?

Premature optimization merugikan: index memperlambat INSERT/UPDATE dan memakan storage. Index ditambahkan setelah query pattern nyata terbentuk dari implementasi controller. Migration terpisah memungkinkan rollback independen jika diperlukan.

### Mengapa Argon2, bukan bcrypt?

Argon2 memenangkan Password Hashing Competition (PHC) 2015. Memory-hard algorithm menyulitkan parallelisasi GPU/ASIC — lebih tahan terhadap brute-force modern. Library `argon2` untuk Node.js stabil dan aktif.

### Mengapa file langsung di-stream ke Cloudinary?

Server yang menyimpan file adalah target serangan. Dengan stream Multer → Cloudinary, file sensitif tidak pernah ada di server SAKTI. Jika server dikompromis, file tetap aman di CDN terpisah dengan access control sendiri. Bonus: auto-CDN, tidak perlu maintain storage server.

### Mengapa setiap bug fix diberi label `[Fix #N]`?

Keterlacakan penuh — jika bug serupa muncul kembali (regression), developer langsung tahu histori. Knowledge transfer — developer baru memahami alasan kode ditulis dengan cara tertentu. Ini adalah investasi dokumentasi, bukan overhead.

---

*Dibuat untuk Hackin Fest 2025 — PT Sucofindo | Juara 1 Kategori Inovasi Layanan*
