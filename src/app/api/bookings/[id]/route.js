import { db } from '@/lib/db';
import { bookings, customers, crews, services, bookingServices, crewMembers, users, customerProperties, propertyServicePricing } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateSquareBookingTeamMember } from '@/lib/square';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const [booking] = await db.select({
      booking: bookings,
      customer: customers,
      crew: crews,
      property: customerProperties,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(crews, eq(bookings.crewId, crews.id))
    .leftJoin(customerProperties, eq(bookings.propertyId, customerProperties.id))
    .where(eq(bookings.id, id))
    .limit(1);
    
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    const bookingServicesData = await db.select({
      bookingService: bookingServices,
      service: services,
    })
    .from(bookingServices)
    .leftJoin(services, eq(bookingServices.serviceId, services.id))
    .where(eq(bookingServices.bookingId, id));
    
    let propertyPricing = {};
    if (booking.booking.propertyId) {
      const pricingData = await db.select()
        .from(propertyServicePricing)
        .where(eq(propertyServicePricing.propertyId, booking.booking.propertyId));
      
      pricingData.forEach(p => {
        propertyPricing[p.serviceId] = parseFloat(p.customPrice);
      });
    }
    
    return Response.json({
      ...booking.booking,
      customer: booking.customer,
      crew: booking.crew,
      property: booking.property,
      propertyPricing,
      services: bookingServicesData.map(bs => ({
        ...bs.bookingService,
        service: bs.service,
      })),
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return Response.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    
    const updateData = { updatedAt: new Date() };
    
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.crewId !== undefined) updateData.crewId = data.crewId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.noteFromClient !== undefined) updateData.noteFromClient = data.noteFromClient;
    if (data.noteFromBusiness !== undefined) updateData.noteFromBusiness = data.noteFromBusiness;
    if (data.routeOrder !== undefined) updateData.routeOrder = data.routeOrder;
    
    const [updated] = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    
    if (!updated) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    let squareSyncResult = null;
    if (data.crewId !== undefined && updated.squareAppointmentId && data.syncToSquare !== false) {
      try {
        const crewMembersData = await db
          .select({ user: users })
          .from(crewMembers)
          .leftJoin(users, eq(crewMembers.userId, users.id))
          .where(eq(crewMembers.crewId, data.crewId));
        
        const squareTeamMemberIds = crewMembersData
          .map(m => m.user?.squareId)
          .filter(Boolean);
        
        if (squareTeamMemberIds.length > 0) {
          const syncResult = await updateSquareBookingTeamMember(updated.squareAppointmentId, squareTeamMemberIds);
          if (syncResult?.skipped) {
            squareSyncResult = { synced: false, reason: syncResult.reason };
          } else {
            squareSyncResult = { synced: true, teamMemberIds: squareTeamMemberIds };
          }
        } else {
          squareSyncResult = { synced: false, reason: 'No crew members with Square IDs' };
        }
      } catch (squareError) {
        console.error('Error syncing to Square:', squareError);
        squareSyncResult = { synced: false, error: squareError.message };
      }
    }
    
    return Response.json({ ...updated, squareSyncResult });
  } catch (error) {
    console.error('Error updating booking:', error);
    return Response.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    await db.delete(bookingServices).where(eq(bookingServices.bookingId, id));
    
    const [deleted] = await db.delete(bookings)
      .where(eq(bookings.id, id))
      .returning();
    
    if (!deleted) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return Response.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
