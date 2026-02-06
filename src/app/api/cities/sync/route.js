import { db } from '@/lib/db';
import { cities, customers, customerProperties } from '@/lib/db/schema';
import { eq, sql, ilike } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const existingCities = await db.select().from(cities);
    const existingCityNames = new Set(existingCities.map(c => c.name.toLowerCase().trim()));
    
    const allCustomers = await db.select({
      city: customers.city,
    }).from(customers);
    
    const allProperties = await db.select({
      city: customerProperties.city,
    }).from(customerProperties);
    
    const allCityNames = new Set();
    
    for (const c of allCustomers) {
      if (c.city && c.city.trim()) {
        allCityNames.add(c.city.trim());
      }
    }
    
    for (const p of allProperties) {
      if (p.city && p.city.trim()) {
        allCityNames.add(p.city.trim());
      }
    }
    
    const newCities = [];
    for (const cityName of allCityNames) {
      if (!existingCityNames.has(cityName.toLowerCase())) {
        newCities.push({
          name: cityName,
          province: 'Ontario',
          isActive: true,
        });
      }
    }
    
    let added = 0;
    if (newCities.length > 0) {
      await db.insert(cities).values(newCities);
      added = newCities.length;
    }
    
    return Response.json({
      success: true,
      added,
      total: existingCities.length + added,
      newCities: newCities.map(c => c.name),
    });
  } catch (error) {
    console.error('Error syncing cities:', error);
    return Response.json({ error: 'Failed to sync cities: ' + error.message }, { status: 500 });
  }
}
