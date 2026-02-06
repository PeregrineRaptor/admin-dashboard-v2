import { db } from '@/lib/db';
import { propertyServicePricing, services } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const propertyId = parseInt(params.propertyId);
    
    const pricing = await db.select({
      id: propertyServicePricing.id,
      propertyId: propertyServicePricing.propertyId,
      serviceId: propertyServicePricing.serviceId,
      customPrice: propertyServicePricing.customPrice,
      service: services,
    })
    .from(propertyServicePricing)
    .leftJoin(services, eq(propertyServicePricing.serviceId, services.id))
    .where(eq(propertyServicePricing.propertyId, propertyId));
    
    return Response.json(pricing);
  } catch (error) {
    console.error('Error fetching property service pricing:', error);
    return Response.json({ error: 'Failed to fetch pricing' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const propertyId = parseInt(params.propertyId);
    const data = await request.json();
    
    const existing = await db.select()
      .from(propertyServicePricing)
      .where(and(
        eq(propertyServicePricing.propertyId, propertyId),
        eq(propertyServicePricing.serviceId, data.serviceId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(propertyServicePricing)
        .set({
          customPrice: data.customPrice,
          updatedAt: new Date(),
        })
        .where(eq(propertyServicePricing.id, existing[0].id))
        .returning();
      return Response.json(updated);
    }
    
    const [created] = await db.insert(propertyServicePricing).values({
      propertyId,
      serviceId: data.serviceId,
      customPrice: data.customPrice,
    }).returning();
    
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating property service pricing:', error);
    return Response.json({ error: 'Failed to create pricing' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const pricingId = searchParams.get('pricingId');
    
    if (!pricingId) {
      return Response.json({ error: 'Pricing ID required' }, { status: 400 });
    }
    
    await db.delete(propertyServicePricing)
      .where(eq(propertyServicePricing.id, parseInt(pricingId)));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting property service pricing:', error);
    return Response.json({ error: 'Failed to delete pricing' }, { status: 500 });
  }
}
