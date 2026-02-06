import { db } from '@/lib/db';
import { bookingServices, services, bookings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request, { params }) {
  try {
    const { serviceId, price } = await request.json();
    const bookingId = parseInt(params.id);
    
    if (!serviceId || price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return Response.json({ error: 'Invalid service ID or price' }, { status: 400 });
    }
    
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    const [service] = await db.select().from(services).where(eq(services.id, parseInt(serviceId))).limit(1);
    if (!service) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }
    
    const [existing] = await db.select().from(bookingServices)
      .where(and(eq(bookingServices.bookingId, bookingId), eq(bookingServices.serviceId, parseInt(serviceId))))
      .limit(1);
    if (existing) {
      return Response.json({ error: 'Service already added to this booking' }, { status: 400 });
    }
    
    const [newService] = await db.insert(bookingServices)
      .values({
        bookingId,
        serviceId: parseInt(serviceId),
        price: parseFloat(price).toFixed(2),
      })
      .returning();
    
    return Response.json(newService);
  } catch (error) {
    console.error('Error adding service:', error);
    return Response.json({ error: 'Failed to add service' }, { status: 500 });
  }
}
