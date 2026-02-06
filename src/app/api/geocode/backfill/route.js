import { db } from '@/lib/db';
import { customerProperties } from '@/lib/db/schema';
import { eq, or, isNull, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const propertiesMissingCoords = await db.select({
      id: customerProperties.id,
      streetAddress1: customerProperties.streetAddress1,
      city: customerProperties.city,
      state: customerProperties.state,
      postalCode: customerProperties.postalCode,
      latitude: customerProperties.latitude,
      longitude: customerProperties.longitude,
    })
    .from(customerProperties)
    .where(or(
      isNull(customerProperties.latitude),
      isNull(customerProperties.longitude)
    ));

    return Response.json({
      totalMissing: propertiesMissingCoords.length,
      properties: propertiesMissingCoords.slice(0, 50),
    });
  } catch (error) {
    console.error('Error fetching properties missing coordinates:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { limit = 100 } = await request.json().catch(() => ({}));

    const propertiesMissingCoords = await db.select({
      id: customerProperties.id,
      streetAddress1: customerProperties.streetAddress1,
      city: customerProperties.city,
      state: customerProperties.state,
      postalCode: customerProperties.postalCode,
      country: customerProperties.country,
    })
    .from(customerProperties)
    .where(or(
      isNull(customerProperties.latitude),
      isNull(customerProperties.longitude)
    ))
    .limit(limit);

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const prop of propertiesMissingCoords) {
      if (!prop.streetAddress1) {
        failed++;
        continue;
      }

      try {
        const result = await geocodeAddress(
          prop.streetAddress1,
          prop.city,
          prop.state,
          prop.postalCode,
          prop.country || 'Canada'
        );

        if (result && result.latitude && result.longitude) {
          const updateData = {
            latitude: result.latitude,
            longitude: result.longitude,
          };
          
          if (!prop.city && result.city) {
            updateData.city = result.city;
          }
          if (!prop.postalCode && result.postalCode) {
            updateData.postalCode = result.postalCode;
          }

          await db.update(customerProperties)
            .set(updateData)
            .where(eq(customerProperties.id, prop.id));
          
          updated++;
        } else {
          failed++;
          errors.push({ id: prop.id, address: prop.streetAddress1, reason: 'No geocode result' });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        failed++;
        errors.push({ id: prop.id, address: prop.streetAddress1, reason: err.message });
      }
    }

    const remainingCount = await db.select({ count: sql`count(*)` })
      .from(customerProperties)
      .where(or(
        isNull(customerProperties.latitude),
        isNull(customerProperties.longitude)
      ));

    return Response.json({
      success: true,
      processed: propertiesMissingCoords.length,
      updated,
      failed,
      remaining: parseInt(remainingCount[0]?.count || 0),
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error backfilling coordinates:', error);
    return Response.json({ error: 'Failed to backfill: ' + error.message }, { status: 500 });
  }
}
