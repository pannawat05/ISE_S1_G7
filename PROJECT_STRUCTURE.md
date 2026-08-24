# Magic Ticket — Project Structure

> อัปเดตล่าสุด: กรกฎาคม 2026  
> Monorepo แบ่งเป็น 2 ส่วน: `api/` (Backend) และ `magic_ticket/` (Frontend)

---

## สารบัญ

- [ภาพรวม](#ภาพรวม)
- [Backend (`api/`)](#backend-api)
  - [โครงสร้างไฟล์](#โครงสร้างไฟล์-backend)
  - [API Endpoints](#api-endpoints)
  - [Database Models](#database-models)
  - [Middleware](#middleware)
- [Frontend (`magic_ticket/`)](#frontend-magic_ticket)
  - [โครงสร้างไฟล์](#โครงสร้างไฟล์-frontend)
  - [Pages & Routes](#pages--routes)
  - [Components](#components)
  - [API Layer](#api-layer)
- [User Roles](#user-roles)
- [การทำงานของระบบหลัก](#การทำงานของระบบหลัก)

---

## ภาพรวม

```
ISE/
├── api/              ← Express + TypeScript backend (port 5001)
├── magic_ticket/     ← React + Vite + Tailwind frontend
├── docker-compose.yaml
└── PROJECT_STRUCTURE.md
```

**Tech Stack**
| ด้าน | เทคโนโลยี |
|---|---|
| Backend | Node.js, Express 5, TypeScript, tsx |
| Database | MySQL 8 (via mysql2) |
| Auth | JWT (jsonwebtoken), bcrypt |
| Email | Nodemailer + Gmail SMTP |
| File Upload | Multer |
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Maps | Leaflet (CDN) + Nominatim geocoding |
| Icons | Lucide React |

---

## Backend (`api/`)

### โครงสร้างไฟล์ Backend

```
api/
├── index.ts                        ← Entry point, Express app setup
├── .env                            ← ENV vars (PORT, DB, JWT_SECRET, EMAIL_*)
├── Dockerfile
│
├── lib/
│   └── mailer.ts                   ← Shared nodemailer transporter + email helpers
│                                     (notifyEventApproved, notifyEventRejected)
│
├── controllers/
│   ├── auth.controller.ts          ← signup, login, getUserData, registerOrganizer
│   ├── user.controller.ts          ← getMe, updateMe, getMyOrganizers
│   ├── organizer.controller.ts     ← organizer CRUD + event CRUD (scoped)
│   ├── events.controller.ts        ← public event listing, event types (no auth)
│   ├── email.controller.ts         ← sendOtp, verifyOtpHandler
│   ├── admin.controller.ts         ← listAllEvents, approveEvent, rejectEvent
│   └── sysadmin.controller.ts      ← event types, payment methods, users, organizers
│
├── routes/
│   ├── auth.route.ts               ← /auth/*
│   ├── user.route.ts               ← /users/*
│   ├── organizer.route.ts          ← /organizer/*
│   ├── events.route.ts             ← /events/*  (public)
│   ├── email.route.ts              ← /email/*
│   ├── admin.route.ts              ← /admin/*   (admin + sysadmin)
│   └── sysadmin.route.ts           ← /sysadmin/* (admin + sysadmin)
│
├── model/
│   ├── db.ts                       ← MySQL connection pool
│   ├── query.ts                    ← query<T>() และ execute() helpers
│   ├── types.ts                    ← DB row interfaces (UserRow, EventRow, ฯลฯ)
│   ├── user.model.ts               ← findUserByEmail, createUser, findUserById
│   ├── organizer.model.ts          ← createOrganizer, findOrganizerById, ฯลฯ
│   ├── event.model.ts              ← createEvent, findEventById, updateEvent, ฯลฯ
│   └── email.model.ts              ← in-memory OTP store (Map + TTL 5 นาที)
│
├── middlewares/
│   ├── auth.middleware.ts          ← authenticate (JWT Bearer), signToken, verifyToken
│   ├── admin.middleware.ts         ← requireAdmin (role: admin | sysadmin)
│   ├── organizer.middleware.ts     ← authenticateOrganizer (legacy, ไม่ใช้แล้ว)
│   ├── upload.middleware.ts        ← Multer config (organizer logo, event images)
│   └── types.ts                   ← AuthRequest, OrganizeRequest interfaces
│
└── api/upload/                     ← Uploaded files (organizer logos, event images)
```

---

### API Endpoints

#### 🔓 Public (ไม่ต้อง Auth)

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| `GET` | `/events` | ดึง events ที่ approved + active (มี filter: search, location, type, limit, offset) |
| `GET` | `/events/types` | ดึงประเภท event ทั้งหมดจาก DB |
| `GET` | `/events/:id` | ดึงรายละเอียด event เดี่ยว (approved เท่านั้น) |
| `POST` | `/email/sendotp` | ส่ง OTP ไปยัง email (สร้าง OTP ใน backend) |
| `POST` | `/email/verifyotp` | ตรวจสอบ OTP |
| `POST` | `/auth/signup` | สมัครสมาชิก |
| `POST` | `/auth/login` | เข้าสู่ระบบ → JWT |
| `GET` | `/auth/verify-token` | ตรวจสอบ token |

#### 🔒 Authenticated (ต้องมี JWT)

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| `GET` | `/auth/getuserdata` | ดึงข้อมูล user ปัจจุบัน |
| `GET` | `/auth/userid` | ดึง user ID |
| `POST` | `/auth/organizer-register` | สมัคร organizer (legacy) |
| `GET` | `/users/me` | Profile ปัจจุบัน |
| `PATCH` | `/users/me` | แก้ไข Profile |
| `GET` | `/users/my-organizers` | รายชื่อ organizer ที่ตัวเองเป็นเจ้าของ |
| `POST` | `/organizer/create` | สร้าง organizer ใหม่ |
| `GET` | `/organizer/:id` | ดึงข้อมูล organizer (owner เท่านั้น) |
| `PUT` | `/organizer/:id` | แก้ไข organizer |
| `DELETE` | `/organizer/:id` | ลบ organizer |
| `GET` | `/organizer/:id/events` | รายชื่อ events ของ organizer นั้น |
| `POST` | `/organizer/:id/events` | สร้าง event ใหม่ (FormData + multipart) |
| `GET` | `/organizer/:id/events/:eventId` | รายละเอียด event (owner) |
| `PUT` | `/organizer/:id/events/:eventId` | แก้ไข event |

#### 🛡️ Admin + SysAdmin (role: admin หรือ sysadmin)

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| `GET` | `/admin/events` | รายชื่อ events ทั้งหมด (filter: status, search) |
| `GET` | `/admin/events/:eventId` | รายละเอียด event สำหรับ admin |
| `PATCH` | `/admin/events/:eventId/approve` | อนุมัติ event + ส่ง email แจ้ง |
| `PATCH` | `/admin/events/:eventId/reject` | ปฏิเสธ event + ส่ง email พร้อม note |
| `GET` | `/sysadmin/event-types` | รายชื่อ event types |
| `POST` | `/sysadmin/event-types` | สร้าง event type ใหม่ |
| `PUT` | `/sysadmin/event-types/:id` | แก้ไข event type |
| `DELETE` | `/sysadmin/event-types/:id` | ลบ event type |
| `GET` | `/sysadmin/payment-methods` | รายชื่อช่องทางชำระเงิน |
| `POST` | `/sysadmin/payment-methods` | เพิ่มช่องทางชำระเงิน |
| `PUT` | `/sysadmin/payment-methods/:id` | แก้ไขช่องทางชำระเงิน |
| `PATCH` | `/sysadmin/payment-methods/:id/toggle` | เปิด/ปิดช่องทางชำระเงิน |
| `DELETE` | `/sysadmin/payment-methods/:id` | ลบช่องทางชำระเงิน |
| `GET` | `/sysadmin/users` | รายชื่อ users (filter: search, role) |
| `PATCH` | `/sysadmin/users/:id/role` | เปลี่ยน role ของ user |
| `GET` | `/sysadmin/organizers` | รายชื่อ organizers ทั้งหมด |

---

### Database Models

```
users
├── id, email, password (bcrypt), f_name, l_name
├── role: "customer" | "admin" | "sysadmin"
└── created_at, updated_at

organizers
├── id, name, description, logo_url
├── owner_id → users.id
└── created_at, updated_at

event_types
├── id, name (unique)

events
├── id, name, place_name, address, latitude, longitude
├── cover_image, description, theme
├── status: "pending" | "approved" | "rejected"
├── is_active: boolean
├── start_date, end_date
├── organizer_id → organizers.id
├── type_id → event_types.id
└── created_at, updated_at

event_images
├── id, event_id → events.id
├── url, display_order
└── created_at

payment_methods
├── id, category: "credit card"|"prompt pay"|"mobile banking"|"cash"
├── channel, gateway (nullable)
└── is_active
```

---

### Middleware

| Middleware | หน้าที่ |
|---|---|
| `authenticate` | ตรวจสอบ JWT Bearer token → inject `req.user` |
| `requireAdmin` | ตรวจสอบ role `admin` หรือ `sysadmin` จาก DB |
| `uploadOrganizerLogo` | Multer — รับไฟล์ logo เข้า `uploads/organizer/logo/` |
| `uploadEventImages` | Multer — รับ `cover_image` + `event_images[]` เข้า `uploads/event/` |

---

## Frontend (`magic_ticket/`)

### โครงสร้างไฟล์ Frontend

```
magic_ticket/src/
├── main.tsx                        ← React entry point
├── App.tsx                         ← Router setup + route definitions
├── index.css                       ← Tailwind + global CSS variables
│
├── api/                            ← API client layer (fetch wrappers)
│   ├── client.ts                   ← apiFetch(), API_BASE, AuthError
│   ├── events.ts                   ← fetchPublicEvents, fetchPublicEventById, getCoverUrl
│   ├── organizer.ts                ← organizer + event CRUD functions
│   ├── user.ts                     ← fetchUser, updateUser
│   ├── sysadmin.ts                 ← fetchEventTypes, payment methods, users, organizers
│   └── admin.ts                    ← fetchAdminEvents, approveEvent, rejectEvent
│
├── page/                           ← Page components (1 ไฟล์ = 1 หน้า)
│   ├── index.ts                    ← Barrel exports ทุก page
│   ├── home.tsx                    ← หน้าแรก (event grid)
│   ├── event_detail.tsx            ← รายละเอียด event สาธารณะ
│   ├── signin.tsx                  ← เข้าสู่ระบบ
│   ├── signup.tsx                  ← สมัครสมาชิก
│   ├── otp.tsx                     ← ยืนยัน OTP
│   ├── my_tickets.tsx              ← ตั๋วของฉัน
│   ├── profiles.tsx                ← Profile + Organizer management
│   ├── dashboard.tsx               ← Organizer Dashboard (stats)
│   ├── event.tsx                   ← รายชื่อ events ของ organizer
│   ├── event_edit.tsx              ← แก้ไข event
│   ├── create_event.tsx            ← สร้าง event ใหม่
│   ├── organizer_settings.tsx      ← ตั้งค่า organizer
│   └── admin.tsx                   ← Admin Panel (approve/reject + system management)
│
├── components/
│   ├── shared/                     ← Reusable components (ใช้ข้ามหน้า)
│   │   ├── index.ts
│   │   ├── LeafletMapPicker.tsx    ← Interactive map พร้อม search + locate
│   │   └── ImageUploadZone.tsx     ← Drag-and-drop image upload + reorder
│   │
│   ├── home/                       ← Components เฉพาะหน้า Home
│   │   ├── index.ts
│   │   ├── HeroSection.tsx
│   │   ├── SearchBar.tsx
│   │   ├── EventGrid.tsx
│   │   └── EventCard.tsx           ← Card + link ไปหน้า event detail
│   │
│   ├── navigater/                  ← Navigation components
│   │   ├── index.ts
│   │   ├── Navbar.tsx
│   │   ├── NavbarBrand.tsx
│   │   ├── NavbarNav.tsx
│   │   ├── NavbarActions.tsx       ← Auth state + role-based links
│   │   ├── Footer.tsx
│   │   └── sidebar/
│   │       ├── Sidebar.tsx
│   │       ├── SidebarNav.tsx
│   │       ├── SidebarOrganizerPicker.tsx
│   │       ├── SidebarOrganizerItem.tsx
│   │       ├── SidebarFooter.tsx
│   │       ├── useSidebarOrganizers.ts
│   │       └── types.ts
│   │
│   ├── layout/
│   │   └── ProfileLayout.tsx       ← Layout สำหรับหน้า /profile/* (Sidebar + Outlet)
│   │
│   ├── organizer/
│   │   └── CreateOrganizerModal.tsx
│   │
│   └── my-tickets/
│       ├── index.ts
│       ├── TicketCard.tsx
│       ├── TicketList.tsx
│       ├── TicketListHeader.tsx
│       └── StatusBadge.tsx
│
├── hooks/
│   ├── useLeaflet.ts               ← โหลด Leaflet จาก CDN แบบ lazy
│   └── useTheme.ts
│
└── data/                           ← Mock/static data (สำหรับ dev)
    ├── events.ts
    └── tickets.ts
```

---

### Pages & Routes

| Route | Component | Auth | คำอธิบาย |
|-------|-----------|------|-----------|
| `/` | `Home` | ❌ | หน้าแรก แสดง events ที่ approved |
| `/events/:id` | `EventDetail` | ❌ | รายละเอียด event พร้อม gallery + map |
| `/signin` | `Signin` | ❌ | เข้าสู่ระบบ |
| `/signup` | `SignUp` | ❌ | สมัครสมาชิก |
| `/otp` | `Otp` | ❌ | ยืนยัน OTP (6 หลัก, หมดอายุ 5 นาที) |
| `/my-tickets` | `MyTickets` | ✅ | ตั๋วของฉัน |
| `/admin` | `AdminPage` | ✅ admin | Admin Dashboard + System Dashboard |
| `/profile` | `ProfileLayout` | ✅ | Layout wrapper (redirect → /profile/account) |
| `/profile/account` | `Profiles` | ✅ | แก้ไข profile + organizer list |
| `/profile/dashboard/:id` | `Dashboards` | ✅ | สถิติ organizer |
| `/profile/events/:id` | `Event` | ✅ | รายชื่อ events ของ organizer |
| `/profile/events/:id/create` | `CreateEvent` | ✅ | สร้าง event ใหม่ |
| `/profile/events/:id/edit/:eventId` | `EventEdit` | ✅ | แก้ไข event |
| `/profile/organizer/:id` | `OrganizerSettings` | ✅ | ตั้งค่า organizer |

---

### Components

#### `components/shared/`
Component ที่ใช้ซ้ำได้ข้ามหน้า

| Component | Props หลัก | หน้าที่ใช้ |
|-----------|-----------|-----------|
| `LeafletMapPicker` | `lat`, `lng`, `onChange`, `onPlaceName?`, `height?` | `create_event`, `event_edit` |
| `ImageUploadZone` | `label`, `multiple?`, `files`, `onChange` | `create_event`, `event_edit` |

#### `components/navigater/`
- **Navbar** — แสดงตลอด (ยกเว้นหน้า profile ที่มี sidebar)
- **NavbarActions** — ปุ่ม sign in/out, ลิงก์ Admin (เฉพาะ admin/sysadmin)
- **Sidebar** — แสดงใน `/profile/*` พร้อม organizer picker

---

### API Layer

ทุก API call ผ่าน `apiFetch()` ใน `api/client.ts`

```ts
// ตัวอย่าง pattern
apiFetch<ResponseType>("/path", {
  method: "POST",
  token: Cookies.get("authToken"),   // optional
  body: JSON.stringify(payload),      // หรือ FormData
})
```

| ไฟล์ | ครอบคลุม |
|------|---------|
| `client.ts` | base fetch, error handling, 401 → redirect to /signin |
| `events.ts` | public events, event detail, getCoverUrl helper |
| `organizer.ts` | organizer CRUD, event CRUD, getLogoUrl helper |
| `user.ts` | profile fetch/update |
| `sysadmin.ts` | event types (public), payment methods, users, organizers |
| `admin.ts` | admin event list/detail, approve/reject |

---

## User Roles

| Role | สิทธิ์ |
|------|--------|
| `customer` | ดู events สาธารณะ, ซื้อตั๋ว (coming soon) |
| `organizer` | สร้าง/จัดการ event ของตัวเอง (derived จาก organizer ownership) |
| `admin` | ดู + อนุมัติ/ปฏิเสธ events ทั้งหมด |
| `sysadmin` | ทุกอย่างของ admin + จัดการ event types, payment methods, users, organizers |

> **หมายเหตุ:** role `organizer` ไม่ได้เก็บในตาราง users แต่ถูก derive ในขณะ login โดยตรวจว่า user นั้นเป็น owner ของ organizer ใดหรือไม่

---

## การทำงานของระบบหลัก

### Signup Flow
```
1. User กรอก form → POST /email/sendotp { email }
2. Backend สร้าง OTP 6 หลัก → เก็บใน memory (TTL 5 นาที) → ส่ง email
3. User กรอก OTP → POST /email/verifyotp
4. ถ้าถูก → POST /auth/signup (บันทึก account)
5. Redirect → /signin
```

### Event Creation Flow
```
1. Organizer กด "สร้าง Event" → /profile/events/:id/create
2. กรอก form (ดึง event types จาก GET /events/types)
3. POST /organizer/:id/events (multipart/form-data)
4. Event ถูกสร้างด้วย status = "pending"
5. Admin เห็นใน /admin → PATCH /admin/events/:id/approve หรือ reject
6. Email แจ้งผลส่งไปหา organizer owner อัตโนมัติ
7. Event ที่ approved + is_active=1 จะแสดงบนหน้า Home
```

### Auth Token Flow
```
- Login → ได้ JWT → เก็บใน js-cookie ("authToken")
- ทุก request ที่ต้อง auth ส่ง: Authorization: Bearer <token>
- 401 response → auto clear cookie + redirect /signin
- User data เก็บใน localStorage ("user") เพื่อ role-based UI
```
