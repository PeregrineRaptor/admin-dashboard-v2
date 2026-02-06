import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { ilike, or, sql } from 'drizzle-orm';

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

async function findCustomersByPhones(phoneNumbers) {
  const normalizedPhones = phoneNumbers
    .map(p => normalizePhone(p))
    .filter(p => p && p.length === 10);
  
  if (normalizedPhones.length === 0) return {};
  
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
    
    const customerMap = {};
    for (const customer of results) {
      const normalizedCustomerPhone = normalizePhone(customer.phone);
      if (normalizedCustomerPhone && normalizedPhones.includes(normalizedCustomerPhone)) {
        customerMap[normalizedCustomerPhone] = customer;
      }
    }
    
    return customerMap;
  } catch (error) {
    console.error('Error finding customers by phones:', error);
    return {};
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '25';
    const order = searchParams.get('order') || 'desc';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    let url = `${AIRCALL_API_URL}/calls?page=${page}&per_page=${perPage}&order=${order}`;
    
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    
    const response = await fetch(url, {
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
      }
      
      return Response.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    const phoneNumbers = [...new Set(data.calls?.map(call => call.raw_digits).filter(Boolean) || [])];
    const customerMatches = await findCustomersByPhones(phoneNumbers);
    
    const calls = data.calls?.map(call => {
      const normalizedPhone = normalizePhone(call.raw_digits);
      const crmCustomer = normalizedPhone ? customerMatches[normalizedPhone] : null;
      
      return {
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
        } : null,
        contact: call.contact ? {
          id: call.contact.id,
          firstName: call.contact.first_name,
          lastName: call.contact.last_name,
          company: call.contact.company_name,
          phoneNumbers: call.contact.phone_numbers,
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
        } : null,
        rawDigits: call.raw_digits,
        recording: call.recording,
        voicemail: call.voicemail,
        tags: call.tags || [],
        comments: call.comments || [],
        asset: call.asset,
      };
    }) || [];
    
    return Response.json({
      calls,
      meta: {
        count: data.meta?.count || 0,
        total: data.meta?.total || 0,
        currentPage: data.meta?.current_page || 1,
        perPage: data.meta?.per_page || 25,
        nextPageLink: data.meta?.next_page_link,
        previousPageLink: data.meta?.previous_page_link,
      },
    });
  } catch (error) {
    console.error('Error fetching Aircall calls:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}
