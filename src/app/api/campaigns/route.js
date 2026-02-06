import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allCampaigns = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
    
    return Response.json(allCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return Response.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const [newCampaign] = await db.insert(campaigns).values({
      name: data.name,
      brief: data.brief || null,
      status: 'draft',
      filters: data.filters || [],
      selectedCustomerIds: data.selectedCustomerIds || [],
      sendEmail: data.sendEmail !== false,
      emailSendDate: data.emailSendDate ? new Date(data.emailSendDate) : null,
      emailSendTime: data.emailSendTime || null,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      sendCall: data.sendCall !== false,
      followUpDelayDays: data.followUpDelayDays || 3,
      callSendDate: data.callSendDate ? new Date(data.callSendDate) : null,
      callSendTime: data.callSendTime || null,
      callScript: data.callScript,
      callRetryCount: data.callRetryCount ?? 2,
    }).returning();
    
    return Response.json(newCampaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return Response.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
