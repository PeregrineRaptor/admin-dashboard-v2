import { db } from '@/lib/db';
import { bookings, bookingServices, crews, customers, customerProperties } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

const HOURLY_RATE = 200;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '14');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    if (startDateParam && endDateParam) {
      const parsedStart = new Date(startDateParam);
      const parsedEnd = new Date(endDateParam);
      
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        startDate = parsedStart;
        endDate = parsedEnd;
        if (endDate < startDate) {
          [startDate, endDate] = [endDate, startDate];
        }
      } else {
        endDate.setDate(endDate.getDate() + daysAhead);
      }
    } else {
      endDate.setDate(endDate.getDate() + daysAhead);
    }
    
    const todayStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const allCrews = await db.select().from(crews).where(eq(crews.isActive, true));
    
    const activeStatuses = ['pending', 'confirmed', 'scheduled', 'accepted'];
    
    const upcomingBookings = await db.select({
      booking: bookings,
      customer: customers,
      property: customerProperties,
      crew: crews,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(customerProperties, eq(bookings.propertyId, customerProperties.id))
    .leftJoin(crews, eq(bookings.crewId, crews.id))
    .where(
      and(
        gte(bookings.scheduledDate, todayStr),
        lte(bookings.scheduledDate, endDateStr),
        sql`${bookings.status} IN (${sql.join(activeStatuses.map(s => sql`${s}`), sql`, `)})`
      )
    )
    .orderBy(bookings.scheduledDate, bookings.routeOrder);
    
    const bookingIds = upcomingBookings.map(b => b.booking.id);
    let servicesMap = {};
    if (bookingIds.length > 0) {
      const allServices = await db.select().from(bookingServices)
        .where(sql`${bookingServices.bookingId} IN (${sql.join(bookingIds.map(id => sql`${id}`), sql`, `)})`);
      allServices.forEach(s => {
        if (!servicesMap[s.bookingId]) servicesMap[s.bookingId] = [];
        servicesMap[s.bookingId].push(s);
      });
    }
    
    const crewDayData = {};
    
    upcomingBookings.forEach(({ booking, customer, property, crew }) => {
      if (!crew) return;
      
      const dateStr = booking.scheduledDate;
      const key = `${crew.id}-${dateStr}`;
      
      if (!crewDayData[key]) {
        crewDayData[key] = {
          crewId: crew.id,
          crewName: crew.name,
          crewColor: crew.color,
          date: dateStr,
          maxProduction: parseFloat(crew.maxDailyProduction) || 2000,
          totalProduction: 0,
          bookings: [],
        };
      }
      
      const bookingTotal = parseFloat(booking.subtotal) || 0;
      crewDayData[key].totalProduction += bookingTotal;
      
      const lat = property?.latitude || booking.latitude;
      const lng = property?.longitude || booking.longitude;
      
      const estimatedHours = bookingTotal / HOURLY_RATE;
      
      crewDayData[key].bookings.push({
        id: booking.id,
        customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown',
        address: property?.streetAddress1 || booking.address || '',
        city: property?.city || '',
        scheduledDate: booking.scheduledDate,
        startTime: booking.startTime,
        routeOrder: booking.routeOrder,
        subtotal: bookingTotal,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
        services: servicesMap[booking.id] || [],
      });
    });
    
    const crewDays = Object.values(crewDayData)
      .map(cd => {
        const totalEstimatedHours = cd.bookings.reduce((sum, b) => sum + (b.estimatedHours || 0), 0);
        const overAmount = cd.totalProduction > cd.maxProduction ? cd.totalProduction - cd.maxProduction : 0;
        return {
          ...cd,
          totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
          utilizationPercent: Math.round((cd.totalProduction / cd.maxProduction) * 100),
          isMaxed: cd.totalProduction >= cd.maxProduction * 0.9,
          isOverCapacity: cd.totalProduction > cd.maxProduction,
          overAmount,
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return b.utilizationPercent - a.utilizationPercent;
      });
    
    const crewAvailabilityByDate = {};
    
    const allDatesInRange = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDatesInRange.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    allDatesInRange.forEach(date => {
      const dayCrewData = crewDays.filter(cd => cd.date === date);
      
      crewAvailabilityByDate[date] = allCrews.map(crew => {
        const existingData = dayCrewData.find(cd => cd.crewId === crew.id);
        const maxProd = parseFloat(crew.maxDailyProduction) || 2000;
        const currentProd = existingData?.totalProduction || 0;
        const remainingCapacity = maxProd - currentProd;
        
        return {
          crewId: crew.id,
          crewName: crew.name,
          crewColor: crew.color,
          maxProduction: maxProd,
          currentProduction: currentProd,
          remainingCapacity: Math.max(0, remainingCapacity),
          utilizationPercent: Math.round((currentProd / maxProd) * 100),
          hasCapacity: remainingCapacity > 0,
        };
      }).filter(c => c.hasCapacity);
    });
    
    const maxedDays = crewDays.filter(cd => cd.isMaxed);
    const overCapacityDays = crewDays.filter(cd => cd.isOverCapacity);
    
    return Response.json({
      crews: allCrews,
      crewDays,
      maxedDays,
      overCapacityDays,
      crewAvailabilityByDate,
      hourlyRate: HOURLY_RATE,
      summary: {
        totalDays: crewDays.length,
        maxedCount: maxedDays.length,
        overCapacityCount: overCapacityDays.length,
      },
    });
  } catch (error) {
    console.error('Optimization API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
