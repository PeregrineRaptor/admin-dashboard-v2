import { db } from '@/lib/db';
import { customers, bookings, bookingServices, services, crews, customerProperties, propertyServicePricing } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    
    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const customerBookings = await db.select({
      booking: bookings,
      crew: crews,
    })
      .from(bookings)
      .leftJoin(crews, eq(bookings.crewId, crews.id))
      .where(eq(bookings.customerId, id))
      .orderBy(desc(bookings.scheduledDate))
      .limit(50);
    
    const bookingIds = customerBookings.map(b => b.booking.id);
    let bookingServicesMap = {};
    
    if (bookingIds.length > 0) {
      const allBookingServices = await db.select({
        bookingService: bookingServices,
        service: services,
      })
        .from(bookingServices)
        .leftJoin(services, eq(bookingServices.serviceId, services.id))
        .where(inArray(bookingServices.bookingId, bookingIds));
      
      allBookingServices.forEach(bs => {
        if (!bookingServicesMap[bs.bookingService.bookingId]) {
          bookingServicesMap[bs.bookingService.bookingId] = [];
        }
        bookingServicesMap[bs.bookingService.bookingId].push({
          ...bs.bookingService,
          service: bs.service,
        });
      });
    }
    
    const properties = await db.select()
      .from(customerProperties)
      .where(eq(customerProperties.customerId, id))
      .orderBy(customerProperties.createdAt);
    
    const propertyIds = properties.map(p => p.id);
    let propertyPricingMap = {};
    
    if (propertyIds.length > 0) {
      const allPropertyPricing = await db.select({
        pricing: propertyServicePricing,
        service: services,
      })
        .from(propertyServicePricing)
        .leftJoin(services, eq(propertyServicePricing.serviceId, services.id))
        .where(inArray(propertyServicePricing.propertyId, propertyIds));
      
      allPropertyPricing.forEach(pp => {
        if (!propertyPricingMap[pp.pricing.propertyId]) {
          propertyPricingMap[pp.pricing.propertyId] = [];
        }
        propertyPricingMap[pp.pricing.propertyId].push({
          ...pp.pricing,
          service: pp.service,
        });
      });
    }
    
    return Response.json({
      ...customer,
      properties: properties.map(p => ({
        ...p,
        servicePricing: propertyPricingMap[p.id] || [],
      })),
      bookings: customerBookings.map(b => ({
        ...b.booking,
        crew: b.crew,
        services: bookingServicesMap[b.booking.id] || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return Response.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    
    const [updated] = await db.update(customers)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        streetAddress1: data.streetAddress1,
        streetAddress2: data.streetAddress2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        windowsPrice: data.windowsPrice,
        eavesPrice: data.eavesPrice,
        hasSeasonPass: data.hasSeasonPass,
        seasonPassYear: data.seasonPassYear,
        seasonPassPurchaseDate: data.seasonPassPurchaseDate || null,
        seasonPassExpiryDate: data.seasonPassExpiryDate || null,
        seasonPassPrice: data.seasonPassPrice || null,
        isBlockedFromOnlineBooking: data.isBlockedFromOnlineBooking,
        memo: data.memo,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();
    
    if (!updated) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return Response.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    return Response.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    await db.delete(customers).where(eq(customers.id, id));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return Response.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
