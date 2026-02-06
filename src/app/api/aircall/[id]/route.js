import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

const AIRCALL_API_URL = 'https://api.aircall.io/v1';

function getAuthHeader() {
  const apiId = process.env.AIRCALL_API_ID;
  const apiToken = process.env.AIRCALL_API_TOKEN;
  
  if (!apiId || !apiToken) {
    throw new Error('Aircall API credentials not configured');
  }
  
  const encoded = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
  return `Basic ${encoded}`;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

async function findCustomerByPhone(phoneNumber) {
  if (!phoneNumber) return null;
  
  const normalized = normalizePhone(phoneNumber);
  if (!normalized || normalized.length !== 10) return null;
  
  try {
    const results = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        companyName: customers.companyName,
        phone: customers.phone,
        email: customers.email,
      })
      .from(customers)
      .where(sql`${customers.phone} IS NOT NULL`);
    
    for (const customer of results) {
      const normalizedCustomerPhone = normalizePhone(customer.phone);
      if (normalizedCustomerPhone === normalized) {
        return customer;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding customer by phone:', error);
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const response = await fetch(`${AIRCALL_API_URL}/calls/${id}`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Aircall API error:', response.status, errorText);
      
      let errorMessage = `Aircall API error: ${response.status}`;
      if (response.status === 403) {
        errorMessage = 'Access denied. Please check your Aircall API credentials and permissions.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid Aircall API credentials.';
      } else if (response.status === 404) {
        errorMessage = 'Call not found.';
      }
      
      return Response.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    const call = data.call;
    
    if (!call) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const crmCustomer = await findCustomerByPhone(call.raw_digits);
    
    const formattedCall = {
      id: call.id,
      direction: call.direction,
      status: call.status,
      duration: call.duration,
      startedAt: call.started_at,
      answeredAt: call.answered_at,
      endedAt: call.ended_at,
      missedCallReason: call.missed_call_reason,
      user: call.user ? {
        id: call.user.id,
        name: call.user.name,
        email: call.user.email,
        available: call.user.available,
      } : null,
      contact: call.contact ? {
        id: call.contact.id,
        firstName: call.contact.first_name,
        lastName: call.contact.last_name,
        company: call.contact.company_name,
        phoneNumbers: call.contact.phone_numbers,
        emails: call.contact.emails,
      } : null,
      crmCustomer: crmCustomer ? {
        id: crmCustomer.id,
        firstName: crmCustomer.firstName,
        lastName: crmCustomer.lastName,
        companyName: crmCustomer.companyName,
        email: crmCustomer.email,
      } : null,
      number: call.number ? {
        id: call.number.id,
        name: call.number.name,
        digits: call.number.digits,
        country: call.number.country,
      } : null,
      rawDigits: call.raw_digits,
      recording: call.recording,
      voicemail: call.voicemail,
      tags: call.tags || [],
      comments: call.comments || [],
      asset: call.asset,
      transcript: call.transcript,
      participants: call.participants || [],
    };
    
    return Response.json({ call: formattedCall });
  } catch (error) {
    console.error('Error fetching Aircall call:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch call details' },
      { status: 500 }
    );
  }
}
