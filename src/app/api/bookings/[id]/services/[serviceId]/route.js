import { db } from '@/lib/db';
import { bookingServices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request, { params }) {
  try {
    const { price } = await request.json();
    const bookingId = parseInt(params.id);
    const serviceId = parseInt(params.serviceId);
    
    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }
    
    const [existing] = await db.select().from(bookingServices)
      .where(and(eq(bookingServices.id, serviceId), eq(bookingServices.bookingId, bookingId)))
      .limit(1);
    
    if (!existing) {
      return Response.json({ error: 'Service not found for this booking' }, { status: 404 });
    }
    
    const [updated] = await db.update(bookingServices)
      .set({ price: parseFloat(price).toFixed(2) })
      .where(and(eq(bookingServices.id, serviceId), eq(bookingServices.bookingId, bookingId)))
      .returning();
    
    return Response.json(updated);
  } catch (error) {
    console.error('Error updating service price:', error);
    return Response.json({ error: 'Failed to update service price' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const bookingId = parseInt(params.id);
    const serviceId = parseInt(params.serviceId);
    
    const [existing] = await db.select().from(bookingServices)
      .where(and(eq(bookingServices.id, serviceId), eq(bookingServices.bookingId, bookingId)))
      .limit(1);
    
    if (!existing) {
      return Response.json({ error: 'Service not found for this booking' }, { status: 404 });
    }
    
    await db.delete(bookingServices)
      .where(and(eq(bookingServices.id, serviceId), eq(bookingServices.bookingId, bookingId)));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return Response.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
