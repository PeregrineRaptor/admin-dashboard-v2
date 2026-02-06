import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, parseInt(id)));
    
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    return Response.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return Response.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        name: data.name,
        brief: data.brief || null,
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
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, parseInt(id)))
      .returning();
    
    if (!updatedCampaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    return Response.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return Response.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    await db.delete(campaigns).where(eq(campaigns.id, parseInt(id)));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return Response.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
