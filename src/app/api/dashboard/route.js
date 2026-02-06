import { db } from '@/lib/db';
import { bookings, customers, users, crews, bookingServices, services } from '@/lib/db/schema';
import { eq, sql, gte, lte, and, desc, inArray } from 'drizzle-orm';

export async function GET(request) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [customerCount] = await db.select({ count: sql`count(*)` }).from(customers);
    const [staffCount] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.isActive, true));
    const [crewCount] = await db.select({ count: sql`count(*)` }).from(crews).where(eq(crews.isActive, true));
    
    const todayBookings = await db.select()
      .from(bookings)
      .where(eq(bookings.scheduledDate, today))
      .orderBy(bookings.startTime);
    
    const [monthlyRevenue] = await db.select({
      total: sql`COALESCE(SUM(total_amount), 0)`,
      count: sql`count(*)`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.scheduledDate, startOfMonth),
        lte(bookings.scheduledDate, endOfMonth)
      )
    );
    
    const [newBookingsTodayResult] = await db.select({ count: sql`count(*)` })
      .from(bookings)
      .where(sql`DATE(${bookings.createdAt}) = CURRENT_DATE`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const latestBookingsRaw = await db.select({
      booking: bookings,
      customer: customers,
      crew: crews,
      createdByUser: users,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(crews, eq(bookings.crewId, crews.id))
    .leftJoin(users, eq(bookings.createdBy, users.id))
    .where(gte(bookings.scheduledDate, thirtyDaysAgoStr))
    .orderBy(desc(bookings.scheduledDate))
    .limit(10);
    
    const bookingIds = latestBookingsRaw.map(b => b.booking.id);
    let servicesMap = {};
    if (bookingIds.length > 0) {
      const allServices = await db.select({
        bookingService: bookingServices,
        service: services,
      })
      .from(bookingServices)
      .leftJoin(services, eq(bookingServices.serviceId, services.id))
      .where(inArray(bookingServices.bookingId, bookingIds));
      
      allServices.forEach(s => {
        if (!servicesMap[s.bookingService.bookingId]) {
          servicesMap[s.bookingService.bookingId] = [];
        }
        servicesMap[s.bookingService.bookingId].push({
          ...s.bookingService,
          service: s.service,
        });
      });
    }
    
    const recentlyAddedCustomers = await db.select()
    .from(customers)
    .orderBy(desc(customers.createdAt), desc(customers.id))
    .limit(5);
    
    return Response.json({
      stats: {
        totalCustomers: parseInt(customerCount.count),
        activeStaff: parseInt(staffCount.count),
        activeCrews: parseInt(crewCount.count),
        todayBookings: todayBookings.length,
        newBookingsToday: parseInt(newBookingsTodayResult.count) || 0,
        monthlyRevenue: parseFloat(monthlyRevenue.total) || 0,
        monthlyBookings: parseInt(monthlyRevenue.count) || 0,
      },
      todayBookings,
      latestBookings: latestBookingsRaw.map(b => ({
        ...b.booking,
        customer: b.customer,
        crew: b.crew,
        createdByUser: b.createdByUser,
        services: servicesMap[b.booking.id] || [],
      })),
      recentCustomers: recentlyAddedCustomers,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return Response.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
