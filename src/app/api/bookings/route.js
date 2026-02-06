import { db } from '@/lib/db';
import { bookings, customers, crews, bookingServices, services, users } from '@/lib/db/schema';
import { desc, asc, eq, sql, and, gte, lte, or, ilike, inArray } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const crewId = searchParams.get('crewId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(bookings.scheduledDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(bookings.scheduledDate, endDate));
    }
    if (crewId) {
      conditions.push(eq(bookings.crewId, parseInt(crewId)));
    }
    if (status) {
      conditions.push(eq(bookings.status, status));
    }
    
    let query = db.select({
      booking: bookings,
      customer: customers,
      crew: crews,
      createdByUser: users,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(crews, eq(bookings.crewId, crews.id))
    .leftJoin(users, eq(bookings.createdBy, users.id));
    
    if (search) {
      conditions.push(or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`),
        ilike(bookings.address, `%${search}%`)
      ));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const orderFn = sortOrder === 'asc' ? asc : desc;
    const allBookings = await query
      .orderBy(orderFn(bookings.createdAt))
      .limit(limit)
      .offset(offset);
    
    let countQuery = db.select({ count: sql`count(*)` })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id));
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;
    
    const bookingIds = allBookings.map(b => b.booking.id);
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
    
    return Response.json({
      bookings: allBookings.map(b => ({
        ...b.booking,
        customer: b.customer,
        crew: b.crew,
        createdByUser: b.createdByUser ? { id: b.createdByUser.id, firstName: b.createdByUser.firstName, lastName: b.createdByUser.lastName } : null,
        services: servicesMap[b.booking.id] || [],
      })),
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return Response.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const [booking] = await db.insert(bookings).values({
      customerId: data.customerId,
      propertyId: data.propertyId || null,
      crewId: data.crewId,
      status: data.status || 'pending',
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
      isAllDay: data.isAllDay !== undefined ? data.isAllDay : true,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      subtotal: data.subtotal,
      discountType: data.discountType || null,
      discountAmount: data.discountAmount || null,
      discountNote: data.discountNote || null,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      noteFromClient: data.noteFromClient,
      noteFromBusiness: data.noteFromBusiness,
      createdBy: data.createdBy,
    }).returning();
    
    if (data.services && data.services.length > 0) {
      await db.insert(bookingServices).values(
        data.services.map(s => ({
          bookingId: booking.id,
          serviceId: s.serviceId,
          price: s.price,
          variation: s.variation,
        }))
      );
    }
    
    return Response.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return Response.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
