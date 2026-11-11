import { prisma } from '../../db/prisma';

export class AnalyticsService {
  static async getOwnerDashboard(ownerId: string) {
    // 1. Venues owned
    const venues = await prisma.venue.findMany({
      where: { ownerId },
      include: {
        pitches: { select: { id: true, name: true, type: true } },
      },
    });

    const venueIds = venues.map((v) => v.id);
    const pitchIds = venues.flatMap((v) => v.pitches.map((p) => p.id));

    // 2. Bookings stats
    const [totalBookings, upcomingBookings, completedBookings, cancelledBookings] =
      await Promise.all([
        prisma.booking.count({ where: { venueId: { in: venueIds } } }),
        prisma.booking.count({ where: { venueId: { in: venueIds }, status: 'UPCOMING' } }),
        prisma.booking.count({ where: { venueId: { in: venueIds }, status: 'COMPLETED' } }),
        prisma.booking.count({ where: { venueId: { in: venueIds }, status: 'CANCELLED' } }),
      ]);

    // 3. Revenue calculation (paid bookings)
    const paidBookings = await prisma.booking.aggregate({
      where: {
        venueId: { in: venueIds },
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
      },
      _sum: {
        pitchPrice: true,
        totalAmount: true,
      },
    });

    const totalRevenue = paidBookings._sum.pitchPrice || 0;

    // 4. Subscription quota
    const subscription = await prisma.subscription.findUnique({
      where: { ownerId },
      include: { plan: true },
    });

    const maxAllowed = subscription
      ? (subscription.maxVenuesOverride ?? subscription.plan.maxVenues)
      : 0;

    return {
      summary: {
        totalVenues: venues.length,
        maxVenuesAllowed: maxAllowed,
        remainingVenuesQuota: Math.max(0, maxAllowed - venues.length),
        totalPitches: pitchIds.length,
        totalRevenueEgp: totalRevenue,
      },
      bookings: {
        total: totalBookings,
        upcoming: upcomingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      venuesList: venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        area: v.area,
        rating: v.rating,
        reviewCount: v.reviewCount,
        pitchesCount: v.pitches.length,
      })),
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            planSlug: subscription.plan.slug,
            status: subscription.status,
            expiresAt: subscription.expiresAt,
          }
        : null,
    };
  }

  static async getAdminDashboard() {
    // 1. Users Breakdown
    const [totalUsers, playersCount, ownersCount, adminsCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'VENUE_OWNER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    // 2. Venues & Pitches
    const [totalVenues, totalPitches] = await Promise.all([
      prisma.venue.count(),
      prisma.pitch.count(),
    ]);

    // 3. Platform Bookings & Financials
    const [totalBookings, revenueAggregate, totalTransactions] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalAmount: true, serviceFee: true },
      }),
      prisma.paymentTransaction.count({ where: { status: 'SUCCESS' } }),
    ]);

    // 4. Subscriptions MRR Estimate
    const activeSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const estimatedMonthlyRecurringRevenue = activeSubs.reduce(
      (sum, sub) => sum + sub.plan.price,
      0
    );

    // 5. City Distribution
    const cityAggregates = await prisma.venue.groupBy({
      by: ['city'],
      _count: { id: true },
    });

    return {
      users: {
        total: totalUsers,
        players: playersCount,
        venueOwners: ownersCount,
        admins: adminsCount,
      },
      infrastructure: {
        totalVenues,
        totalPitches,
        citiesDistribution: cityAggregates.map((c) => ({
          city: c.city,
          venuesCount: c._count.id,
        })),
      },
      platformFinancials: {
        totalBookings,
        successfulTransactions: totalTransactions,
        totalGrossVolumeEgp: revenueAggregate._sum.totalAmount || 0,
        totalPlatformCommissionEgp: revenueAggregate._sum.serviceFee || 0,
        activeSubscriptionsCount: activeSubs.length,
        estimatedMrrEgp: estimatedMonthlyRecurringRevenue,
      },
    };
  }
}
