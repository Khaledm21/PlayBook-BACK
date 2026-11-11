# ⚽ PlayBook Backend API - منصة حجز وإدارة ملاعب كرة القدم في مصر

مشروع باك إند متكامل واحترافي جاهز للإنتاج (**Production-Grade Modular REST API**) مبني من الصفر باستخدام **Node.js** و **TypeScript** و **Express.js** مع معمارية طبقية مقسمة حسب الموديولات (**Modular Layered Architecture**).

---

## 🛠️ الحزمة التقنية (Tech Stack)

- **بيئة التشغيل:** Node.js (v20+) مع TypeScript (بأعلى معايير الالتزام الصارم بالأنواع Strict Mode).
- **إطار العمل:** Express.js مع معالجات مسارات Typed بالكامل.
- **قاعدة البيانات والـ ORM:** Prisma ORM مع SQLite محلياً (`prisma/dev.db`) وسهولة التبديل لـ PostgreSQL للإنتاج.
- **التحقق من البيانات (Validation):** مكتبة Zod لفحص الـ Body والـ Query والـ Params عبر Middleware مركزي.
- **المصادقة والأمان (Auth & Security):**
  - توكنات JWT مزدوجة: Access Token (صلاحية 15 دقيقة) و Refresh Token (صلاحية 7 أيام مع جدول في قاعدة البيانات لإمكانية الإبطال).
  - تشفير كلمات المرور باستخدام `bcryptjs`.
  - ميدلوير صلاحيات مبني على الأدوار (Role-Based Access Control - RBAC) لأدوار: `USER`, `VENUE_OWNER`, `ADMIN`.
  - إعداد CORS ليسمح باتصال الفرونت إند على `http://localhost:5173` و `http://localhost:3000`.
- **رفع وتخزين الملفات:** مكتبة Multer لتخزين صور الملاعب والأفاتار محلياً في `uploads/` مع إتاحته كملفات ثابتة (Static).
- **المراقبة والتسجيل:** مكتبة Morgan لتسجيل طلبات الـ HTTP + مسار تشخيصي شامل لحالة النظام وقاعدة البيانات (`/api/health`).

---

## 🏗️ الهيكل الشجري للمشروع (Project Structure)

```text
├── prisma/
│   ├── schema.prisma          # نماذج الجداول والعلاقات والفهارس (12 نموذجاً)
│   ├── dev.db                 # ملف قاعدة بيانات SQLite المحلية
│   └── seed.ts                # سكريبت لتغذية قاعدة البيانات ببيانات واقعية مصرية
├── src/
│   ├── config/
│   │   └── env.ts             # قراءة وفحص متغيرات البيئة بـ Zod
│   ├── db/
│   │   └── prisma.ts          # عميل Prisma كـ Singleton
│   ├── middleware/
│   │   ├── auth.ts            # التحقق من الـ Token والصلاحيات (authenticateToken, requireRoles)
│   │   ├── errorHandler.ts    # معالج مركزي عام للأخطاء يرجع استجابة JSON موحدة
│   │   ├── validate.ts        # ميدلوير للتحقق التلقائي باستخدام Zod
│   │   └── upload.ts          # إعدادات Multer لحفظ الملفات وتحديد الامتدادات
│   ├── modules/               # 10 موديولات طبقية مستقلة
│   │   ├── auth/              # تسجيل الدخول، إنشاء الحساب، تجديد التوكن، /me
│   │   ├── users/             # إدارة الملف الشخصي وتغيير الصلاحيات والحالات
│   │   ├── venues/            # مجمعات الملاعب، المدن، ساعات العمل، المرافق، رفع الصور
│   │   ├── pitches/           # الملاعب الفرعية، نوع النجيل، المقاسات، والأسعار
│   │   ├── bookings/          # الحجوزات، فحص التوفر، حظر الصيانة، وقفل المواعيد
│   │   ├── payments/          # المعاملات المالية، طرق الدفع المصرية، ومحاكاة الدفع
│   │   ├── subscriptions/     # باقات اشتراك الملاك (B2B SaaS) وفحص حد الملاعب
│   │   ├── reviews/           # التقييمات والمراجعات وردود أصحاب الملاعب
│   │   ├── notifications/     # إشعارات النظام وتحديثات الحجز
│   │   └── audit_logs/        # سجل تتبع العمليات والرقابة (تاريخ، مستخدم، عملية، IP)
│   ├── types/
│   │   └── express.d.ts       # توسيع تعريفات Express Request
│   ├── utils/
│   │   ├── errors.ts          # أصناف الأخطاء المهيكلة (AppError, BadRequestError...)
│   │   └── response.ts        # منسق الاستجابات الموحد (sendSuccess, sendError)
│   ├── app.ts                 # تجهيز Express وإعدادات CORS و Morgan و Static Uploads
│   ├── routes.ts              # الـ Router الرئيسي الذي يجمع كل الموديولات تحت /api/*
│   └── server.ts              # بدء تشغيل السيرفر، مسار /api/health والإنهاء الآمن
├── uploads/                   # مجلد حفظ الصور والمرفقات (venues & avatars)
├── .env                       # متغيرات البيئة
├── .env.example
├── package.json
└── tsconfig.json
```

---

## ⚡ أهم قواعد العمل والمنطق الحسابي المنفذ

1. **منع الحجز المزدوج (Double-Booking & Concurrency Protection):**
   - تنفيذ عملية الحجز داخل معاملة ذرية `prisma.$transaction`.
   - قفل الموعد بواسطة مفتاح القفل الفريد: `slotLockKey = ${pitchId}_${date}_${startTime}`.
   - التحقق من جدول `BlockedSlot` للتأكد أن صاحب الملعب لم يحظر هذه الساعة للصيانة.
   - منع الحجز في التواريخ السابقة أو بعد أكثر من 30 يوماً.
2. **محرك فحص التوفر والأسعار (Live Availability & Dynamic Pricing):**
   - مسار `/api/bookings/availability` يحسب الساعات المتاحة لملعب معين في يوم محدد بدقة.
   - تحديد إن كانت الساعة ساعة ذروة (Peak: بعد الساعة 6 مساءً أو بعد منتصف الليل) أو عطلة أسبوعية (Weekend: الجمعة والسبت في مصر) وتطبيق السعر المناسب لكل ساعة.
3. **فحص حد باقة الاشتراك للمالك (Venue Quota Check):**
   - عند قيام المالك بإضافة مجمع ملاعب جديد (`POST /api/venues`)، يتحقق الـ Service من باقة المالك وسريان اشتراكه ومقارنة عدد ملاعبه الحالية بـ `maxVenues`. لو وصل للحد الأقصى يُرجع خطأ `403 Forbidden` برسالة واضحة بضرورة ترقية الباقة.
4. **سجل الرقابة (Audit Logging):**
   - تسجيل أي عملية حساسة (حجز، إلغاء حجز، تعديل باقة، تغيير حالة مستخدم) في جدول `AuditLog`.

---

## 👥 حسابات الدخول التجريبية (Demo Accounts)

جميع كلمات المرور للحسابات التجريبية هي `demo123456` (وللأدمن `admin123456`):

| الدور | الاسم | البريد الإلكتروني | كلمة المرور | الباقة / الصلاحية |
|---|---|---|---|---|
| **لاعب عادي (USER)** | خالد مسعد | `khaled@playbook.eg` | `demo123456` | حجز الملاعب وتقييمها |
| **مالك ملاعب (VENUE_OWNER)** | كابتن طارق السعيد | `tarek@champions-arena.com` | `demo123456` | باقة Pro (مجمع الأبطال بالمنصورة + مجمع سموحة) |
| **مالك ملاعب (VENUE_OWNER)** | حسان عبد الفتاح | `hassan@cairo-arena.com` | `demo123456` | باقة Basic (كايرو أرينا بالتجمع الخامس) |
| **أدمن المنصة (ADMIN)** | عمر عادل | `admin@playbook.eg` | `admin123456` | صلاحيات كاملة والرقابة |

---

## 🚀 تشغيل المشروع محلياً

```bash
# 1. تثبيت الحزم
npm install

# 2. مزامنة قاعدة بيانات SQLite مع المخطط
npm run prisma:push

# 3. تغذية قاعدة البيانات بالبيانات المصرية الواقعية
npm run seed

# 4. تشغيل السيرفر في وضع التطوير (مع مراقبة سريعة عبر tsx)
npm run dev

# 5. بناء المشروع للإنتاج
npm run build
npm start
```

---

## 📡 أهم نقاط النهاية للـ API (Endpoints Reference)

### 🩺 الفحص التشخيصي
- `GET /api/health` - فحص جاهزية الخادم وقاعدة البيانات والذاكرة.

### 🔐 المصادقة والحسابات (`/api/auth`)
- `POST /api/auth/register` - إنشاء حساب جديد (لاعب أو صاحب ملعب).
- `POST /api/auth/login` - تسجيل الدخول والحصول على Access و Refresh Token.
- `POST /api/auth/refresh-token` - تجديد الـ Access Token المنتهي.
- `POST /api/auth/logout` - تسجيل الخروج وإبطال الـ Refresh Token.
- `GET /api/auth/me` - استرجاع بيانات الحساب الحالي والاشتراك.

### 🏟️ مجمعات الملاعب (`/api/venues`)
- `GET /api/venues` - تصفح الملاعب مع الفلترة بالمدينة والمنطقة والأسعار والبحث.
- `GET /api/venues/:id` - تفاصيل المجمع والملاعب والمراجعات.
- `GET /api/venues/my` - ملاعب المالك الحالي.
- `POST /api/venues` - إضافة مجمع جديد (مع فحص كوتا باقة الاشتراك).
- `PUT /api/venues/:id` - تعديل بيانات المجمع.
- `DELETE /api/venues/:id` - حذف المجمع.
- `POST /api/venues/:id/images` - رفع صور إضافية للمجمع.

### ⚽ الملاعب الفرعية (`/api/pitches`)
- `GET /api/pitches/:id` - تفاصيل الملعب ومواصفات النجيل والأسعار.
- `GET /api/pitches/venue/:venueId` - ملاعب مجمع معين.
- `POST /api/pitches` - إضافة ملعب فرعي جديد (خماسي / سباعي).
- `PUT /api/pitches/:id` - تعديل بيانات الملعب والأسعار.
- `DELETE /api/pitches/:id` - حذف ملعب فرعي.

### 📅 الحجوزات ومحرك التوفر (`/api/bookings`)
- `GET /api/bookings/availability?pitchId=...&date=...` - الساعات المتاحة وأسعار الذروة والعطلات.
- `POST /api/bookings` - حجز موعد (محمي ضد الحجز المزدوج).
- `GET /api/bookings` - استعراض الحجوزات مع الفلترة.
- `GET /api/bookings/:id` - تفاصيل الحجز.
- `PATCH /api/bookings/:id/cancel` - إلغاء حجز وتحرير الموعد.
- `POST /api/bookings/block-slot` - حظر فترة زمنية للصيانة.
- `DELETE /api/bookings/block-slot/:id` - فك حظر الفترة.

### 💳 المدفوعات والمعاملات (`/api/payments`)
- `POST /api/payments/initiate` - تجهيز بيانات الدفع (InstaPay, Vodafone Cash, Cards).
- `POST /api/payments/verify-simulate` - محاكاة تأكيد الدفع وتحديث الحجز.
- `GET /api/payments/transactions` - سجل المعاملات المالية.

### 📦 باقات الاشتراكات للملاك (`/api/subscriptions`)
- `GET /api/subscriptions/plans` - استعراض باقات SaaS الأربع.
- `GET /api/subscriptions/my` - تفاصيل اشتراك المالك والحد المتبقي من الملاعب.
- `POST /api/subscriptions/subscribe` - ترقية أو تجديد باقة الاشتراك.

### ⭐ التقييمات والمراجعات (`/api/reviews`)
- `GET /api/reviews/venue/:venueId` - مراجعات الملعب.
- `POST /api/reviews` - كتابة تقييم لحجز مكتمل.
- `POST /api/reviews/:id/reply` - رد صاحب الملعب على التقييم.

### 🔔 الإشعارات (`/api/notifications`)
- `GET /api/notifications` - استعراض الإشعارات وعدد غير المقروء.
- `PATCH /api/notifications/:id/read` - تعيين إشعار كمقروء.
- `PATCH /api/notifications/read-all` - تعيين الكل كمقروء.

### 🛡️ سجل الرقابة (`/api/audit-logs`)
- `GET /api/audit-logs` - استعراض سجلات الرقابة (خاص بالأدمن ADMIN).

