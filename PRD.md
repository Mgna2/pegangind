# PRD — pegangind.com (3D Printing Service Website)

## 1. Concept & Vision

**pegangind.com** adalah website layanan jasa 3D print yang menghadirkan pengalaman digital modern, elegan, dan interaktif. Website ini dirancang untuk showcase hasil 3D print, memungkinkan client melacak pesanan dari Shopee, serta memberi admin dashboard untuk mengelola operasional. Nuansa visual yang bersih (putih + hitam) dipadukan dengan aksen warna biru tua (#124875) dan hijau (#AAC979), menghasilkan kesan profesional, terpercaya, dan teknologis. Setiap elemen memiliki animasi halus dan efek glassmorphism untuk pengalaman yang premium.

---

## 2. Design Language

### 2.1 Color Palette

| Role         | Color     | Hex       |
|--------------|-----------|-----------|
| Background   | White     | `#FFFFFF` |
| Text Primary | Black     | `#000000` |
| Text Body    | Dark Gray | `#1A1A1A` |
| Brand Blue   | Navy Blue | `#124875` |
| Brand Green  | Sage Green| `#AAC979` |
| Accent Light | Light Blue| `#E8F0F8` |
| Glass BG     | Semi-white | `rgba(255,255,255,0.6)` |

### 2.2 Typography

- **Headings**: `Poppins` (700, 600) — geometric, modern
- **Body**: `Inter` (400, 500) — clean, readable
- **Monospace (resi/code)**: `JetBrains Mono` — technical feel

### 2.3 Visual Style

- **Glassmorphism**: Frosted glass cards with `backdrop-filter: blur(16px)`, semi-transparent white backgrounds, subtle borders
- **Animations**: Entrance fade-up, scroll-triggered reveals, hover micro-interactions, floating elements, parallax layers
- **Shadows**: Soft multi-layered shadows (`box-shadow` with blur + color tints)
- **Gradients**: Subtle blue-to-green gradients on brand elements
- **Borders**: 1px borders with low opacity (rgba white/black)

### 2.4 Spacing & Layout

- Base unit: `8px`
- Section padding: `80px–120px` vertical
- Container max-width: `1200px`
- Grid: 12-column responsive

---

## 3. Layout & Structure

### 3.1 Website Client (pegangind.com)

```
/                   → Landing Page (Hero + Portfolio + Services + CTA)
/cek-pesanan        → Lacak Pesanan (paste resi Shopee)
/tentang            → Tentang Kami
/kontak             → Kontak
/portofolio         → Galeri / Hasil 3D Print
/harga              → Daftar Harga
```

### 3.2 Dashboard Admin (pegangind.com/admin)

```
/admin              → Login
/admin/dashboard    → Overview (uang masuk, pesanan aktif, statistik)
/admin/pesanan      → Daftar Semua Pesanan
/admin/pesanan/baru → Tambah Pesanan Manual
/admin/pesanan/:id  → Detail & Update Pesanan
/admin/portofolio   → Kelola Galeri
```

---

## 4. Features & Interactions

### 4.1 Client Website

#### Landing Page (Hero Section)
- Full-height hero dengan tagline animasi ketik (typewriter effect)
- Floating 3D mockup/card dengan parallax on scroll
- CTA button "Cek Pesanan" dan "Pesan Sekarang"
- Navbar: sticky, glassmorphism saat scroll, logo kiri, menu kanan

#### Portfolio / Hasil 3D Print
- Masonry grid dengan hover zoom + overlay info
- Filter kategori: figurine, mechanical parts, prototype, dll
- Lazy loading images dengan skeleton placeholder
- Lightbox popup dengan zoom + slide

#### Layanan (Services)
- Card-based layout dengan glassmorphism
- Hover: card lift + glow effect
- Include: Custom 3D printing, prototipe, figurine, parts manufacturing

#### Cek Pesanan (Order Tracking)
- Input field besar untuk paste nomor resi Shopee
- Tombol "Lacak" dengan loading spinner
- Hasil pencarian menampilkan:
  - Status pesanan: `Diterima` → `Sedang Dicetak` → `Selesai` → `Siap Dikirim`
  - Thumbnail gambar hasil 3D print
  - Estimasi waktu selesai
  - Tanggal update terakhir
- Jika resi tidak ditemukan: tampilkan pesan "Pesanan tidak ditemukan"
- Animasi: status stepper dengan line animation

#### Tentang & Kontak
- Timeline company story dengan scroll-triggered animation
- Contact form dengan glassmorphism card
- Google Maps embed (placeholder)
- Social media links dengan hover effect

### 4.2 Admin Dashboard

#### Login
- Clean login page dengan glassmorphism card
- Email + password fields
- "Lupa password" link (placeholder)
- Session-based auth (cookie/session)

#### Dashboard Overview
- Cards glassmorphism menampilkan:
  - Total uang masuk (bulan ini)
  - Pesanan aktif
  - Pesanan selesai (bulan ini)
  - Pesanan pending
- Line chart: uang masuk per hari/minggu (Chart.js)
- Recent orders table dengan quick actions
- Quick action buttons: + Pesanan Baru, Lihat Pesanan Aktif

#### Kelola Pesanan (CRUD)

**Tambah Pesanan Manual:**
- Form lengkap:
  - Nama client
  - No. WhatsApp
  - No. Resi Shopee
  - Link pesanan Shopee
  - Tanggal pesan
  - Bahan/material
  - Warna filament
  - Status pesanan (dropdown)
  - Upload gambar (bisa multiple): desain, proses, hasil akhir, siap kirim
  - Catatan admin
- Image preview dengan drag-and-drop upload
- Auto-generate ID pesanan internal

**Update Pesanan:**
- Ubah status: `Pesanan Masuk` → `Sedang Dikerjakan` → `Selesai` → `Siap Dikirim` → `Sudah Dikirim`
- Upload gambar baru per tahap
- Field tracking number (jika sudah dikirim)
- Notifikasi WhatsApp ke client (placeholder: generate message link)
- History log perubahan status (timestamp + status lama → baru)

#### Kelola Portofolio
- Tambah/hapus/edit item galeri
- Upload gambar + judul + deskripsi + kategori
- Toggle visibility (show/hide di landing page)

---

## 5. Component Inventory

### 5.1 Navbar
- Default: transparent bg, logo, nav links
- Scrolled: `backdrop-filter: blur(20px)`, white bg semi-transparent, shadow
- Mobile: hamburger → slide-in drawer
- Active link: underline animation

### 5.2 Hero Section
- Typewriter heading animation
- Floating cards dengan CSS animation (subtle rotation/bob)
- Background: subtle animated gradient blobs

### 5.3 Glassmorphism Card
- `background: rgba(255,255,255,0.55)`
- `backdrop-filter: blur(16px)`
- `border: 1px solid rgba(255,255,255,0.4)`
- `box-shadow: 0 8px 32px rgba(18,72,117,0.1)`
- Hover: scale(1.02), shadow intensify

### 5.4 Button Primary
- Background: `#124875`
- Text: white
- Hover: `#0e3a5f` + subtle glow
- Active: scale(0.98)
- Transition: 0.3s ease

### 5.5 Button Secondary
- Background: transparent
- Border: 2px solid `#124875`
- Text: `#124875`
- Hover: bg `#124875`, text white

### 5.6 Status Badge
- `Diterima`: gray
- `Sedang Dicetak`: blue `#124875`
- `Selesai`: green `#AAC979`
- `Siap Dikirim`: orange
- `Sudah Dikirim`: dark green
- Pill shape, small icon prefix

### 5.7 Image Upload
- Dashed border dropzone
- Preview thumbnails grid
- Remove button overlay
- Progress bar during upload

### 5.8 Table (Admin)
- Striped rows dengan glassmorphism header
- Sortable columns
- Pagination
- Action buttons per row: View, Edit, Delete

### 5.9 Chart
- Chart.js line chart
- Brand blue + green gradient fill
- Glassmorphism card container

---

## 6. Technical Approach

### 6.1 Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Runtime     | Node.js                               |
| Web Server  | Express.js                            |
| Database    | SQLite (better-sqlite3) — portable    |
| ORM         | Drizzle ORM                           |
| Auth        | express-session + bcrypt             |
| File Upload | Multer                                |
| Frontend    | Vanilla HTML/CSS/JS + EJS templates  |
| Charts      | Chart.js                             |
| Animations  | CSS animations + IntersectionObserver|
| Icons       | Lucide Icons (CDN)                   |

### 6.2 Project Structure

```
/
├── public/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css          # Global styles
│   │   │   ├── components.css    # Reusable components
│   │   │   ├── animations.css    # All animations
│   │   │   ├── admin.css         # Dashboard styles
│   │   │   └── pages.css         # Page-specific
│   │   ├── js/
│   │   │   ├── main.js           # Global scripts
│   │   │   ├── tracker.js        # Order tracking page
│   │   │   ├── admin.js          # Dashboard scripts
│   │   │   └── charts.js         # Chart initialization
│   │   └── images/
│   │       └── logo.png
│   └── uploads/                  # Uploaded images
│       ├── orders/
│       └── portfolio/
├── views/
│   ├── layouts/
│   │   ├── main.ejs              # Client layout
│   │   └── admin.ejs             # Admin layout
│   ├── partials/
│   │   ├── navbar.ejs
│   │   ├── footer.ejs
│   │   ├── head.ejs
│   │   └── admin-sidebar.ejs
│   ├── pages/
│   │   ├── home.ejs
│   │   ├── cek-pesanan.ejs
│   │   ├── portofolio.ejs
│   │   ├── harga.ejs
│   │   ├── tentang.ejs
│   │   └── kontak.ejs
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── orders.ejs
│       ├── order-new.ejs
│       ├── order-edit.ejs
│       └── portfolio-admin.ejs
├── src/
│   ├── app.js                    # Express app setup
│   ├── server.js                 # Server entry point
│   ├── db/
│   │   ├── index.js              # DB connection
│   │   └── schema.js             # Drizzle schema
│   ├── routes/
│   │   ├── client.js             # Client routes
│   │   ├── admin.js              # Admin routes
│   │   └── api.js                # API routes
│   ├── controllers/
│   │   ├── clientController.js
│   │   ├── adminController.js
│   │   └── apiController.js
│   ├── middleware/
│   │   ├── auth.js               # Admin auth middleware
│   │   └── upload.js             # Multer config
│   └── utils/
│       └── helpers.js
├── data/
│   └── pegangind.db               # SQLite database
├── package.json
└── .env
```

### 6.3 Database Schema

```sql
-- Orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id VARCHAR(50) UNIQUE NOT NULL,  -- Internal ID: PG-YYYYMMDD-XXX
  client_name VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20),
  resi_shopee VARCHAR(100),
  shopee_link VARCHAR(500),
  material VARCHAR(100),
  filament_color VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Pesanan Masuk',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  shipped_at DATETIME,
  tracking_number VARCHAR(100)
);

-- Order images
CREATE TABLE order_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  image_path VARCHAR(500) NOT NULL,
  image_type VARCHAR(50),  -- 'design', 'process', 'result', 'ready'
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order status log
CREATE TABLE order_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(100)
);

-- Portfolio
CREATE TABLE portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  image_path VARCHAR(500),
  visible BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Money transactions (income tracking)
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  amount INTEGER,  -- in Rupiah
  type VARCHAR(20),  -- 'income'
  description TEXT,
  date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.4 API Endpoints

| Method | Endpoint                            | Deskripsi                        |
|--------|-------------------------------------|----------------------------------|
| GET    | `/api/track?resi=<resi>`            | Lacak pesanan via resi           |
| GET    | `/api/orders`                       | List semua pesanan (admin)       |
| POST   | `/api/orders`                       | Tambah pesanan baru             |
| GET    | `/api/orders/:id`                   | Detail pesanan                  |
| PUT    | `/api/orders/:id`                   | Update pesanan                  |
| DELETE | `/api/orders/:id`                   | Hapus pesanan                   |
| POST   | `/api/orders/:id/images`            | Upload gambar pesanan           |
| GET    | `/api/stats`                        | Statistik dashboard             |
| GET    | `/api/portfolio`                    | List portofolio                 |
| POST   | `/api/portfolio`                    | Tambah item portofolio          |
| PUT    | `/api/portfolio/:id`               | Update item portofolio          |
| DELETE | `/api/portfolio/:id`               | Hapus item portofolio           |
| POST   | `/admin/login`                      | Login admin                     |
| POST   | `/admin/logout`                     | Logout admin                    |

### 6.5 Animasi Spesification

| Element            | Animation                                    | Duration | Easing       |
|--------------------|----------------------------------------------|----------|--------------|
| Page load          | Staggered fade-up (every element)            | 600ms    | ease-out     |
| Scroll reveal      | Fade-up + scale from 0.95                    | 500ms    | ease-out     |
| Card hover         | translateY(-8px) + shadow intensify         | 300ms    | ease         |
| Button hover       | Background darken + subtle glow             | 200ms    | ease         |
| Navbar scroll      | Backdrop blur transition                     | 300ms    | ease         |
| Hero text          | Typewriter effect                           | variable | linear       |
| Hero floating card | Subtle rotate + bobbing                     | 4s       | ease-in-out  |
| Background blobs   | Scale + position shift                      | 8s       | ease-in-out  |
| Status stepper     | Line draw animation                         | 400ms    | ease         |
| Image hover        | scale(1.05) + brightness                    | 300ms    | ease         |
| Glass card glass   | shimmer on hover                            | 500ms    | ease         |
| Table row hover    | Background tint + left border accent        | 200ms    | ease         |
| Modal open         | Scale from 0.9 + fade                       | 300ms    | ease-out     |
| Number counter     | Count-up animation on scroll                | 1500ms   | ease-out     |

---

## 7. Halaman Detail

### 7.1 Landing Page Sections

1. **Navbar** — sticky, glassmorphism
2. **Hero** — typewriter headline, subtext, dual CTA, floating 3D print illustration
3. **Layanan** — 4 service cards dengan icon + glassmorphism
4. **Portofolio Preview** — 6 item grid, "Lihat Semua" button
5. **Cek Pesanan CTA** — full-width banner biru, input resi + button
6. **Tentang Singkat** — 2 column: text + animated counter stats
7. **Harga Preview** — table/card harga umum
8. **Kontak** — form + info kontak
9. **Footer** — logo, links, social, copyright

### 7.2 Cek Pesanan Page

- Hero kecil dengan judul "Lacak Pesanan Kamu"
- Input besar: placeholder "Paste nomor resi Shopee di sini..."
- Tombol: "Lacak Sekarang"
- Hasil: glassmorphism card dengan timeline status + gambar
- Empty state: ilustrasi + "Masukkan nomor resi untuk melacak pesanan"
- Not found state: icon warning + "Pesanan tidak ditemukan"

### 7.3 Admin Dashboard Pages

1. **Login** — Centered glassmorphism card
2. **Dashboard** — Stats cards (4) + chart + recent table
3. **Semua Pesanan** — Table dengan filter status + search
4. **Tambah/Edit Pesanan** — Multi-section form dengan image upload
5. **Detail Pesanan** — Full info + image gallery per tahap + log

---

## 8. Logo Specification

- **File**: `public/assets/images/logo.png`
- **Background**: White `#FFFFFF`
- **Text/Icon colors**: Dark Blue `#124875` + Sage Green `#AAC979`
- **Style**: Modern, minimal, geometric
- **Layout**: Horizontal dengan icon 3D print motif + teks "pegangind"
- **Usage**: Navbar (40px height), Footer, Favicon, OG image

---

## 9. Sample Data (Seed)

### Admin User
- Username: `admin`
- Password: `pegangind2024` (hash before use in production)

### Sample Orders
1. Order PG-20260401-001 — "Rex Figurine" — Status: Sudah Dikirim — Resi: SNWA1234567890
2. Order PG-20260402-001 — "Gear Set Prototype" — Status: Sedang Dicetak
3. Order PG-20260403-001 — "Keychain Custom" — Status: Pesanan Masuk

### Sample Portfolio Items
- "Dragon Miniature" — Figurine
- "Phone Stand Geometric" — Household
- "Drone Frame v2" — Mechanical Parts
- "Custom Keycap Set" — Accessories
- "Architectural Model" — Prototipe

---

## 10. Deployment Notes

- Node.js 18+
- Environment variables: `SESSION_SECRET`, `PORT`, `DB_PATH`
- Static files served via Express + nginx in production
- Images: store in `public/uploads/` (expandable to S3 later)
- Admin route: `/admin` (consider separate subdomain in future)
- HTTPS required for production
