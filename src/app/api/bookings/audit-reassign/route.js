import { db } from '@/lib/db';
import { bookings, crews, crewCitySchedules, cities, customerProperties } from '@/lib/db/schema';
import { eq, gte, and, inArray, sql } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-03-31';
    const dryRun = searchParams.get('dryRun') !== 'false';

    const allCrews = await db.select().from(crews).where(eq(crews.isActive, true));
    
    const crewSchedules = await db
      .select({
        crewId: crewCitySchedules.crewId,
        cityId: crewCitySchedules.cityId,
        dayOfWeek: crewCitySchedules.dayOfWeek,
        cityName: cities.name,
      })
      .from(crewCitySchedules)
      .leftJoin(cities, eq(crewCitySchedules.cityId, cities.id));

    const allCities = await db.select().from(cities);
    const cityMap = {};
    allCities.forEach(c => {
      cityMap[c.name.toLowerCase()] = c;
    });

    const crewScheduleMap = {};
    crewSchedules.forEach(s => {
      if (!crewScheduleMap[s.crewId]) {
        crewScheduleMap[s.crewId] = {};
      }
      if (!crewScheduleMap[s.crewId][s.dayOfWeek]) {
        crewScheduleMap[s.crewId][s.dayOfWeek] = [];
      }
      crewScheduleMap[s.crewId][s.dayOfWeek].push(s.cityId);
    });

    const bookingsData = await db
      .select({
        booking: bookings,
        property: customerProperties,
      })
      .from(bookings)
      .leftJoin(customerProperties, eq(bookings.propertyId, customerProperties.id))
      .where(
        and(
          gte(bookings.scheduledDate, new Date(startDate)),
          inArray(bookings.status, ['pending', 'confirmed', 'scheduled', 'accepted']),
          sql`${bookings.crewId} IS NOT NULL`
        )
      );

    const dailyProduction = {};
    bookingsData.forEach(({ booking }) => {
      const scheduledDate = new Date(booking.scheduledDate);
      const dateKey = scheduledDate.toISOString().split('T')[0];
      const crewKey = `${booking.crewId}-${dateKey}`;
      if (!dailyProduction[crewKey]) {
        dailyProduction[crewKey] = 0;
      }
      dailyProduction[crewKey] += parseFloat(booking.subtotal || 0);
    });

    const violations = [];
    const reassignments = [];

    for (const { booking, property } of bookingsData) {
      const scheduledDate = new Date(booking.scheduledDate);
      const dateKey = scheduledDate.toISOString().split('T')[0];
      const dayOfWeek = scheduledDate.getDay();
      const crewId = booking.crewId;
      const crew = allCrews.find(c => c.id === crewId);
      
      if (!crew) continue;

      let propertyCityId = null;
      if (property?.city) {
        const cityData = cityMap[property.city.toLowerCase()];
        if (cityData) {
          propertyCityId = cityData.id;
          if (cityData.parentId) {
            propertyCityId = cityData.parentId;
          }
        }
      }

      const scheduledCities = crewScheduleMap[crewId]?.[dayOfWeek] || [];
      const isCorrectCity = scheduledCities.length === 0 || scheduledCities.includes(propertyCityId);
      
      const crewKey = `${crewId}-${dateKey}`;
      const maxProduction = parseFloat(crew.maxDailyProduction);
      const currentProduction = dailyProduction[crewKey] || 0;
      const isOverCapacity = currentProduction > maxProduction;

      if (!isCorrectCity || isOverCapacity) {
        const violation = {
          bookingId: booking.id,
          date: dateKey,
          dayOfWeek,
          currentCrewId: crewId,
          currentCrewName: crew.name,
          propertyCity: property?.city || 'Unknown',
          propertyCityId,
          scheduledCities,
          subtotal: parseFloat(booking.subtotal || 0),
          reason: !isCorrectCity ? 'wrong_city' : 'over_capacity',
          currentProduction,
          maxProduction,
        };
        violations.push(violation);

        let bestCrew = null;
        let bestCrewProduction = Infinity;

        for (const altCrew of allCrews) {
          if (altCrew.id === crewId) continue;
          
          const altScheduledCities = crewScheduleMap[altCrew.id]?.[dayOfWeek] || [];
          if (altScheduledCities.length > 0 && !altScheduledCities.includes(propertyCityId)) {
            continue;
          }

          const altCrewKey = `${altCrew.id}-${dateKey}`;
          const altCurrentProduction = dailyProduction[altCrewKey] || 0;
          const altMaxProduction = parseFloat(altCrew.maxDailyProduction);
          const bookingValue = parseFloat(booking.subtotal || 0);
          
          if (altCurrentProduction + bookingValue <= altMaxProduction) {
            if (altCurrentProduction < bestCrewProduction) {
              bestCrew = altCrew;
              bestCrewProduction = altCurrentProduction;
            }
          }
        }

        if (bestCrew) {
          reassignments.push({
            bookingId: booking.id,
            date: dateKey,
            fromCrewId: crewId,
            fromCrewName: crew.name,
            toCrewId: bestCrew.id,
            toCrewName: bestCrew.name,
            propertyCity: property?.city || 'Unknown',
            subtotal: parseFloat(booking.subtotal || 0),
            reason: violation.reason,
          });

          const oldCrewKey = `${crewId}-${dateKey}`;
          const newCrewKey = `${bestCrew.id}-${dateKey}`;
          dailyProduction[oldCrewKey] -= parseFloat(booking.subtotal || 0);
          dailyProduction[newCrewKey] = (dailyProduction[newCrewKey] || 0) + parseFloat(booking.subtotal || 0);
        }
      }
    }

    if (!dryRun && reassignments.length > 0) {
      for (const r of reassignments) {
        await db.update(bookings)
          .set({ crewId: r.toCrewId, updatedAt: new Date() })
          .where(eq(bookings.id, r.bookingId));
      }
    }

    return Response.json({
      startDate,
      dryRun,
      totalBookingsChecked: bookingsData.length,
      violationsFound: violations.length,
      reassignmentsAvailable: reassignments.length,
      unassignable: violations.length - reassignments.length,
      violations: violations.slice(0, 50),
      reassignments: reassignments.slice(0, 50),
      message: dryRun 
        ? 'Dry run complete. Add ?dryRun=false to execute reassignments.'
        : `Executed ${reassignments.length} reassignments.`,
    });

  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
