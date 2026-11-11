import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء تغذية قاعدة البيانات ببيانات واقعية لمشروع PlayBook...');

  // Clean existing data in reverse order of dependencies
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.blockedSlot.deleteMany({});
  await prisma.pitch.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 تم تنظيف البيانات القديمة بنجاح.');

  // 1. Seed Plans (Four SaaS subscription tiers for owners)
  const basicPlan = await prisma.plan.create({
    data: {
      name: 'الباقة الأساسية (Basic)',
      slug: 'basic',
      description: 'مثالية لأصحاب الملاعب الفردية والمشاريع الناشئة الراغبين في إدارة ملعب واحد بسلاسة.',
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
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'الباقة المتقدمة (Pro)',
      slug: 'pro',
      description: 'الخيار الأكثر شعبية لأصحاب المجمعات الرياضية المتعددة حتى 3 مجمعات ملاعب.',
      price: 899.0,
      billingPeriod: 'monthly',
      maxVenues: 3,
      features: JSON.stringify([
        'إدارة حتى 3 مجمعات ملاعب (3 Venues)',
        'محرك التسعير الديناميكي (ساعات الذروة والعطلات)',
        'حظر المواعيد التلقائي للصيانة وتدريب الأكاديميات',
        'تحصيل الدفع عبر إنستاباي وفودافون كاش',
        'تقارير مالية تفصيلية ومقارنة الفروع',
        'شارة مجمع موثق (Verified Badge)',
        'دعم فني مخصص على مدار الساعة',
      ]),
      isActive: true,
    },
  });

  const businessPlan = await prisma.plan.create({
    data: {
      name: 'باقة الأعمال (Business)',
      slug: 'business',
      description: 'لأصحاب السلاسل الرياضية التي تمتلك حتى 5 فروع أو أندية رياضية.',
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
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'باقة المؤسسات (Enterprise)',
      slug: 'enterprise',
      description: 'حلول مخصصة للمؤسسات الكبرى وسلاسل الأندية التي تمتلك حتى 10 مجمعات.',
      price: 2499.0,
      billingPeriod: 'monthly',
      maxVenues: 10,
      features: JSON.stringify([
        'إدارة حتى 10 مجمعات ملاعب أو أندية كاملة',
        'واجهة برمجة تطبيقات API للربط مع أنظمة ERP',
        'تسويق وترويج مميز عبر منصة PlayBook وشبكات التواصل',
        'أولوية مطلقة في الظهور بقوائم الملاعب المقترحة',
        'عقد سنوي ودعم مباشر وخدمة عملاء VIP',
      ]),
      isActive: true,
    },
  });

  console.log('✅ تم إنشاء باقات الاشتراك الأربع (Basic, Pro, Business, Enterprise).');

  // 2. Seed Users
  const userPasswordHash = await bcrypt.hash('demo123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);

  // Player User
  const player = await prisma.user.create({
    data: {
      name: 'خالد مسعد',
      email: 'khaled@playbook.eg',
      phone: '01011112233',
      passwordHash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      city: 'المنصورة',
      preferredPitchType: '5-a-side',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    },
  });

  // Venue Owner 1 (Pro Plan)
  const ownerPro = await prisma.user.create({
    data: {
      name: 'كابتن طارق السعيد',
      email: 'tarek@champions-arena.com',
      phone: '01122223344',
      passwordHash: userPasswordHash,
      role: 'VENUE_OWNER',
      status: 'ACTIVE',
      city: 'المنصورة',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    },
  });

  // Venue Owner 2 (Basic Plan)
  const ownerBasic = await prisma.user.create({
    data: {
      name: 'حسان عبد الفتاح',
      email: 'hassan@cairo-arena.com',
      phone: '01233334455',
      passwordHash: userPasswordHash,
      role: 'VENUE_OWNER',
      status: 'ACTIVE',
      city: 'القاهرة',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    },
  });

  // Platform Admin
  const admin = await prisma.user.create({
    data: {
      name: 'عمر عادل',
      email: 'admin@playbook.eg',
      phone: '01099998877',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      city: 'القاهرة',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
  });

  console.log('✅ تم إنشاء المستخدمين التجريبيين (لاعب، مالكين، أدمن).');

  // 3. Assign Subscriptions to Owners
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  await prisma.subscription.create({
    data: {
      ownerId: ownerPro.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: oneYearLater,
    },
  });

  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  await prisma.subscription.create({
    data: {
      ownerId: ownerBasic.id,
      planId: basicPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: sixMonthsLater,
    },
  });

  console.log('✅ تم ربط اشتراكات الملاك بالباقات المناسبة.');

  // 4. Seed Venues
  // Venue 1: Champions Arena Mansoura (Owner: Captain Tarek)
  const venueMansoura = await prisma.venue.create({
    data: {
      name: 'مجمع ملاعب الأبطال - المنصورة',
      slug: 'champions-arena-mansoura',
      tagline: 'أكبر وأحدث مجمع ملاعب كرة قدم على النيل بالدقهلية',
      description: 'مجمع ملاعب رياضية متكامل يضم ملاعب خماسية وسباعية مجهزة بأحدث أنواع النجيل الصناعي 5G المعترف به من الفيفا، مع إضاءة ليلية عالية الجودة وكافيه مكيف وخدمات متكاملة للاعبين.',
      ownerId: ownerPro.id,
      city: 'المنصورة',
      area: 'المشاية السفلية',
      address: 'شارع المشاية السفلية، أمام نادي جزيرة الورد وجامعة المنصورة، الدقهلية',
      latitude: 31.0409,
      longitude: 31.3785,
      rating: 4.9,
      reviewCount: 38,
      phone: '01122223344',
      whatsapp: '01122223344',
      verified: true,
      featured: true,
      popular: true,
      minPricePerHour: 250.0,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      ]),
      facilities: JSON.stringify([
        'غرف تبديل ملابس وحمامات ساخنة',
        'كافيه واستراحة مكيفة بشاشات عملاقة',
        'موقف سيارات مجاني واسع',
        'إضاءة ليد احترافية خالية من الظلال',
        'مياه شرب ومشروبات طاقة',
        'إسعافات أولية وطبيب ملاعب عند الطلب',
        'تأجير أحذية وكرات وكوفرات فرق',
      ]),
      openingHours: JSON.stringify({ open: '09:00', close: '02:00' }),
      status: 'ACTIVE',
    },
  });

  // Venue 2: Cairo Arena New Cairo (Owner: Hassan Abdelfattah)
  const venueCairo = await prisma.venue.create({
    data: {
      name: 'كايرو أرينا - التجمع الخامس',
      slug: 'cairo-arena-new-cairo',
      tagline: 'تجربة كرة قدم احترافية في قلب القاهرة الجديدة',
      description: 'مجمع رياضي فخم بمستوى عالمي، أرضيات نجيل طبيعي وصناعي هجين، صالات VIP، تدريب أكاديميات كروية ومسابقات أسبوعية بمكافآت قيّمة.',
      ownerId: ownerBasic.id,
      city: 'القاهرة',
      area: 'التجمع الخامس',
      address: 'شارع التسعين الجنوبي، بجوار مول الداون تاون والجامعة الأمريكية، القاهرة الجديدة',
      latitude: 30.0131,
      longitude: 31.4394,
      rating: 4.8,
      reviewCount: 45,
      phone: '01233334455',
      whatsapp: '01233334455',
      verified: true,
      featured: true,
      popular: true,
      minPricePerHour: 300.0,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
      ]),
      facilities: JSON.stringify([
        'استراحة كبار الشخصيات VIP Lounge',
        'كافيه ومطعم وجبات خفيفة وصحية',
        'خزائن إلكترونية مؤمنة للأمانات',
        'تصوير فوتوغرافي وفيديو بالدرون للمباريات',
        'تحكيم احترافي عند الطلب',
        'موقف سيارات مظلل',
      ]),
      openingHours: JSON.stringify({ open: '08:00', close: '03:00' }),
      status: 'ACTIVE',
    },
  });

  // Venue 3: Smouha Stars Arena (Owner: Captain Tarek - Second venue on Pro Plan)
  const venueAlex = await prisma.venue.create({
    data: {
      name: 'مجمع نجوم سموحة - الإسكندرية',
      slug: 'smouha-stars-arena-alexandria',
      tagline: 'أرقى ملاعب كرة القدم بالعروس الساحلية',
      description: 'يقع في قلب سموحة بموقع استراتيجي وسهل الوصول، ملاعب خماسية ذات جودة فائقة وصيانة يومية لأفضل راحة وأمان لمفاصل اللاعبين.',
      ownerId: ownerPro.id,
      city: 'الإسكندرية',
      area: 'سموحة',
      address: 'شارع فيكتور عمانويل، بالقرب من نادي سموحة، الإسكندرية',
      latitude: 31.2156,
      longitude: 29.9553,
      rating: 4.7,
      reviewCount: 22,
      phone: '01122223344',
      whatsapp: '01122223344',
      verified: true,
      featured: false,
      popular: true,
      minPricePerHour: 280.0,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=1200&q=80',
      ]),
      facilities: JSON.stringify([
        'غرف ملابس واستحمام',
        'كافتيريا ومشروبات ساخنة وباردة',
        'شاشات عرض لمباريات الدوري والبطولات الأوروبية',
        'مظلات ومقاعد مريحة للجمهور والاحتياط',
      ]),
      openingHours: JSON.stringify({ open: '10:00', close: '02:00' }),
      status: 'ACTIVE',
    },
  });

  console.log('✅ تم إنشاء 3 مجمعات ملاعب واقعية في (المنصورة، القاهرة، الإسكندرية).');

  // 5. Seed Pitches
  // Mansoura Pitches
  const pitchMansouraA = await prisma.pitch.create({
    data: {
      venueId: venueMansoura.id,
      name: 'ملعب الأبطال A (الملعب الرئيسي)',
      type: '5-a-side',
      turfType: 'Artificial Grass 5G',
      isIndoor: false,
      hasNightLighting: true,
      capacity: 10,
      basePricePerHour: 250.0,
      peakPricePerHour: 320.0,
      weekendPricePerHour: 350.0,
      isActive: true,
      features: JSON.stringify(['نجيل تركي مستورد 5G', 'مرمى ألمنيوم معتمد', 'شباك احترافية']),
    },
  });

  const pitchMansouraB = await prisma.pitch.create({
    data: {
      venueId: venueMansoura.id,
      name: 'ملعب الأبطال الدولي B (سباعي)',
      type: '7-a-side',
      turfType: 'Artificial Grass 5G',
      isIndoor: false,
      hasNightLighting: true,
      capacity: 14,
      basePricePerHour: 450.0,
      peakPricePerHour: 550.0,
      weekendPricePerHour: 600.0,
      isActive: true,
      features: JSON.stringify(['مساحة قانونية للسباعي', 'خطوط واضحة', 'إضاءة ملاعب دولية']),
    },
  });

  // Cairo Pitches
  const pitchCairoA = await prisma.pitch.create({
    data: {
      venueId: venueCairo.id,
      name: 'أرينا 1 الخماسي الملكي',
      type: '5-a-side',
      turfType: 'Hybrid',
      isIndoor: false,
      hasNightLighting: true,
      capacity: 10,
      basePricePerHour: 300.0,
      peakPricePerHour: 400.0,
      weekendPricePerHour: 450.0,
      isActive: true,
      features: JSON.stringify(['نجيل هجين عالي الامتصاص للصدمات', 'حواجز حماية مبطنة', 'لوحة نتائج إلكترونية']),
    },
  });

  const pitchCairoB = await prisma.pitch.create({
    data: {
      venueId: venueCairo.id,
      name: 'أرينا 2 السباعي الذهبي',
      type: '7-a-side',
      turfType: 'Artificial Grass 5G',
      isIndoor: false,
      hasNightLighting: true,
      capacity: 14,
      basePricePerHour: 500.0,
      peakPricePerHour: 650.0,
      weekendPricePerHour: 700.0,
      isActive: true,
      features: JSON.stringify(['مدرج صغير للجماهير', 'كاميرات لتسجيل الأهداف', 'مساحة إحماء جانبية']),
    },
  });

  // Alex Pitch
  const pitchAlexA = await prisma.pitch.create({
    data: {
      venueId: venueAlex.id,
      name: 'ملعب سموحة الساحلي',
      type: '5-a-side',
      turfType: 'Artificial Grass 5G',
      isIndoor: false,
      hasNightLighting: true,
      capacity: 10,
      basePricePerHour: 280.0,
      peakPricePerHour: 350.0,
      weekendPricePerHour: 380.0,
      isActive: true,
      features: JSON.stringify(['نجيل صناعي كثيف عالي الجودة', 'سياج أمان مرتفع']),
    },
  });

  console.log('✅ تم إنشاء الملاعب الفرعية الخماسية والسباعية مع تسعير الذروة والعطلات.');

  // 6. Seed Sample Bookings
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatYMD(tomorrow);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);

  // Booking 1: Upcoming tomorrow for Khaled
  const lockKeyTomorrow = `${pitchMansouraA.id}_${tomorrowStr}_20:00`;
  const bookingUpcoming = await prisma.booking.create({
    data: {
      bookingReference: 'PB-942101-5582',
      slotLockKey: lockKeyTomorrow,
      userId: player.id,
      venueId: venueMansoura.id,
      pitchId: pitchMansouraA.id,
      pitchName: pitchMansouraA.name,
      pitchType: pitchMansouraA.type,
      venueName: venueMansoura.name,
      venueCity: venueMansoura.city,
      venueAddress: venueMansoura.address,
      venueImage: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
      userName: player.name,
      userPhone: player.phone,
      date: tomorrowStr,
      startTime: '20:00',
      endTime: '21:00',
      displayTime: '08:00 PM - 09:00 PM',
      durationHours: 1.0,
      pitchPrice: 320.0,
      serviceFee: 15.0,
      totalAmount: 335.0,
      paymentMethod: 'INSTAPAY',
      paymentStatus: 'PAID',
      status: 'UPCOMING',
      notes: 'مباراة أسبوعية مع الأصدقاء، يرجى تجهيز كرة مقاس 5',
    },
  });

  // Payment Transaction for Upcoming Booking
  await prisma.paymentTransaction.create({
    data: {
      bookingId: bookingUpcoming.id,
      userId: player.id,
      amount: 335.0,
      currency: 'EGP',
      paymentMethod: 'INSTAPAY',
      provider: 'InstaPay Egypt',
      transactionReference: 'TX-PB-942101-5582',
      status: 'SUCCESS',
      gatewayResponse: JSON.stringify({
        account: 'playbook@instapay',
        receiptNumber: 'IPN-202611-998822',
        paidAt: new Date().toISOString(),
      }),
    },
  });

  // Booking 2: Completed yesterday for Khaled (with verified review)
  const lockKeyYesterday = `${pitchMansouraA.id}_${yesterdayStr}_19:00`;
  const bookingCompleted = await prisma.booking.create({
    data: {
      bookingReference: 'PB-831902-1249',
      slotLockKey: lockKeyYesterday,
      userId: player.id,
      venueId: venueMansoura.id,
      pitchId: pitchMansouraA.id,
      pitchName: pitchMansouraA.name,
      pitchType: pitchMansouraA.type,
      venueName: venueMansoura.name,
      venueCity: venueMansoura.city,
      venueAddress: venueMansoura.address,
      venueImage: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
      userName: player.name,
      userPhone: player.phone,
      date: yesterdayStr,
      startTime: '19:00',
      endTime: '20:00',
      displayTime: '07:00 PM - 08:00 PM',
      durationHours: 1.0,
      pitchPrice: 320.0,
      serviceFee: 15.0,
      totalAmount: 335.0,
      paymentMethod: 'VODAFONE_CASH',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      hasReviewed: true,
      notes: 'حجز مؤكد',
    },
  });

  // 7. Seed Review with Owner Reply
  await prisma.review.create({
    data: {
      venueId: venueMansoura.id,
      bookingId: bookingCompleted.id,
      userId: player.id,
      userName: player.name,
      userAvatar: player.avatar,
      rating: 5.0,
      pitchQuality: 5.0,
      cleanliness: 5.0,
      staff: 5.0,
      lighting: 4.8,
      comment: 'أفضل ملعب في المنصورة بدون مبالغة! النجيل بحالة ممتازة ومريح جداً، والإضاءة ممتازة، والمعاملة من كابتن طارق وفريق العمل في قمة الذوق والاحترام.',
      ownerReplyComment: 'تسلم يا كابتن خالد، شهادة نعتز بيها جداً ومستنيينك دايماً تنورنا في أي وقت في مجمع الأبطال!',
      ownerReplyDate: new Date(),
      status: 'APPROVED',
      verifiedBooking: true,
    },
  });

  // 8. Seed BlockedSlot (e.g. pitch maintenance slot)
  const maintenanceDate = new Date(today);
  maintenanceDate.setDate(maintenanceDate.getDate() + 3);
  const maintenanceDateStr = formatYMD(maintenanceDate);

  await prisma.blockedSlot.create({
    data: {
      venueId: venueMansoura.id,
      pitchId: pitchMansouraA.id,
      date: maintenanceDateStr,
      time: '14:00',
      reason: 'صيانة وتنعيم النجيل الصناعي الدورية',
      blockedBy: ownerPro.id,
    },
  });

  // 9. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: player.id,
        type: 'BOOKING_CONFIRMED',
        title: 'تم تأكيد حجزك في مجمع الأبطال',
        message: `تم تأكيد حجزك رقم PB-942101-5582 ليوم غد الساعة 08:00 PM. نتمنى لك مباراة ممتعة!`,
        read: false,
      },
      {
        userId: ownerPro.id,
        type: 'NEW_BOOKING_ALERT',
        title: 'حجز جديد لملعب الأبطال A',
        message: 'قام اللاعب خالد مسعد بسداد وحجز الساعة 08:00 PM عبر إنستاباي.',
        read: true,
      },
      {
        userId: ownerPro.id,
        type: 'NEW_REVIEW_RECEIVED',
        title: 'تقييم جديد 5 نجوم!',
        message: 'أضاف الكابتن خالد مسعد تقييماً 5 نجوم لمجمع الأبطال بالمنصورة.',
        read: true,
      },
    ],
  });

  // 10. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SYSTEM_SEED_INITIALIZATION',
        entity: 'System',
        entityId: 'SEED-001',
        details: JSON.stringify({ status: 'SUCCESS', target: 'Egypt Venues & Subscriptions' }),
      },
      {
        userId: ownerPro.id,
        action: 'SUBSCRIBE_PRO_PLAN',
        entity: 'Subscription',
        entityId: proPlan.id,
        details: JSON.stringify({ plan: 'Pro', maxVenues: 3, price: 899 }),
      },
      {
        userId: player.id,
        action: 'CREATE_BOOKING',
        entity: 'Booking',
        entityId: bookingUpcoming.id,
        details: JSON.stringify({ reference: 'PB-942101-5582', totalAmount: 335 }),
      },
    ],
  });

  console.log('✅ تم إنشاء الحجوزات والمعاملات والتقييمات وفترات الصيانة وسجلات الرقابة.');
  console.log('🎉 اكتملت عملية تغذية قاعدة البيانات بنجاح تام وبأعلى درجات الواقعية!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء تنفيذ سكريبت seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

