import { db } from '@/lib/db';
import { customers, bookings } from '@/lib/db/schema';
import { eq, sql, and, or, gte, lte, gt, lt, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';

async function getCustomersWithBookingsInRange(startDate, endDate) {
  const result = await db
    .selectDistinct({ customerId: bookings.customerId })
    .from(bookings)
    .where(and(
      gte(bookings.scheduledDate, new Date(startDate)),
      lte(bookings.scheduledDate, new Date(endDate)),
      isNotNull(bookings.customerId)
    ));
  return result.map(c => c.customerId).filter(Boolean);
}

async function getCustomersWithBookingsSince(startDate) {
  const result = await db
    .selectDistinct({ customerId: bookings.customerId })
    .from(bookings)
    .where(and(
      gte(bookings.scheduledDate, new Date(startDate)),
      isNotNull(bookings.customerId)
    ));
  return result.map(c => c.customerId).filter(Boolean);
}

export async function POST(request) {
  try {
    const { filters, selectedCustomerIds = [] } = await request.json();
    
    if (!filters || filters.length === 0) {
      if (selectedCustomerIds.length > 0) {
        const selectedCustomersData = await db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            city: customers.city,
          })
          .from(customers)
          .where(inArray(customers.id, selectedCustomerIds));
        
        return Response.json({
          count: selectedCustomersData.length,
          customers: selectedCustomersData,
          selectedOnly: true,
        });
      }
      
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(customers)
        .where(isNotNull(customers.email));
      
      const allCustomers = await db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          city: customers.city,
          lastVisit: customers.lastVisit,
          lifetimeSpend: customers.lifetimeSpend,
          transactionCount: customers.transactionCount,
        })
        .from(customers)
        .where(isNotNull(customers.email))
        .limit(100);
      
      return Response.json({
        count: parseInt(countResult[0]?.count || 0),
        customers: allCustomers,
      });
    }
    
    let conditions = [];
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const startOfThisYear = `${currentYear}-01-01`;
    const startOfLastYear = `${lastYear}-01-01`;
    const endOfLastYear = `${lastYear}-12-31`;
    
    for (const filter of filters) {
      const { field, operator, value } = filter;
      
      switch (field) {
        case 'lastBookingDate':
          if (operator === 'before') {
            conditions.push(sql`${customers.lastVisit} < ${value}`);
          } else if (operator === 'after') {
            conditions.push(sql`${customers.lastVisit} > ${value}`);
          } else if (operator === 'isNull') {
            conditions.push(isNull(customers.lastVisit));
          }
          break;
          
        case 'city':
          if (operator === 'is') {
            conditions.push(sql`LOWER(${customers.city}) = LOWER(${value})`);
          } else if (operator === 'isNot') {
            conditions.push(sql`LOWER(${customers.city}) != LOWER(${value})`);
          }
          break;
          
        case 'lifetimeSpend':
          if (operator === 'greaterThan') {
            conditions.push(gt(customers.lifetimeSpend, value));
          } else if (operator === 'lessThan') {
            conditions.push(lt(customers.lifetimeSpend, value));
          }
          break;
          
        case 'transactionCount':
          if (operator === 'greaterThan') {
            conditions.push(gt(customers.transactionCount, parseInt(value)));
          } else if (operator === 'lessThan') {
            conditions.push(lt(customers.transactionCount, parseInt(value)));
          } else if (operator === 'equals') {
            conditions.push(eq(customers.transactionCount, parseInt(value)));
          }
          break;
          
        case 'hasSeasonPass':
          if (value === 'true' || value === true) {
            conditions.push(eq(customers.hasSeasonPass, true));
          } else {
            conditions.push(or(eq(customers.hasSeasonPass, false), isNull(customers.hasSeasonPass)));
          }
          break;
          
        case 'hasBookedThisYear':
          const thisYearCustomerIds = await getCustomersWithBookingsSince(startOfThisYear);
          if (value === 'true' || value === true) {
            if (thisYearCustomerIds.length > 0) {
              conditions.push(inArray(customers.id, thisYearCustomerIds));
            } else {
              conditions.push(sql`1 = 0`);
            }
          } else {
            if (thisYearCustomerIds.length > 0) {
              conditions.push(notInArray(customers.id, thisYearCustomerIds));
            }
          }
          break;
          
        case 'bookedLastYear':
          const lastYearCustomerIds = await getCustomersWithBookingsInRange(startOfLastYear, endOfLastYear);
          if (value === 'true' || value === true) {
            if (lastYearCustomerIds.length > 0) {
              conditions.push(inArray(customers.id, lastYearCustomerIds));
            } else {
              conditions.push(sql`1 = 0`);
            }
          } else {
            if (lastYearCustomerIds.length > 0) {
              conditions.push(notInArray(customers.id, lastYearCustomerIds));
            }
          }
          break;
          
        case 'notBookedThisYear':
          if (value === 'true' || value === true) {
            const bookedThisYearIds = await getCustomersWithBookingsSince(startOfThisYear);
            if (bookedThisYearIds.length > 0) {
              conditions.push(notInArray(customers.id, bookedThisYearIds));
            }
          } else {
            const bookedThisYearIds = await getCustomersWithBookingsSince(startOfThisYear);
            if (bookedThisYearIds.length > 0) {
              conditions.push(inArray(customers.id, bookedThisYearIds));
            } else {
              conditions.push(sql`1 = 0`);
            }
          }
          break;
          
        case 'customerCreatedDate':
          if (operator === 'before') {
            conditions.push(sql`${customers.createdAt} < ${value}`);
          } else if (operator === 'after') {
            conditions.push(sql`${customers.createdAt} > ${value}`);
          } else if (operator === 'isNull') {
            conditions.push(isNull(customers.createdAt));
          }
          break;
          
        case 'hasEmail':
          if (value === 'true' || value === true) {
            conditions.push(isNotNull(customers.email));
            conditions.push(sql`${customers.email} != ''`);
          } else {
            conditions.push(or(isNull(customers.email), sql`${customers.email} = ''`));
          }
          break;
          
        case 'hasPhone':
          if (value === 'true' || value === true) {
            conditions.push(isNotNull(customers.phone));
            conditions.push(sql`${customers.phone} != ''`);
          } else {
            conditions.push(or(isNull(customers.phone), sql`${customers.phone} = ''`));
          }
          break;
      }
    }
    
    const hasEmailFilter = filters.some(f => f.field === 'hasEmail');
    if (!hasEmailFilter) {
      conditions.push(isNotNull(customers.email));
    }
    
    let matchingCustomers = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        city: customers.city,
        lastVisit: customers.lastVisit,
        lifetimeSpend: customers.lifetimeSpend,
        transactionCount: customers.transactionCount,
      })
      .from(customers)
      .where(and(...conditions))
      .limit(500);
    
    const countResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(customers)
      .where(and(...conditions));
    
    let totalCount = parseInt(countResult[0]?.count || 0);
    
    if (selectedCustomerIds.length > 0) {
      const matchingIds = new Set(matchingCustomers.map(c => c.id));
      const additionalIds = selectedCustomerIds.filter(id => !matchingIds.has(id));
      
      if (additionalIds.length > 0) {
        const additionalCustomers = await db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            city: customers.city,
            lastVisit: customers.lastVisit,
            lifetimeSpend: customers.lifetimeSpend,
            transactionCount: customers.transactionCount,
          })
          .from(customers)
          .where(inArray(customers.id, additionalIds));
        
        matchingCustomers = [...matchingCustomers, ...additionalCustomers];
        totalCount += additionalCustomers.length;
      }
    }
    
    return Response.json({
      count: totalCount,
      customers: matchingCustomers,
    });
    
  } catch (error) {
    console.error('Error filtering customers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
