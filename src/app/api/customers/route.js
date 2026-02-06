import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { desc, ilike, or, sql } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    
    const offset = (page - 1) * limit;
    
    let query = db.select().from(customers);
    
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(customers.firstName, `%${search}%`),
          ilike(customers.lastName, `%${search}%`),
          ilike(customers.email, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.streetAddress1, `%${search}%`)
        )
      );
    }
    
    if (city) {
      conditions.push(ilike(customers.city, `%${city}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(sql`${conditions.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`, sql`TRUE`)}`);
    }
    
    const allCustomers = await query
      .orderBy(desc(customers.lastVisit))
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db.select({ count: sql`count(*)` }).from(customers);
    
    return Response.json({
      customers: allCustomers,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const [customer] = await db.insert(customers).values({
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      streetAddress1: data.streetAddress1,
      streetAddress2: data.streetAddress2,
      city: data.city,
      state: data.state || 'Ontario',
      postalCode: data.postalCode,
      latitude: data.latitude,
      longitude: data.longitude,
      windowsPrice: data.windowsPrice,
      eavesPrice: data.eavesPrice,
      hasSeasonPass: data.hasSeasonPass || false,
      seasonPassYear: data.seasonPassYear,
      memo: data.memo,
    }).returning();
    
    return Response.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return Response.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
