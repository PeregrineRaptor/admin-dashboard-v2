import { db } from '@/lib/db';
import { customerProperties } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const customerId = parseInt(params.id);
    
    const properties = await db.select()
      .from(customerProperties)
      .where(eq(customerProperties.customerId, customerId))
      .orderBy(desc(customerProperties.createdAt));
    
    return Response.json(properties);
  } catch (error) {
    console.error('Error fetching customer properties:', error);
    return Response.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const customerId = parseInt(params.id);
    const data = await request.json();
    
    const existingCount = await db.select()
      .from(customerProperties)
      .where(eq(customerProperties.customerId, customerId));
    
    const propertyNumber = existingCount.length + 1;
    const propertyName = data.name || `Property #${String(propertyNumber).padStart(2, '0')}`;
    
    let latitude = data.latitude;
    let longitude = data.longitude;
    let city = data.city;
    let postalCode = data.postalCode;
    
    if ((!latitude || !longitude) && data.streetAddress1) {
      const geocodeResult = await geocodeAddress(
        data.streetAddress1,
        data.city,
        data.state,
        data.postalCode,
        data.country || 'Canada'
      );
      
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        if (!city && geocodeResult.city) city = geocodeResult.city;
        if (!postalCode && geocodeResult.postalCode) postalCode = geocodeResult.postalCode;
      }
    }
    
    const parsePrice = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };
    
    const [property] = await db.insert(customerProperties).values({
      customerId,
      name: propertyName,
      streetAddress1: data.streetAddress1,
      streetAddress2: data.streetAddress2 || null,
      city: city,
      state: data.state,
      postalCode: postalCode,
      country: data.country || 'Canada',
      latitude: latitude,
      longitude: longitude,
      isBillingAddress: data.isBillingAddress || false,
      isServiceAddress: data.isServiceAddress || true,
      windowsPrice: parsePrice(data.windowsPrice),
      eavesPrice: parsePrice(data.eavesPrice),
      memo: data.memo || null,
    }).returning();
    
    return Response.json(property);
  } catch (error) {
    console.error('Error creating customer property:', error);
    return Response.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
