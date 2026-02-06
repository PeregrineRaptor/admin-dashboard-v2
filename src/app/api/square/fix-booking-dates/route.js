import { db } from '@/lib/db';
import { bookings } from '@/lib/db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSquareBooking } from '@/lib/square';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bookingsWithSquareId = await db.select({
      id: bookings.id,
      squareAppointmentId: bookings.squareAppointmentId,
      createdAt: bookings.createdAt,
      scheduledDate: bookings.scheduledDate,
    })
    .from(bookings)
    .where(isNotNull(bookings.squareAppointmentId));

    const syncDate = new Date('2026-02-03');
    const syncDateStart = new Date('2026-02-03T00:00:00');
    const syncDateEnd = new Date('2026-02-03T23:59:59');

    const wrongDateCount = bookingsWithSquareId.filter(b => {
      if (!b.createdAt) return false;
      const createdAt = new Date(b.createdAt);
      return createdAt >= syncDateStart && createdAt <= syncDateEnd;
    }).length;

    return Response.json({
      totalBookingsWithSquareId: bookingsWithSquareId.length,
      bookingsWithRecentCreatedAt: wrongDateCount,
      message: `${wrongDateCount} bookings have creation dates from the sync date (Feb 3, 2026) instead of Square's original booking date`,
    });
  } catch (error) {
    console.error('Error checking booking dates:', error);
    return Response.json({ error: 'Failed to check booking dates' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allBookingsWithSquareId = await db.select({
      id: bookings.id,
      squareAppointmentId: bookings.squareAppointmentId,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(isNotNull(bookings.squareAppointmentId));

    const syncDateStart = new Date('2026-02-03T00:00:00');
    const syncDateEnd = new Date('2026-02-03T23:59:59');

    const bookingsToFix = allBookingsWithSquareId.filter(b => {
      if (!b.createdAt) return true;
      const createdAt = new Date(b.createdAt);
      return createdAt >= syncDateStart && createdAt <= syncDateEnd;
    });

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let errors = [];

    for (const booking of bookingsToFix) {
      try {
        const squareBooking = await getSquareBooking(booking.squareAppointmentId);
        
        if (squareBooking && squareBooking.createdAt) {
          const squareCreatedAt = new Date(squareBooking.createdAt);
          
          await db.update(bookings)
            .set({ createdAt: squareCreatedAt })
            .where(eq(bookings.id, booking.id));
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        errorCount++;
        if (errors.length < 10) {
          errors.push({ bookingId: booking.id, squareId: booking.squareAppointmentId, error: err.message });
        }
      }
    }

    return Response.json({
      success: true,
      totalWithSquareId: allBookingsWithSquareId.length,
      totalNeedingFix: bookingsToFix.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors,
    });
  } catch (error) {
    console.error('Error fixing booking dates:', error);
    return Response.json({ error: 'Failed to fix booking dates: ' + error.message }, { status: 500 });
  }
}
