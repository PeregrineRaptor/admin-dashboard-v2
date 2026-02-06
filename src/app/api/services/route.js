import { db } from '@/lib/db';
import { services } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';
    
    let query = db.select().from(services);
    
    if (publicOnly) {
      query = query.where(eq(services.isPublic, true));
    }
    
    const allServices = await query.orderBy(asc(services.sortOrder));
    
    return Response.json(allServices);
  } catch (error) {
    console.error('Error fetching services:', error);
    return Response.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const [service] = await db.insert(services).values({
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      durationMinutes: data.durationMinutes || 45,
      isActive: data.isActive !== false,
      isPublic: data.isPublic !== false,
      sortOrder: data.sortOrder || 0,
    }).returning();
    
    return Response.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return Response.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
