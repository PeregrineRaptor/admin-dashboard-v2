import { db } from '@/lib/db';
import { cities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    
    if (!city) {
      return Response.json({ error: 'City not found' }, { status: 404 });
    }
    
    return Response.json(city);
  } catch (error) {
    console.error('Error fetching city:', error);
    return Response.json({ error: 'Failed to fetch city' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    
    if (data.parentId) {
      if (data.parentId === id) {
        return Response.json({ error: 'A city cannot be its own parent' }, { status: 400 });
      }
      const [parent] = await db.select().from(cities).where(eq(cities.id, data.parentId));
      if (!parent) {
        return Response.json({ error: 'Invalid parent city' }, { status: 400 });
      }
      if (parent.parentId) {
        return Response.json({ error: 'Cannot nest more than one level deep' }, { status: 400 });
      }
    }
    
    const [city] = await db.update(cities)
      .set({
        name: data.name,
        province: data.province,
        parentId: data.parentId || null,
        isActive: data.isActive,
      })
      .where(eq(cities.id, id))
      .returning();
    
    if (!city) {
      return Response.json({ error: 'City not found' }, { status: 404 });
    }
    
    return Response.json(city);
  } catch (error) {
    console.error('Error updating city:', error);
    return Response.json({ error: 'Failed to update city' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const children = await db.select({ id: cities.id }).from(cities).where(eq(cities.parentId, id));
    if (children.length > 0) {
      return Response.json({ 
        error: 'Cannot delete a parent city with sub-cities. Please reassign or delete the sub-cities first.' 
      }, { status: 400 });
    }
    
    await db.delete(cities).where(eq(cities.id, id));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting city:', error);
    return Response.json({ error: 'Failed to delete city' }, { status: 500 });
  }
}
