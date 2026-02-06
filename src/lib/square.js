import { SquareClient, SquareEnvironment } from 'square';

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production,
});

export async function getSquareTeamMembers() {
  try {
    const response = await squareClient.teamMembers.search({
      query: {
        filter: {
          status: 'ACTIVE',
        },
      },
    });
    return response.teamMembers || [];
  } catch (error) {
    console.error('Error fetching Square team members:', error);
    throw error;
  }
}

export async function getSquareLocations() {
  try {
    const response = await squareClient.locations.list();
    return response.locations || [];
  } catch (error) {
    console.error('Error fetching Square locations:', error);
    throw error;
  }
}

export async function getSquareServices() {
  try {
    const response = await squareClient.catalog.list({ types: ['ITEM'] });
    const items = [];
    for await (const item of response) {
      items.push(item);
    }
    return items;
  } catch (error) {
    console.error('Error fetching Square catalog:', error);
    throw error;
  }
}

export async function getSquareCatalogItemVariations() {
  try {
    const response = await squareClient.catalog.list({ types: ['ITEM_VARIATION'] });
    const variations = [];
    for await (const item of response) {
      variations.push(item);
    }
    return variations;
  } catch (error) {
    console.error('Error fetching Square catalog variations:', error);
    throw error;
  }
}

export async function getSquareCatalogObject(objectId) {
  try {
    const response = await squareClient.catalog.retrieve({ objectId });
    return response.object;
  } catch (error) {
    console.error('Error fetching Square catalog object:', error);
    throw error;
  }
}

export async function getSquareBookings(locationId, startAtMin, startAtMax) {
  try {
    const response = await squareClient.bookings.list({
      locationId,
      startAtMin,
      startAtMax,
    });
    const bookings = [];
    for await (const booking of response) {
      bookings.push(booking);
    }
    return bookings;
  } catch (error) {
    console.error('Error fetching Square bookings:', error);
    throw error;
  }
}

export async function getSquareCustomers(cursor) {
  try {
    const response = await squareClient.customers.list({ cursor });
    return {
      customers: response.customers || [],
      cursor: response.cursor,
    };
  } catch (error) {
    console.error('Error fetching Square customers:', error);
    throw error;
  }
}

export async function getSquareBooking(bookingId) {
  try {
    const response = await squareClient.bookings.retrieve(bookingId);
    return response.booking;
  } catch (error) {
    console.error('Error fetching Square booking:', error);
    throw error;
  }
}

export async function updateSquareBookingTeamMember(bookingId, teamMemberIds) {
  try {
    if (!teamMemberIds || teamMemberIds.length === 0) {
      return { skipped: true, reason: 'No team member IDs provided' };
    }
    
    const existing = await getSquareBooking(bookingId);
    if (!existing) {
      throw new Error('Booking not found in Square');
    }
    
    if (!existing.appointmentSegments || existing.appointmentSegments.length === 0) {
      return { skipped: true, reason: 'Booking has no appointment segments to update' };
    }
    
    const appointmentSegments = existing.appointmentSegments.map((seg, index) => ({
      durationMinutes: seg.durationMinutes,
      serviceVariationId: seg.serviceVariationId,
      serviceVariationVersion: seg.serviceVariationVersion,
      teamMemberId: teamMemberIds[index] || teamMemberIds[0],
      anyTeamMember: false,
    }));
    
    const response = await squareClient.bookings.update(bookingId, {
      booking: {
        version: existing.version,
        appointmentSegments,
      },
    });
    
    return response.booking;
  } catch (error) {
    console.error('Error updating Square booking team member:', error);
    throw error;
  }
}

export default squareClient;
