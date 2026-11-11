import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 جاري تصفير قاعدة البيانات بالكامل...');

  // 1. Delete all operational data
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.blockedSlot.deleteMany({});
  await prisma.pitch.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ تم مسح جميع الملاعب والحجوزات والمستخدمين الوهميين.');

  // 2. Seed Plans
  await prisma.plan.deleteMany({});
  await prisma.plan.createMany({
    data: [
      {
        id: 'plan_basic',
        name: 'الباقة الأساسية (Basic)',
        slug: 'basic',
        description: 'لأصحاب الملاعب الفردية لإدارة ملعب واحد وحجوزاته.',
        price: 399.0,
        billingPeriod: 'monthly',
        maxVenues: 1,
        features: JSON.stringify([
          'إدارة مجمع ملاعب واحد (1 Venue)',
          'جدول مواعيد وحجوزات أونلاين مباشر',
          'تأكيد الحجوزات عبر الرسائل والإشعارات',
          'لوحة تحكم مبسطة لإحصائيات الإيرادات',
          'دعم فني عبر الواتساب',
        ]),
        isActive: true,
      },
      {
        id: 'plan_pro',
        name: 'الباقة المتقدمة (Pro)',
        slug: 'pro',
        description: 'الباقة الأكثر طلباً للمجمعات الرياضية حتى 3 مجمعات.',
        price: 899.0,
        billingPeriod: 'monthly',
        maxVenues: 3,
        features: JSON.stringify([
          'إدارة حتى 3 مجمعات ملاعب (3 Venues)',
          'محرك التسعير الديناميكي (ساعات الذروة والعطلات)',
          'حظر المواعيد التلقائي للصيانة والتدريب',
          'تحصيل الدفع عبر إنستاباي وفودافون كاش',
          'تقارير مالية تفصيلية ومقارنة الفروع',
          'شارة مجمع موثق (Verified Badge)',
          'دعم فني مخصص على مدار الساعة',
        ]),
        isActive: true,
      },
      {
        id: 'plan_business',
        name: 'باقة الأعمال (Business)',
        slug: 'business',
        description: 'لسلاسل الملاعب والأكاديميات الرياضية الكبرى حتى 5 مجمعات.',
        price: 1399.0,
        billingPeriod: 'monthly',
        maxVenues: 5,
        features: JSON.stringify([
          'إدارة حتى 5 مجمعات ملاعب (5 Venues)',
          'ربط كامل ببوابات الدفع الإلكترونية',
          'حسابات متعددة للموظفين ومديري الفروع',
          'إعلانات مميزة وتصدر نتائج البحث في المحافظة',
          'سجل رقابي متكامل لجميع العمليات والتحصيلات',
          'مدير حساب خاص لمتابعة المبيعات',
        ]),
        isActive: true,
      },
      {
        id: 'plan_enterprise',
        name: 'باقة المؤسسات (Enterprise)',
        slug: 'enterprise',
        description: 'للأندية والاتحادات والمشاريع الرياضية الضخمة حتى 10 مجمعات.',
        price: 2499.0,
        billingPeriod: 'monthly',
        maxVenues: 10,
        features: JSON.stringify([
          'إدارة حتى 10 مجمعات ملاعب أو أندية كاملة',
          'واجهة برمجة تطبيقات API للربط مع أنظمة ERP',
          'تسويق وترويج مميز عبر المنصة وشبكات التواصل',
          'أولوية مطلقة في الظهور بقوائم الملاعب المقترحة',
          'عقد سنوي ودعم مباشر وخدمة عملاء VIP',
        ]),
        isActive: true,
      },
    ],
  });

  // 3. Create Admin Users
  const passwordHash = await bcrypt.hash('demo123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);

  // Khaled as ADMIN with full privileges
  const khaled = await prisma.user.create({
    data: {
      id: 'usr_khaled_main',
      name: 'خالد مسعد',
      email: 'khaled@playbook.eg',
      phone: '01011112233',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      city: 'المنصورة',
    },
  });

  // Attach an active Enterprise subscription to Khaled so he can add any number of venues freely
  await prisma.subscription.create({
    data: {
      ownerId: khaled.id,
      planId: 'plan_enterprise',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      maxVenuesOverride: 50,
    },
  });

  // General Admin account
  await prisma.user.create({
    data: {
      id: 'usr_admin_master',
      name: 'مدير المنصة العام',
      email: 'admin@playbook.eg',
      phone: '01099998888',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      city: 'القاهرة',
    },
  });

  console.log('🎉 تم تصفير قاعدة البيانات بالكامل بنجاح!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
