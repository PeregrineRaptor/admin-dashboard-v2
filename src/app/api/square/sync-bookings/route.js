import { db } from '@/lib/db';
import { bookings, customers } from '@/lib/db/schema';
import { getSquareBookings, getSquareLocations } from '@/lib/square';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    const locations = await getSquareLocations();
    if (!locations.length) {
      return Response.json({ error: 'No Square locations found' }, { status: 400 });
    }
    
    const locationId = locations[0].id;
    
    const startAtMin = new Date('2021-01-01').toISOString();
    const startAtMax = new Date('2027-12-31').toISOString();
    
    const squareBookings = await getSquareBookings(locationId, startAtMin, startAtMax);
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };
    
    for (const sqBooking of squareBookings) {
      const existingBooking = await db.select().from(bookings)
        .where(eq(bookings.squareAppointmentId, sqBooking.id))
        .limit(1);
      
      let customerId = null;
      if (sqBooking.customerId) {
        const customer = await db.select().from(customers)
          .where(eq(customers.squareId, sqBooking.customerId))
          .limit(1);
        if (customer.length > 0) {
          customerId = customer[0].id;
        }
      }
      
      const startAt = sqBooking.startAt ? new Date(sqBooking.startAt) : null;
      const scheduledDate = startAt ? startAt.toISOString().split('T')[0] : null;
      const startTime = startAt ? startAt.toTimeString().slice(0, 5) : null;
      
      const statusMap = {
        'PENDING': 'pending',
        'ACCEPTED': 'confirmed',
        'CANCELLED_BY_SELLER': 'cancelled',
        'CANCELLED_BY_CUSTOMER': 'cancelled',
        'DECLINED': 'cancelled',
        'NO_SHOW': 'cancelled',
      };
      const status = statusMap[sqBooking.status] || 'pending';
      
      const bookingData = {
        customerId,
        scheduledDate,
        startTime,
        status,
        squareAppointmentId: sqBooking.id,
        noteFromClient: sqBooking.customerNote,
        noteFromBusiness: sqBooking.sellerNote,
        updatedAt: new Date(),
      };
      
      if (existingBooking.length > 0) {
        await db.update(bookings)
          .set(bookingData)
          .where(eq(bookings.squareAppointmentId, sqBooking.id));
        results.updated++;
      } else {
        await db.insert(bookings).values({
          ...bookingData,
          createdAt: sqBooking.createdAt ? new Date(sqBooking.createdAt) : new Date(),
        });
        results.created++;
      }
    }
    
    return Response.json({
      success: true,
      message: 'Square bookings sync completed',
      results,
      totalSquareBookings: squareBookings.length,
    });
  } catch (error) {
    console.error('Error syncing Square bookings:', error);
    return Response.json({ 
      error: 'Failed to sync Square bookings',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    const locations = await getSquareLocations();
    if (!locations.length) {
      return Response.json({ error: 'No Square locations found' }, { status: 400 });
    }
    
    const locationId = locations[0].id;
    
    const startAtMin = new Date('2024-01-01').toISOString();
    const startAtMax = new Date('2027-12-31').toISOString();
    
    const squareBookings = await getSquareBookings(locationId, startAtMin, startAtMax);
    
    const [dbCount] = await db.select({ count: sql`count(*)` }).from(bookings);
    
    return Response.json({
      success: true,
      squareBookingsCount: squareBookings.length,
      databaseBookingsCount: parseInt(dbCount.count),
      preview: squareBookings.slice(0, 10).map(b => ({
        id: b.id,
        customerId: b.customerId,
        startAt: b.startAt,
        status: b.status,
        customerNote: b.customerNote,
      })),
    });
  } catch (error) {
    console.error('Error previewing Square bookings:', error);
    return Response.json({ 
      error: 'Failed to preview Square bookings',
      details: error.message 
    }, { status: 500 });
  }
}
