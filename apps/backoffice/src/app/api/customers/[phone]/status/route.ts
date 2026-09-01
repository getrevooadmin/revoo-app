import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone: rawPhone } = await params;
    const url = new URL(request.url);
    const businessId = url.searchParams.get('business_id');

    if (!rawPhone || !businessId) {
      return NextResponse.json({ error: 'Falta teléfono o id del comercio' }, { status: 400 });
    }

    let phone = decodeURIComponent(rawPhone);
    if (!phone.startsWith('+') && /^[1-9]\d{6,14}$/.test(phone)) {
      phone = '+' + phone;
    }

    const nowStr = new Date().toISOString();
    const { data: campaigns } = await supabaseAdmin
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        customer_phone: phone,
        current_points: 0,
        target_points: 1000,
        prize_description: 'Sin campaña activa'
      });
    }

    const activeCampaign = campaigns[0];

    const { data: interactions } = await supabaseAdmin
      .from('interactions')
      .select('points_earned')
      .eq('customer_phone', phone)
      .eq('campaign_id', activeCampaign.id)
      .neq('status', 'spam_hidden');

    const balance = interactions
      ? Math.round(interactions.reduce((sum, i) => sum + Number(i.points_earned || 0), 0) * 100) / 100
      : 0;

    return NextResponse.json({
      customer_phone: phone,
      current_points: balance,
      target_points: activeCampaign.target_points,
      points_per_value_unit: activeCampaign.points_per_value_unit,
      tiers: activeCampaign.tiers || [],
      multipliers: activeCampaign.multipliers || [],
      current_stamps: balance,
      target_stamps: activeCampaign.target_points,
      prize_description: activeCampaign.prize_description,
      expiration_date: activeCampaign.end_date,
      campaign_id: activeCampaign.id
    });
  } catch (error: any) {
    console.error('Error fetching customer status:', error);
    return NextResponse.json({ error: 'Error consultando saldo del cliente' }, { status: 500 });
  }
}
