import { db } from '@/lib/db';
import { bookings, customers, services, bookingServices, crews, customerProperties, propertyServicePricing } from '@/lib/db/schema';
import { eq, and, sql, ilike } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSquareBookings, getSquareLocations, getSquareCatalogItemVariations } from '@/lib/square';

function matchServiceByName(variationName, allServices) {
  if (!variationName) return null;
  const nameLower = variationName.toLowerCase();
  
  for (const service of allServices) {
    const serviceLower = service.name.toLowerCase();
    if (nameLower.includes(serviceLower) || serviceLower.includes(nameLower.split(' ')[0])) {
      return service;
    }
    if (serviceLower.includes('window') && nameLower.includes('window')) return service;
    if (serviceLower.includes('eave') && nameLower.includes('eave')) return service;
    if (serviceLower.includes('housekeeping') && (nameLower.includes('house') || nameLower.includes('cleaning'))) return service;
    if (serviceLower.includes('gutter') && nameLower.includes('gutter')) return service;
    if (serviceLower.includes('downspout') && nameLower.includes('downspout')) return service;
  }
  return null;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const forceRelink = searchParams.get('force') === 'true';
    
    const locations = await getSquareLocations();
    if (!locations || locations.length === 0) {
      return Response.json({ error: 'No Square locations found' }, { status: 400 });
    }
    
    const locationId = locations[0].id;
    
    let catalogVariations = [];
    try {
      catalogVariations = await getSquareCatalogItemVariations();
    } catch (err) {
      console.log('Failed to fetch catalog variations:', err.message);
    }
    
    const variationMap = {};
    for (const v of catalogVariations) {
      if (v.id && v.itemVariationData) {
        variationMap[v.id] = {
          name: v.itemVariationData.name,
          priceMoney: v.itemVariationData.priceMoney,
        };
      }
    }
    
    const startOf2026 = '2026-01-01T00:00:00Z';
    const endOf2026 = '2026-12-31T23:59:59Z';
    
    let squareBookings = [];
    try {
      squareBookings = await getSquareBookings(locationId, startOf2026, endOf2026);
    } catch (err) {
      console.error('Failed to fetch Square bookings:', err);
      return Response.json({ error: 'Failed to fetch bookings from Square: ' + err.message }, { status: 500 });
    }
    
    const allServices = await db.select().from(services);
    const allCustomers = await db.select().from(customers);
    const allCrews = await db.select().from(crews);
    
    const customerBySquareId = {};
    for (const c of allCustomers) {
      if (c.squareCustomerId) {
        customerBySquareId[c.squareCustomerId] = c;
      }
    }
    
    const crewBySquareId = {};
    for (const cr of allCrews) {
      if (cr.squareId) {
        crewBySquareId[cr.squareId] = cr;
      }
    }
    
    let processedCount = 0;
    let linkedServicesCount = 0;
    let newBookingsCount = 0;
    let updatedBookingsCount = 0;
    let errors = [];
    
    for (const sqBooking of squareBookings) {
      try {
        let [existingBooking] = await db.select()
          .from(bookings)
          .where(eq(bookings.squareAppointmentId, sqBooking.id))
          .limit(1);
        
        if (!existingBooking) {
          const customerId = sqBooking.customerId ? customerBySquareId[sqBooking.customerId]?.id : null;
          
          let crewId = null;
          if (sqBooking.appointmentSegments && sqBooking.appointmentSegments.length > 0) {
            const teamMemberId = sqBooking.appointmentSegments[0].teamMemberId;
            if (teamMemberId && crewBySquareId[teamMemberId]) {
              crewId = crewBySquareId[teamMemberId].id;
            }
          }
          
          const startAt = sqBooking.startAt ? new Date(sqBooking.startAt) : new Date();
          const scheduledDate = startAt.toISOString().split('T')[0];
          const startTime = startAt.toTimeString().split(' ')[0];
          
          const address = sqBooking.locationType === 'CUSTOMER_LOCATION' && sqBooking.address
            ? `${sqBooking.address.addressLine1 || ''}\n${sqBooking.address.locality || ''}, ${sqBooking.address.administrativeDistrictLevel1 || ''} ${sqBooking.address.postalCode || ''}`.trim()
            : null;
          
          const statusMap = {
            'PENDING': 'pending',
            'ACCEPTED': 'confirmed',
            'DECLINED': 'cancelled',
            'CANCELLED_BY_CUSTOMER': 'cancelled',
            'CANCELLED_BY_SELLER': 'cancelled',
            'NO_SHOW': 'cancelled',
          };
          const status = statusMap[sqBooking.status] || 'confirmed';
          
          const [newBooking] = await db.insert(bookings).values({
            squareAppointmentId: sqBooking.id,
            customerId,
            crewId,
            status,
            scheduledDate,
            startTime,
            address,
            noteFromClient: sqBooking.customerNote,
            createdAt: sqBooking.createdAt ? new Date(sqBooking.createdAt) : new Date(),
          }).returning();
          
          existingBooking = newBooking;
          newBookingsCount++;
        }
        
        const existingServices = await db.select()
          .from(bookingServices)
          .where(eq(bookingServices.bookingId, existingBooking.id));
        
        if (existingServices.length > 0 && !forceRelink) {
          processedCount++;
          continue;
        }
        
        if (forceRelink && existingServices.length > 0) {
          await db.delete(bookingServices).where(eq(bookingServices.bookingId, existingBooking.id));
        }
        
        const propertyId = existingBooking.propertyId;
        
        if (sqBooking.appointmentSegments && sqBooking.appointmentSegments.length > 0) {
          
          for (const segment of sqBooking.appointmentSegments) {
            const variationId = segment.serviceVariationId;
            const variationInfo = variationMap[variationId];
            
            let serviceName = variationInfo?.name || 'Unknown Service';
            let price = null;
            
            const matchedService = matchServiceByName(serviceName, allServices);
            
            if (matchedService && propertyId) {
              const [propertyPrice] = await db.select()
                .from(propertyServicePricing)
                .where(and(
                  eq(propertyServicePricing.propertyId, propertyId),
                  eq(propertyServicePricing.serviceId, matchedService.id)
                ))
                .limit(1);
              
              if (propertyPrice?.customPrice) {
                price = propertyPrice.customPrice;
              }
            }
            
            if (!price && variationInfo?.priceMoney?.amount) {
              price = (parseInt(variationInfo.priceMoney.amount) / 100).toFixed(2);
            }
            
            if (matchedService) {
              await db.insert(bookingServices).values({
                bookingId: existingBooking.id,
                serviceId: matchedService.id,
                price: price || matchedService.basePrice || '0.00',
                variation: serviceName,
              });
              linkedServicesCount++;
            } else if (allServices.length > 0) {
              await db.insert(bookingServices).values({
                bookingId: existingBooking.id,
                serviceId: allServices[0].id,
                price: price || '0.00',
                variation: serviceName,
              });
              linkedServicesCount++;
            }
          }
          const insertedServices = await db.select()
            .from(bookingServices)
            .where(eq(bookingServices.bookingId, existingBooking.id));
          
          let subtotal = insertedServices.reduce((sum, s) => sum + parseFloat(s.price || 0), 0);
          
          let discountAmount = 0;
          if (existingBooking.discountType === 'season_pass') {
            discountAmount = subtotal * 0.25;
          } else if (existingBooking.discountType === 'promo' && existingBooking.discountAmount) {
            discountAmount = parseFloat(existingBooking.discountAmount);
          }
          
          discountAmount = Math.min(discountAmount, subtotal);
          const discountedSubtotal = Math.max(0, subtotal - discountAmount);
          const taxAmount = discountedSubtotal * 0.13;
          const totalAmount = discountedSubtotal + taxAmount;
          
          await db.update(bookings)
            .set({
              subtotal: subtotal.toFixed(2),
              discountAmount: discountAmount.toFixed(2),
              taxAmount: taxAmount.toFixed(2),
              totalAmount: totalAmount.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(bookings.id, existingBooking.id));
          
          updatedBookingsCount++;
        }
        
        processedCount++;
      } catch (err) {
        errors.push({ bookingId: sqBooking.id, error: err.message });
      }
    }
    
    return Response.json({
      success: true,
      squareBookingsFetched: squareBookings.length,
      processed: processedCount,
      newBookings: newBookingsCount,
      updatedBookings: updatedBookingsCount,
      linkedServices: linkedServicesCount,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Error syncing appointments from Square:', error);
    return Response.json({ error: 'Failed to sync appointments: ' + error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const [totalBookings] = await db.select({ count: sql`count(*)` }).from(bookings);
    
    const [bookingsWithServices] = await db.select({ count: sql`count(distinct ${bookingServices.bookingId})` })
      .from(bookingServices);
    
    const [bookings2026] = await db.select({ count: sql`count(*)` })
      .from(bookings)
      .where(sql`scheduled_date >= '2026-01-01' AND scheduled_date <= '2026-12-31'`);
    
    const [bookingsMissingServices] = await db.select({ count: sql`count(*)` })
      .from(bookings)
      .where(sql`id NOT IN (SELECT DISTINCT booking_id FROM booking_services)`);
    
    return Response.json({
      totalBookings: parseInt(totalBookings?.count || 0),
      bookingsWithServices: parseInt(bookingsWithServices?.count || 0),
      bookingsMissingServices: parseInt(bookingsMissingServices?.count || 0),
      bookings2026: parseInt(bookings2026?.count || 0),
    });
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
