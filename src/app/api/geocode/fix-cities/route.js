import { db } from '@/lib/db';
import { customers, customerProperties } from '@/lib/db/schema';
import { eq, or, isNull, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function geocodeAddress(address, province, country = 'Canada') {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const fullAddress = `${address}, ${province}, ${country}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    const result = data.results[0];
    let city = null;
    let postalCode = null;

    for (const component of result.address_components) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('sublocality_level_1') && !city) {
        city = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    }

    return { city, postalCode, formattedAddress: result.formatted_address };
  }

  return null;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const propertiesMissingCity = await db.select({
      id: customerProperties.id,
      streetAddress1: customerProperties.streetAddress1,
      city: customerProperties.city,
      state: customerProperties.state,
    })
    .from(customerProperties)
    .where(or(isNull(customerProperties.city), sql`${customerProperties.city} = ''`));

    const customersMissingCity = await db.select({
      id: customers.id,
      streetAddress1: customers.streetAddress1,
      city: customers.city,
      state: customers.state,
    })
    .from(customers)
    .where(or(isNull(customers.city), sql`${customers.city} = ''`));

    return Response.json({
      propertiesMissingCity: propertiesMissingCity.length,
      customersMissingCity: customersMissingCity.length,
      properties: propertiesMissingCity,
      customers: customersMissingCity,
    });
  } catch (error) {
    console.error('Error fetching missing cities:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const propertiesMissingCity = await db.select({
      id: customerProperties.id,
      streetAddress1: customerProperties.streetAddress1,
      city: customerProperties.city,
      state: customerProperties.state,
      postalCode: customerProperties.postalCode,
    })
    .from(customerProperties)
    .where(or(isNull(customerProperties.city), sql`${customerProperties.city} = ''`));

    const customersMissingCity = await db.select({
      id: customers.id,
      streetAddress1: customers.streetAddress1,
      city: customers.city,
      state: customers.state,
      postalCode: customers.postalCode,
    })
    .from(customers)
    .where(or(isNull(customers.city), sql`${customers.city} = ''`));

    let propertiesUpdated = 0;
    let customersUpdated = 0;
    let errors = [];

    for (const prop of propertiesMissingCity) {
      if (!prop.streetAddress1) continue;

      try {
        const result = await geocodeAddress(prop.streetAddress1, prop.state || 'Ontario');
        if (result && result.city) {
          const updateData = { city: result.city };
          if (!prop.postalCode && result.postalCode) {
            updateData.postalCode = result.postalCode;
          }
          await db.update(customerProperties)
            .set(updateData)
            .where(eq(customerProperties.id, prop.id));
          propertiesUpdated++;
        }
      } catch (err) {
        errors.push({ type: 'property', id: prop.id, error: err.message });
      }
    }

    for (const cust of customersMissingCity) {
      if (!cust.streetAddress1) continue;

      try {
        const result = await geocodeAddress(cust.streetAddress1, cust.state || 'Ontario');
        if (result && result.city) {
          const updateData = { city: result.city };
          if (!cust.postalCode && result.postalCode) {
            updateData.postalCode = result.postalCode;
          }
          await db.update(customers)
            .set(updateData)
            .where(eq(customers.id, cust.id));
          customersUpdated++;
        }
      } catch (err) {
        errors.push({ type: 'customer', id: cust.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      propertiesUpdated,
      customersUpdated,
      totalPropertiesMissing: propertiesMissingCity.length,
      totalCustomersMissing: customersMissingCity.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fixing cities:', error);
    return Response.json({ error: 'Failed to fix cities: ' + error.message }, { status: 500 });
  }
}
