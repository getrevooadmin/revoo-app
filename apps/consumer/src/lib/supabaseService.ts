import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:55321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseConsumer = createClient(supabaseUrl, supabaseKey);

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

  static async getSimulatedDate(): Promise<string> {
    try {
      const res = await fetch('/api/dev/mock-time');
      if (res.ok) {
        const data = await res.json();
        if (data.mockDate) return data.mockDate;
      }
    } catch (e) {}
    return new Date().toISOString();
  }

  static async getActiveCampaign(businessId: string): Promise<any | null> {
    const nowStr = await this.getSimulatedDate();
    const { data: activeCampaigns } = await supabaseConsumer
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (activeCampaigns && activeCampaigns.length > 0) return activeCampaigns[0];

    const { data: graceCampaigns } = await supabaseConsumer
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'grace_period')
      .order('created_at', { ascending: false })
      .limit(1);

    if (graceCampaigns && graceCampaigns.length > 0) {
      const graceCampaign = graceCampaigns[0];
      const deadline = graceCampaign.grace_period_end_date || graceCampaign.end_date;
      if (!deadline || new Date(deadline).getTime() >= new Date(nowStr).getTime()) {
        return graceCampaign;
      }
    }

    return null;
  }

  static async getCustomerStatus(phone: string, businessId: string): Promise<any | null> {
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+') && /^[1-9]\d{6,14}$/.test(formattedPhone)) {
      formattedPhone = '+' + formattedPhone;
    }

    const activeCampaign = await this.getActiveCampaign(businessId);
    if (!activeCampaign) return null;

    const { data: interactions } = await supabaseConsumer
      .from('interactions')
      .select('points_earned')
      .eq('customer_phone', formattedPhone)
      .eq('campaign_id', activeCampaign.id)
      .in('status', ['accumulated', 'redimidos']);

    const rawBalance = interactions ? interactions.reduce((sum, i) => sum + (i.points_earned || 0), 0) : 0;
    const balance = Math.max(0, Math.round(rawBalance * 100) / 100);

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
