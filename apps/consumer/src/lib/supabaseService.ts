import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabaseConsumer = createClient(supabaseUrl, supabaseAnonKey);

export interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
}

export class ConsumerSupabaseService {
  static async getBusinesses(): Promise<Business[]> {
    const { data, error } = await supabaseConsumer
      .from('businesses')
      .select('*');

    if (error || !data) return [];
    return data as Business[];
  }

  static async getActiveCounterCode(businessId: string): Promise<any | null> {
    const { data, error } = await supabaseConsumer
      .from('one_time_codes')
      .select('*, loyalty_campaigns(title, status)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .eq('is_associated', false)
      .eq('is_redeemed', false)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return {
      code: data[0].code,
      purchase_amount: data[0].purchase_amount,
      invoice_number: data[0].invoice_number,
      campaign_id: data[0].campaign_id
    };
  }

  static async getActiveCampaign(businessId: string): Promise<any | null> {
    const nowStr = new Date().toISOString();
    const { data: campaigns } = await supabaseConsumer
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!campaigns || campaigns.length === 0) return null;
    return campaigns[0];
  }

  static async getCustomerStatus(phone: string, businessId: string): Promise<any | null> {
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+') && /^[1-9]\d{6,14}$/.test(formattedPhone)) {
      formattedPhone = '+' + formattedPhone;
    }

    const nowStr = new Date().toISOString();
    const { data: campaigns } = await supabaseConsumer
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!campaigns || campaigns.length === 0) return null;
    const activeCampaign = campaigns[0];

    const { data: interactions } = await supabaseConsumer
      .from('interactions')
      .select('points_earned')
      .eq('customer_phone', formattedPhone)
      .eq('campaign_id', activeCampaign.id)
      .neq('status', 'spam_hidden');

    const balance = interactions ? interactions.reduce((sum, i) => sum + (i.points_earned || 0), 0) : 0;

    return {
      customer_phone: formattedPhone,
      current_points: balance,
      target_points: activeCampaign.target_points,
      points_per_value_unit: activeCampaign.points_per_value_unit,
      tiers: activeCampaign.tiers || [],
      multipliers: activeCampaign.multipliers || [],
      current_stamps: balance,
      target_stamps: activeCampaign.target_points,
      prize_description: activeCampaign.prize_description,
      expiration_date: activeCampaign.end_date,
      campaign_id: activeCampaign.id,
      title: activeCampaign.title,
      description: activeCampaign.description
    };
  }
}
