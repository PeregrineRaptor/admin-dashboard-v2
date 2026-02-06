import { db } from '@/lib/db';
import { customerProperties } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const propertyId = parseInt(params.propertyId);
    
    const [property] = await db.select()
      .from(customerProperties)
      .where(eq(customerProperties.id, propertyId));
    
    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }
    
    return Response.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return Response.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const propertyId = parseInt(params.propertyId);
    const data = await request.json();
    
    let latitude = data.latitude;
    let longitude = data.longitude;
    let city = data.city;
    let postalCode = data.postalCode;
    
    const [existing] = await db.select()
      .from(customerProperties)
      .where(eq(customerProperties.id, propertyId));
    
    const addressChanged = existing && (
      existing.streetAddress1 !== data.streetAddress1 ||
      existing.city !== data.city ||
      existing.state !== data.state ||
      existing.postalCode !== data.postalCode
    );
    
    if ((addressChanged || !latitude || !longitude) && data.streetAddress1) {
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
    
    const [updated] = await db.update(customerProperties)
      .set({
        name: data.name,
        streetAddress1: data.streetAddress1,
        streetAddress2: data.streetAddress2 || null,
        city: city,
        state: data.state,
        postalCode: postalCode,
        country: data.country,
        latitude: latitude,
        longitude: longitude,
        isBillingAddress: data.isBillingAddress,
        isServiceAddress: data.isServiceAddress,
        windowsPrice: parsePrice(data.windowsPrice),
        eavesPrice: parsePrice(data.eavesPrice),
        memo: data.memo || null,
        updatedAt: new Date(),
      })
      .where(eq(customerProperties.id, propertyId))
      .returning();
    
    if (!updated) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }
    
    return Response.json(updated);
  } catch (error) {
    console.error('Error updating property:', error);
    return Response.json({ error: 'Failed to update property' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const propertyId = parseInt(params.propertyId);
    
    await db.delete(customerProperties)
      .where(eq(customerProperties.id, propertyId));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    return Response.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
