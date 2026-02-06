import { db } from '@/lib/db';
import { cities } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';
    
    let query = db.select().from(cities);
    
    if (activeOnly) {
      query = query.where(eq(cities.isActive, true));
    }
    
    const allCities = await query.orderBy(asc(cities.name));
    
    return Response.json(allCities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return Response.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (data.parentId) {
      const [parent] = await db.select().from(cities).where(eq(cities.id, data.parentId));
      if (!parent) {
        return Response.json({ error: 'Invalid parent city' }, { status: 400 });
      }
      if (parent.parentId) {
        return Response.json({ error: 'Cannot nest more than one level deep' }, { status: 400 });
      }
    }
    
    const [city] = await db.insert(cities).values({
      name: data.name,
      province: data.province || 'Ontario',
      parentId: data.parentId || null,
      isActive: data.isActive !== false,
    }).returning();
    
    return Response.json(city, { status: 201 });
  } catch (error) {
    console.error('Error creating city:', error);
    return Response.json({ error: 'Failed to create city' }, { status: 500 });
  }
}
