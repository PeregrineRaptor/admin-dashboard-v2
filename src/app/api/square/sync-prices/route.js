import { db } from '@/lib/db';
import { customers, customerProperties as customerPropertiesTable, propertyServicePricing, services, bookings } from '@/lib/db/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSquareBookings, getSquareLocations, getSquareCatalogObject, getSquareCatalogItemVariations } from '@/lib/square';

async function getServiceFromVariation(variationName, allServices) {
  if (!variationName) return null;
  const nameLower = variationName.toLowerCase();
  
  for (const service of allServices) {
    const serviceLower = service.name.toLowerCase();
    if (nameLower.includes(serviceLower) || serviceLower.includes(nameLower.split(' ')[0])) {
      return service;
    }
    if (serviceLower.includes('window') && nameLower.includes('window')) return service;
    if (serviceLower.includes('eave') && nameLower.includes('eave')) return service;
    if (serviceLower.includes('housekeeping') && nameLower.includes('house')) return service;
  }
  return null;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const locations = await getSquareLocations();
    if (!locations || locations.length === 0) {
      return Response.json({ error: 'No Square locations found' }, { status: 400 });
    }
    
    const locationId = locations[0].id;
    
    const now = new Date();
    const startAtMax = now.toISOString();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startAtMin = thirtyDaysAgo.toISOString();
    
    let squareBookings = [];
    try {
      squareBookings = await getSquareBookings(locationId, startAtMin, startAtMax);
    } catch (err) {
      console.log('Failed to fetch Square bookings directly, using DB bookings:', err.message);
    }
    
    const allServices = await db.select().from(services);
    
    let processedCount = 0;
    let updatedCount = 0;
    let errors = [];
    
    const dbBookings = await db
      .select({
        booking: bookings,
        customer: customers,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .where(isNotNull(bookings.customerId));
    
    for (const row of dbBookings) {
      const booking = row.booking;
      const customer = row.customer;
      
      if (!customer) continue;
      
      try {
        const properties = await db
          .select()
          .from(customerPropertiesTable)
          .where(eq(customerPropertiesTable.customerId, customer.id));
        
        if (properties.length === 0) continue;
        
        let targetProperty = properties[0];
        if (booking.address && properties.length > 1) {
          const addressMatch = properties.find(p => 
            p.streetAddress && booking.address?.includes(p.streetAddress)
          );
          if (addressMatch) targetProperty = addressMatch;
        }
        
        const propertyId = targetProperty.id;
        
        if (booking.serviceVariation && booking.totalPrice) {
          const matchedService = await getServiceFromVariation(booking.serviceVariation, allServices);
          
          if (matchedService) {
            const priceValue = parseFloat(booking.totalPrice);
            
            const existingPricing = await db
              .select()
              .from(propertyServicePricing)
              .where(
                and(
                  eq(propertyServicePricing.propertyId, propertyId),
                  eq(propertyServicePricing.serviceId, matchedService.id)
                )
              );
            
            if (existingPricing.length === 0) {
              await db.insert(propertyServicePricing).values({
                propertyId,
                serviceId: matchedService.id,
                customPrice: priceValue.toFixed(2),
              });
              updatedCount++;
            } else if (existingPricing[0].customPrice !== priceValue.toFixed(2)) {
              await db.update(propertyServicePricing)
                .set({ customPrice: priceValue.toFixed(2) })
                .where(eq(propertyServicePricing.id, existingPricing[0].id));
              updatedCount++;
            }
          }
        }
        
        if (customer.windowsPrice && customer.windowsPrice > 0) {
          const windowService = allServices.find(s => s.name.toLowerCase().includes('exterior window'));
          if (windowService) {
            const existingPricing = await db
              .select()
              .from(propertyServicePricing)
              .where(
                and(
                  eq(propertyServicePricing.propertyId, propertyId),
                  eq(propertyServicePricing.serviceId, windowService.id)
                )
              );
            
            if (existingPricing.length === 0) {
              await db.insert(propertyServicePricing).values({
                propertyId,
                serviceId: windowService.id,
                customPrice: parseFloat(customer.windowsPrice).toFixed(2),
              });
              updatedCount++;
            }
          }
        }
        
        if (customer.eavesPrice && customer.eavesPrice > 0) {
          const eavesService = allServices.find(s => s.name.toLowerCase().includes('eaves cleaning'));
          if (eavesService) {
            const existingPricing = await db
              .select()
              .from(propertyServicePricing)
              .where(
                and(
                  eq(propertyServicePricing.propertyId, propertyId),
                  eq(propertyServicePricing.serviceId, eavesService.id)
                )
              );
            
            if (existingPricing.length === 0) {
              await db.insert(propertyServicePricing).values({
                propertyId,
                serviceId: eavesService.id,
                customPrice: parseFloat(customer.eavesPrice).toFixed(2),
              });
              updatedCount++;
            }
          }
        }
        
        processedCount++;
      } catch (err) {
        errors.push({ customerId: customer.id, error: err.message });
      }
    }
    
    return Response.json({
      success: true,
      processed: processedCount,
      updated: updatedCount,
      squareBookingsFetched: squareBookings.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error syncing prices from Square:', error);
    return Response.json({ error: 'Failed to sync prices: ' + error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const propertiesWithPricingCount = await db
      .select({ count: sql`count(distinct ${propertyServicePricing.propertyId})` })
      .from(propertyServicePricing);
    
    const totalProperties = await db
      .select({ count: sql`count(*)` })
      .from(customerPropertiesTable);
    
    const totalPricingEntries = await db
      .select({ count: sql`count(*)` })
      .from(propertyServicePricing);
    
    return Response.json({
      propertiesWithPricing: parseInt(propertiesWithPricingCount[0]?.count || 0),
      totalProperties: parseInt(totalProperties[0]?.count || 0),
      totalPricingEntries: parseInt(totalPricingEntries[0]?.count || 0),
    });
  } catch (error) {
    console.error('Error fetching pricing stats:', error);
    return Response.json({ error: 'Failed to fetch pricing stats' }, { status: 500 });
  }
}
