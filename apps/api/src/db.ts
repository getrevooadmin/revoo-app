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
  title?: string;
  description?: string;
  status?: 'active' | 'inactive';
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
  campaign_id: string | null;
  is_associated: boolean;
  is_active: boolean;
  is_redeemed: boolean;
  customer_phone: string | null;
  associated_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OneTimeCodeWithCampaign extends OneTimeCode {
  campaign?: {
    title: string;
    status: 'active' | 'inactive';
  } | null;
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
  generateOneTimeCode(businessId: string, code: string, campaignId: string, createdAt: string): Promise<OneTimeCode>;
  getOneTimeCode(code: string): Promise<OneTimeCode | null>;
  useOneTimeCode(code: string, customerPhone: string, associatedAt: string): Promise<boolean>;
  getRecentOneTimeCodes(businessId: string): Promise<OneTimeCodeWithCampaign[]>;
  deactivateOneTimeCode(code: string): Promise<boolean>;
  
  // Campaign Administration CRUD Methods
  getCampaign(id: string): Promise<LoyaltyCampaign | null>;
  getCampaigns(businessId: string): Promise<LoyaltyCampaign[]>;
  createCampaign(campaign: Omit<LoyaltyCampaign, 'id' | 'created_at'>): Promise<LoyaltyCampaign>;
  updateCampaign(id: string, campaign: Partial<LoyaltyCampaign>): Promise<LoyaltyCampaign | null>;
  deleteCampaign(id: string): Promise<boolean>;
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
      title: 'Campaña Carnívora Premium',
      description: 'Acumula sellos por cada consumo en cortes de carne seleccionados.',
      status: 'active',
      created_at: new Date('2026-05-31').toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      business_id: '88888888-8888-8888-8888-888888888888',
      target_stamps: 10,
      start_date: new Date('2026-06-01T00:00:00Z').toISOString(),
      end_date: new Date('2026-08-31T23:59:59Z').toISOString(),
      prize_description: 'Free 1-Month VIP Gym Membership Pass',
      title: 'Desafío Fitness Extremo',
      description: 'Entrena duro y obtén un mes gratis de membresía VIP.',
      status: 'active',
      created_at: new Date('2026-05-31').toISOString()
    }
  ];

  private interactions: Interaction[] = [];

  private codes: OneTimeCode[] = [
    {
      code: 'FEEB-PAMPA1',
      business_id: '11111111-1111-1111-1111-111111111111',
      campaign_id: '22222222-2222-2222-2222-222222222222',
      is_associated: false,
      is_active: true,
      is_redeemed: false,
      customer_phone: null,
      associated_at: null,
      redeemed_at: null,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString(),
      updated_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-ALPHA1',
      business_id: '88888888-8888-8888-8888-888888888888',
      campaign_id: '99999999-9999-9999-9999-999999999999',
      is_associated: false,
      is_active: true,
      is_redeemed: false,
      customer_phone: null,
      associated_at: null,
      redeemed_at: null,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString(),
      updated_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-EXPIRED',
      business_id: '11111111-1111-1111-1111-111111111111',
      campaign_id: '22222222-2222-2222-2222-222222222222',
      is_associated: false,
      is_active: true,
      is_redeemed: false,
      customer_phone: null,
      associated_at: null,
      redeemed_at: null,
      created_at: new Date('2026-06-12T12:00:00-06:00').toISOString(),
      updated_at: new Date('2026-06-12T12:00:00-06:00').toISOString()
    },
    {
      code: 'FEEB-USED',
      business_id: '11111111-1111-1111-1111-111111111111',
      campaign_id: '22222222-2222-2222-2222-222222222222',
      is_associated: true,
      is_active: true,
      is_redeemed: false,
      customer_phone: '+50588888888',
      associated_at: new Date('2026-06-14T12:00:00-06:00').toISOString(),
      redeemed_at: null,
      created_at: new Date('2026-06-14T12:00:00-06:00').toISOString(),
      updated_at: new Date('2026-06-14T12:00:00-06:00').toISOString()
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
    const sortedCampaigns = [...this.campaigns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedCampaigns.find(c => {
      if (c.business_id !== businessId) return false;
      if (c.status === 'inactive') return false;
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
    const nowStr = new Date('2026-06-14T15:41:53-06:00').toISOString(); // mock context date
    for (let i = 0; i < targetStamps; i++) {
      const idx = userAccIndexes[i].idx;
      const inter = this.interactions[idx];
      inter.status = 'redimidos';
      
      // Mark associated code as redeemed
      if (inter.invoice_number) {
        const codeRecord = this.codes.find(c => c.code.toUpperCase() === inter.invoice_number!.toUpperCase());
        if (codeRecord) {
          codeRecord.is_redeemed = true;
          codeRecord.redeemed_at = nowStr;
          codeRecord.updated_at = nowStr;
        }
      }
    }

    return true;
  }

  async getRecentInteractions(businessId: string): Promise<Interaction[]> {
    return this.interactions
      .filter(i => i.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async generateOneTimeCode(businessId: string, code: string, campaignId: string, createdAt: string): Promise<OneTimeCode> {
    const newCode: OneTimeCode = {
      code,
      business_id: businessId,
      campaign_id: campaignId,
      is_associated: false,
      is_active: true,
      is_redeemed: false,
      customer_phone: null,
      associated_at: null,
      redeemed_at: null,
      created_at: createdAt,
      updated_at: createdAt
    };
    this.codes.unshift(newCode);
    return newCode;
  }

  async getOneTimeCode(code: string): Promise<OneTimeCode | null> {
    return this.codes.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }

  async useOneTimeCode(code: string, customerPhone: string, associatedAt: string): Promise<boolean> {
    const found = this.codes.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      found.is_associated = true;
      found.customer_phone = customerPhone;
      found.associated_at = associatedAt;
      found.updated_at = associatedAt;
      return true;
    }
    return false;
  }

  async deactivateOneTimeCode(code: string): Promise<boolean> {
    const found = this.codes.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (found) {
      found.is_active = false;
      found.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  async getRecentOneTimeCodes(businessId: string): Promise<OneTimeCodeWithCampaign[]> {
    const filteredCodes = this.codes
      .filter(c => c.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return filteredCodes.map(c => {
      const campaign = this.campaigns.find(camp => camp.id === c.campaign_id);
      return {
        ...c,
        campaign: campaign ? { title: campaign.title || 'Nueva Campaña', status: campaign.status || 'active' } : null
      };
    });
  }

  async getCampaign(id: string): Promise<LoyaltyCampaign | null> {
    return this.campaigns.find(c => c.id === id) || null;
  }

  async getCampaigns(businessId: string): Promise<LoyaltyCampaign[]> {
    return this.campaigns
      .filter(c => c.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createCampaign(campaign: Omit<LoyaltyCampaign, 'id' | 'created_at'>): Promise<LoyaltyCampaign> {
    const newCampaign: LoyaltyCampaign = {
      ...campaign,
      id: crypto.randomUUID ? crypto.randomUUID() : `camp-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: campaign.title || 'Nueva Campaña',
      description: campaign.description || '',
      status: campaign.status || 'active',
      created_at: new Date().toISOString()
    };
    this.campaigns.unshift(newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<LoyaltyCampaign>): Promise<LoyaltyCampaign | null> {
    const idx = this.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.campaigns[idx] = {
      ...this.campaigns[idx],
      ...updates
    };
    return this.campaigns[idx];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const initialLen = this.campaigns.length;
    this.campaigns = this.campaigns.filter(c => c.id !== id);
    return this.campaigns.length < initialLen;
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
      .eq('status', 'active')
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
    // 1. Fetch the oldest N accumulated items including invoice_number
    const { data, error } = await this.client
      .from('interactions')
      .select('id, invoice_number')
      .eq('customer_phone', phone)
      .eq('campaign_id', campaignId)
      .eq('status', 'accumulated')
      .order('created_at', { ascending: true })
      .limit(targetStamps);

    if (error || !data || data.length < targetStamps) {
      return false;
    }

    const idsToUpdate = data.map(item => item.id);
    const codesToUpdate = data.map(item => item.invoice_number).filter(Boolean) as string[];

    // 2. Perform batch update of interactions
    const { error: updateError } = await this.client
      .from('interactions')
      .update({ status: 'redimidos' })
      .in('id', idsToUpdate);

    if (updateError) return false;

    // 3. Mark codes as redeemed
    if (codesToUpdate.length > 0) {
      const { error: codeError } = await this.client
        .from('one_time_codes')
        .update({ 
          is_redeemed: true, 
          redeemed_at: new Date('2026-06-14T15:41:53-06:00').toISOString(), 
          updated_at: new Date('2026-06-14T15:41:53-06:00').toISOString() 
        })
        .in('code', codesToUpdate);
      if (codeError) {
        console.warn('Failed to mark codes as redeemed in Supabase:', codeError.message);
      }
    }

    return true;
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

  async generateOneTimeCode(businessId: string, code: string, campaignId: string, createdAt: string): Promise<OneTimeCode> {
    const { data, error } = await this.client
      .from('one_time_codes')
      .insert([{ 
        business_id: businessId, 
        campaign_id: campaignId, 
        code, 
        is_associated: false, 
        is_active: true, 
        is_redeemed: false,
        customer_phone: null, 
        associated_at: null,
        redeemed_at: null,
        created_at: createdAt,
        updated_at: createdAt
      }])
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

  async useOneTimeCode(code: string, customerPhone: string, associatedAt: string): Promise<boolean> {
    const { error } = await this.client
      .from('one_time_codes')
      .update({ 
        is_associated: true, 
        customer_phone: customerPhone, 
        associated_at: associatedAt, 
        updated_at: associatedAt 
      })
      .eq('code', code);
    return !error;
  }

  async deactivateOneTimeCode(code: string): Promise<boolean> {
    const { error } = await this.client
      .from('one_time_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('code', code);
    return !error;
  }

  async getRecentOneTimeCodes(businessId: string): Promise<OneTimeCodeWithCampaign[]> {
    const { data, error } = await this.client
      .from('one_time_codes')
      .select('*, loyalty_campaigns(title, status)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    
    return data.map((item: any) => ({
      code: item.code,
      business_id: item.business_id,
      campaign_id: item.campaign_id,
      is_associated: item.is_associated,
      is_active: item.is_active,
      is_redeemed: item.is_redeemed,
      customer_phone: item.customer_phone,
      associated_at: item.associated_at,
      redeemed_at: item.redeemed_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      campaign: item.loyalty_campaigns ? {
        title: item.loyalty_campaigns.title,
        status: item.loyalty_campaigns.status
      } : null
    }));
  }

  async getCampaign(id: string): Promise<LoyaltyCampaign | null> {
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as LoyaltyCampaign;
  }

  async getCampaigns(businessId: string): Promise<LoyaltyCampaign[]> {
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as LoyaltyCampaign[];
  }

  async createCampaign(campaign: Omit<LoyaltyCampaign, 'id' | 'created_at'>): Promise<LoyaltyCampaign> {
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .insert([campaign])
      .select()
      .single();
    if (error || !data) {
      throw new Error(`Failed to create campaign: ${error?.message}`);
    }
    return data as LoyaltyCampaign;
  }

  async updateCampaign(id: string, updates: Partial<LoyaltyCampaign>): Promise<LoyaltyCampaign | null> {
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data as LoyaltyCampaign;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('loyalty_campaigns')
      .delete()
      .eq('id', id);
    return !error;
  }
}

// Export database singleton
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const db: DBService = (supabaseUrl && supabaseKey) 
  ? new SupabaseDBService(supabaseUrl, supabaseKey) 
  : new MemoryDBService();
