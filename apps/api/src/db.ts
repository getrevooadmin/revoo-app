import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types and schemas
export interface Business {
  id: string;
  name: string;
  created_at: string;
}

export interface LoyaltyCampaign {
  id: string;
  business_id: string;
  target_stamps: number;
  start_date: string;
  end_date: string;
  prize_description: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  business_id: string;
  campaign_id: string | null;
  customer_phone: string;
  invoice_number: string | null;
  feedback_text: string;
  ai_sentiment: 'positive' | 'negative' | 'neutral' | null;
  ai_category: 'service' | 'time' | 'quality' | 'cleanliness' | 'other' | null;
  ai_spam_confidence: boolean;
  status: 'accumulated' | 'redimidos' | 'spam_hidden';
  created_at: string;
}

export interface OneTimeCode {
  code: string;
  business_id: string;
  is_used: boolean;
  created_at: string;
}

export interface DBService {
  getBusiness(id: string): Promise<Business | null>;
  getActiveCampaign(businessId: string, currentDate: string): Promise<LoyaltyCampaign | null>;
  checkInvoiceExists(businessId: string, invoiceNumber: string): Promise<boolean>;
  checkRecentComplaintCooldown(phone: string, businessId: string): Promise<boolean>;
  createInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction>;
  getAccumulatedStampsCount(phone: string, campaignId: string): Promise<{ count: number; campaign: LoyaltyCampaign | null }>;
  redeemStamps(phone: string, campaignId: string, targetStamps: number): Promise<boolean>;
  getRecentInteractions(businessId: string): Promise<Interaction[]>;
  getAllBusinesses(): Promise<Business[]>;
  generateOneTimeCode(businessId: string, code: string, createdAt: string): Promise<OneTimeCode>;
  getOneTimeCode(code: string): Promise<OneTimeCode | null>;
  useOneTimeCode(code: string): Promise<boolean>;
  getRecentOneTimeCodes(businessId: string): Promise<OneTimeCode[]>;
}

// ==========================================
// IN-MEMORY MOCK STORE IMPLEMENTATION
// ==========================================
class MemoryDBService implements DBService {
  private businesses: Business[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'La Pampa Steakhouse',
      created_at: new Date('2026-01-01').toISOString()
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      name: 'Alpha Fitness Gym',
      created_at: new Date('2026-01-01').toISOString()
    }
  ];

  private campaigns: LoyaltyCampaign[] = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      business_id: '11111111-1111-1111-1111-111111111111',
      target_stamps: 6,
      start_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      end_date: new Date('2026-07-31T23:59:59Z').toISOString(),
      prize_description: 'Free Premium T-Bone Steak & House Wine',
      created_at: new Date('2026-05-31').toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      business_id: '88888888-8888-8888-8888-888888888888',
      target_stamps: 10,
      start_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      end_date: new Date('2026-08-31T23:59:59Z').toISOString(),
      prize_description: 'Free 1-Month VIP Gym Membership Pass',
      created_at: new Date('2026-05-31').toISOString()
    }
  ];

  private interactions: Interaction[] = [];

  private codes: OneTimeCode[] = [
    {
      code: 'FEEB-PAMPA1',
      business_id: '11111111-1111-1111-1111-111111111111',
      is_used: false,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-ALPHA1',
      business_id: '88888888-8888-8888-8888-888888888888',
      is_used: false,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-EXPIRED',
      business_id: '11111111-1111-1111-1111-111111111111',
      is_used: false,
      created_at: new Date('2026-06-12T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-USED',
      business_id: '11111111-1111-1111-1111-111111111111',
      is_used: true,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
    }
  ];

  constructor() {
    console.log('Using in-memory mock database store. Seeded default business, campaign, and one-time codes.');
    // Seed some mock interactions for visual quality in the dashboard
    this.seedMockData();
  }

  private seedMockData() {
    const defaultBusinessId = '11111111-1111-1111-1111-111111111111';
    const campaignId = '22222222-2222-2222-2222-222222222222';
    
    const initialInteractions: Omit<Interaction, 'id' | 'created_at'>[] = [
      {
        business_id: defaultBusinessId,
        campaign_id: campaignId,
        customer_phone: '+50588888888',
        invoice_number: 'INV-1001',
        feedback_text: 'Excelente carne, el servicio fue rápido y muy atento.',
        ai_sentiment: 'positive',
        ai_category: 'quality',
        ai_spam_confidence: false,
        status: 'accumulated'
      },
      {
        business_id: defaultBusinessId,
        campaign_id: campaignId,
        customer_phone: '+50588888888',
        invoice_number: 'INV-1002',
        feedback_text: 'La hamburguesa estuvo fabulosa. Volveré pronto.',
        ai_sentiment: 'positive',
        ai_category: 'quality',
        ai_spam_confidence: false,
        status: 'accumulated'
      },
      {
        business_id: defaultBusinessId,
        campaign_id: null,
        customer_phone: '+50577777777',
        invoice_number: null,
        feedback_text: 'Estuve esperando una mesa por 30 minutos, nadie me atendió.',
        ai_sentiment: 'negative',
        ai_category: 'time',
        ai_spam_confidence: false,
        status: 'accumulated'
      },
      {
        business_id: defaultBusinessId,
        campaign_id: campaignId,
        customer_phone: '+50555555555',
        invoice_number: 'INV-5501',
        feedback_text: 'El baño estaba bastante sucio y sin papel higiénico.',
        ai_sentiment: 'negative',
        ai_category: 'cleanliness',
        ai_spam_confidence: false,
        status: 'accumulated'
      },
      {
        business_id: defaultBusinessId,
        campaign_id: campaignId,
        customer_phone: '+50587878787',
        invoice_number: 'INV-9999',
        feedback_text: 'asdfasdfasdfasdfasdfasdfasdfasdfasdfasdf',
        ai_sentiment: 'neutral',
        ai_category: 'other',
        ai_spam_confidence: true,
        status: 'spam_hidden'
      }
    ];

    let baseTime = new Date('2026-06-14T10:00:00Z').getTime();
    initialInteractions.forEach((inter, index) => {
      this.interactions.push({
        ...inter,
        id: `mock-uuid-${index}`,
        created_at: new Date(baseTime + index * 600000).toISOString() // 10 min intervals
      });
    });
  }

  async getBusiness(id: string): Promise<Business | null> {
    return this.businesses.find(b => b.id === id) || null;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return this.businesses;
  }

  async getActiveCampaign(businessId: string, currentDate: string): Promise<LoyaltyCampaign | null> {
    const curTime = new Date(currentDate).getTime();
    return this.campaigns.find(c => {
      if (c.business_id !== businessId) return false;
      const start = new Date(c.start_date).getTime();
      const end = new Date(c.end_date).getTime();
      return curTime >= start && curTime <= end;
    }) || null;
  }

  async checkInvoiceExists(businessId: string, invoiceNumber: string): Promise<boolean> {
    return this.interactions.some(
      i => i.business_id === businessId && 
           i.invoice_number?.toLowerCase() === invoiceNumber.toLowerCase()
    );
  }

  async checkRecentComplaintCooldown(phone: string, businessId: string): Promise<boolean> {
    const twentyFourHoursAgo = new Date('2026-06-14T15:41:53-06:00').getTime() - 24 * 60 * 60 * 1000;
    
    return this.interactions.some(
      i => i.customer_phone === phone && 
           i.business_id === businessId && 
           i.invoice_number === null && 
           new Date(i.created_at).getTime() > twentyFourHoursAgo
    );
  }

  async createInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> {
    const newInteraction: Interaction = {
      ...interaction,
      id: crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date('2026-06-14T15:41:53-06:00').toISOString()
    };
    this.interactions.unshift(newInteraction); // add to front
    return newInteraction;
  }

  async getAccumulatedStampsCount(phone: string, campaignId: string): Promise<{ count: number; campaign: LoyaltyCampaign | null }> {
    const campaign = this.campaigns.find(c => c.id === campaignId) || null;
    const count = this.interactions.filter(
      i => i.customer_phone === phone && 
           i.campaign_id === campaignId && 
           i.status === 'accumulated'
    ).length;
    return { count, campaign };
  }

  async redeemStamps(phone: string, campaignId: string, targetStamps: number): Promise<boolean> {
    // Get indexes of accumulated interactions for this user and campaign, sorted oldest first
    const userAccIndexes = this.interactions
      .map((item, idx) => ({ item, idx }))
      .filter(x => x.item.customer_phone === phone && 
                  x.item.campaign_id === campaignId && 
                  x.item.status === 'accumulated')
      .sort((a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime());

    if (userAccIndexes.length < targetStamps) {
      return false;
    }

    // Update the oldest targetStamps to redimidos
    for (let i = 0; i < targetStamps; i++) {
      const idx = userAccIndexes[i].idx;
      this.interactions[idx].status = 'redimidos';
    }

    return true;
  }

  async getRecentInteractions(businessId: string): Promise<Interaction[]> {
    return this.interactions
      .filter(i => i.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async generateOneTimeCode(businessId: string, code: string, createdAt: string): Promise<OneTimeCode> {
    const newCode: OneTimeCode = {
      code,
      business_id: businessId,
      is_used: false,
      created_at: createdAt
    };
    this.codes.unshift(newCode);
    return newCode;
  }

  async getOneTimeCode(code: string): Promise<OneTimeCode | null> {
    return this.codes.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }

  async useOneTimeCode(code: string): Promise<boolean> {
    const found = this.codes.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      found.is_used = true;
      return true;
    }
    return false;
  }

  async getRecentOneTimeCodes(businessId: string): Promise<OneTimeCode[]> {
    return this.codes
      .filter(c => c.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

// ==========================================
// SUPABASE DATABASE IMPLEMENTATION
// ==========================================
class SupabaseDBService implements DBService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
    console.log('Connected to Supabase PostgreSQL database.');
  }

  async getBusiness(id: string): Promise<Business | null> {
    const { data, error } = await this.client
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return data as Business;
  }

  async getAllBusinesses(): Promise<Business[]> {
    const { data, error } = await this.client
      .from('businesses')
      .select('*');
    
    if (error || !data) return [];
    return data as Business[];
  }

  async getActiveCampaign(businessId: string, currentDate: string): Promise<LoyaltyCampaign | null> {
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .lte('start_date', currentDate)
      .gte('end_date', currentDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0] as LoyaltyCampaign;
  }

  async checkInvoiceExists(businessId: string, invoiceNumber: string): Promise<boolean> {
    const { count, error } = await this.client
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('invoice_number', invoiceNumber);
    
    if (error || count === null) return false;
    return count > 0;
  }

  async checkRecentComplaintCooldown(phone: string, businessId: string): Promise<boolean> {
    // Calculates 24 hours ago from current ISO string
    const twentyFourHoursAgo = new Date(new Date('2026-06-14T15:41:53-06:00').getTime() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await this.client
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_phone', phone)
      .eq('business_id', businessId)
      .is('invoice_number', null)
      .gt('created_at', twentyFourHoursAgo);

    if (error || count === null) return false;
    return count > 0;
  }

  async createInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> {
    const { data, error } = await this.client
      .from('interactions')
      .insert([interaction])
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to insert interaction: ${error?.message}`);
    }
    return data as Interaction;
  }

  async getAccumulatedStampsCount(phone: string, campaignId: string): Promise<{ count: number; campaign: LoyaltyCampaign | null }> {
    const { data: campaign, error: campaignError } = await this.client
      .from('loyalty_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    const { count, error } = await this.client
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_phone', phone)
      .eq('campaign_id', campaignId)
      .eq('status', 'accumulated');

    return {
      count: count || 0,
      campaign: campaignError ? null : (campaign as LoyaltyCampaign)
    };
  }

  async redeemStamps(phone: string, campaignId: string, targetStamps: number): Promise<boolean> {
    // 1. Fetch the oldest N accumulated items
    const { data, error } = await this.client
      .from('interactions')
      .select('id')
      .eq('customer_phone', phone)
      .eq('campaign_id', campaignId)
      .eq('status', 'accumulated')
      .order('created_at', { ascending: true })
      .limit(targetStamps);

    if (error || !data || data.length < targetStamps) {
      return false;
    }

    const idsToUpdate = data.map(item => item.id);

    // 2. Perform batch update
    const { error: updateError } = await this.client
      .from('interactions')
      .update({ status: 'redimidos' })
      .in('id', idsToUpdate);

    return !updateError;
  }

  async getRecentInteractions(businessId: string): Promise<Interaction[]> {
    const { data, error } = await this.client
      .from('interactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Interaction[];
  }

  async generateOneTimeCode(businessId: string, code: string, createdAt: string): Promise<OneTimeCode> {
    const { data, error } = await this.client
      .from('one_time_codes')
      .insert([{ business_id: businessId, code, is_used: false, created_at: createdAt }])
      .select()
      .single();
    if (error || !data) {
      throw new Error(`Failed to generate code: ${error?.message}`);
    }
    return data as OneTimeCode;
  }

  async getOneTimeCode(code: string): Promise<OneTimeCode | null> {
    const { data, error } = await this.client
      .from('one_time_codes')
      .select('*')
      .eq('code', code)
      .single();
    if (error || !data) return null;
    return data as OneTimeCode;
  }

  async useOneTimeCode(code: string): Promise<boolean> {
    const { error } = await this.client
      .from('one_time_codes')
      .update({ is_used: true })
      .eq('code', code);
    return !error;
  }

  async getRecentOneTimeCodes(businessId: string): Promise<OneTimeCode[]> {
    const { data, error } = await this.client
      .from('one_time_codes')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as OneTimeCode[];
  }
}

// Export database singleton
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const db: DBService = (supabaseUrl && supabaseKey) 
  ? new SupabaseDBService(supabaseUrl, supabaseKey) 
  : new MemoryDBService();
