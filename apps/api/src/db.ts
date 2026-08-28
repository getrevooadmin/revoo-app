import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';


// Database types and schemas
export function normalizePhoneForPin(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 8) {
    return '505' + digits;
  }
  return digits;
}

export function generateDeterministicCustomerPin(phone: string): string {
  const normalized = normalizePhoneForPin(phone);
  if (!normalized) return '4932';
  
  let hash = 5381;
  const salt = 'revoo-customer-pin-v1';
  const str = normalized + salt;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  const pinNum = (Math.abs(hash) % 9000) + 1000;
  return pinNum.toString();
}

export interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
  created_at: string;
}

export interface CampaignTier {
  id?: string;
  title: string;
  target_points: number;
  prize_description: string;
  monetary_value?: number;
  icon?: string;
}

export interface CampaignMultiplier {
  id?: string;
  title: string;
  multiplier: number;
  applies_to: string;
  badge_text?: string;
  is_active: boolean;
}

export interface LoyaltyCampaign {
  id: string;
  business_id: string;
  target_points: number;
  points_per_value_unit: number;
  start_date: string;
  end_date: string;
  prize_description: string;
  title?: string;
  description?: string;
  status?: 'active' | 'inactive';
  tiers?: CampaignTier[];
  multipliers?: CampaignMultiplier[];
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
  points_earned: number;
  created_at: string;
}

export interface OneTimeCode {
  code: string;
  business_id: string;
  campaign_id: string | null;
  is_associated: boolean;
  is_active: boolean;
  is_redeemed: boolean;
  is_ready_for_scan?: boolean;
  is_scanned?: boolean;
  customer_phone: string | null;
  associated_at: string | null;
  redeemed_at: string | null;
  purchase_amount: number;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OneTimeCodeWithCampaign extends OneTimeCode {
  campaign?: {
    title: string;
    status: 'active' | 'inactive';
  } | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'merchant' | 'consumer' | 'admin';
  business_id: string | null;
  phone: string | null;
  created_at?: string;
}

export interface DBService {
  getBusiness(id: string): Promise<Business | null>;
  getActiveCampaign(businessId: string, currentDate: string): Promise<LoyaltyCampaign | null>;
  checkInvoiceExists(businessId: string, invoiceNumber: string): Promise<boolean>;
  checkRecentComplaintCooldown(phone: string, businessId: string): Promise<boolean>;
  hasInteractions(phone: string, businessId: string): Promise<boolean>;
  createInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction>;
  getCustomerPointsBalance(phone: string, campaignId: string): Promise<{ balance: number; campaign: LoyaltyCampaign | null }>;
  redeemPoints(phone: string, campaignId: string, pointsToRedeem: number): Promise<boolean>;
  getRecentInteractions(businessId: string): Promise<Interaction[]>;
  getAllBusinesses(): Promise<Business[]>;
  generateOneTimeCode(businessId: string, code: string, campaignId: string, createdAt: string, purchaseAmount?: number, invoiceNumber?: string | null): Promise<OneTimeCode>;
  getOneTimeCode(code: string): Promise<OneTimeCode | null>;
  useOneTimeCode(code: string, customerPhone: string, associatedAt: string): Promise<boolean>;
  getRecentOneTimeCodes(businessId: string): Promise<OneTimeCodeWithCampaign[]>;
  deactivateOneTimeCode(code: string): Promise<boolean>;
  setReadyForScanCode(businessId: string, code: string): Promise<boolean>;
  getReadyForScanCode(businessId: string): Promise<OneTimeCodeWithCampaign | null>;
  
  // Campaign Administration CRUD Methods
  getCampaign(id: string): Promise<LoyaltyCampaign | null>;
  getCampaigns(businessId: string): Promise<LoyaltyCampaign[]>;
  createCampaign(campaign: Omit<LoyaltyCampaign, 'id' | 'created_at'>): Promise<LoyaltyCampaign>;
  updateCampaign(id: string, campaign: Partial<LoyaltyCampaign>): Promise<LoyaltyCampaign | null>;
  deleteCampaign(id: string): Promise<boolean>;

  // Customer PIN Methods
  getCustomerPin(phone: string): Promise<string>;

  // Profile and Multi-Tenant Auth Methods
  getProfile(id: string): Promise<Profile | null>;
  createProfile(profile: Profile): Promise<Profile>;
  createBusiness(name: string): Promise<Business>;
  updateBusiness(id: string, updates: { name?: string; logo_url?: string | null }): Promise<Business | null>;
  uploadBusinessLogo(businessId: string, base64Data: string): Promise<string>;
}

// ==========================================
// SUPABASE DATABASE IMPLEMENTATION
// ==========================================
class SupabaseDBService implements DBService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: {
        persistSession: false
      },
      realtime: {
        transport: ws as any
      }
    });
    console.log('Connected to Supabase PostgreSQL database.');
  }

  private customerPins: Map<string, string> = new Map([
    ['88888888', '4932']
  ]);

  async getCustomerPin(phone: string): Promise<string> {
    const key = normalizePhoneForPin(phone);
    if (!key) return '4932';
    if (this.customerPins.has(key)) {
      return this.customerPins.get(key)!;
    }
    const pin = generateDeterministicCustomerPin(phone);
    this.customerPins.set(key, pin);
    return pin;
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

  async hasInteractions(phone: string, businessId: string): Promise<boolean> {
    const { count, error } = await this.client
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_phone', phone)
      .eq('business_id', businessId);

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

  async getCustomerPointsBalance(phone: string, campaignId: string): Promise<{ balance: number; campaign: LoyaltyCampaign | null }> {
    const { data: campaign, error: campaignError } = await this.client
      .from('loyalty_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    const { data, error } = await this.client
      .from('interactions')
      .select('points_earned')
      .eq('customer_phone', phone)
      .eq('campaign_id', campaignId)
      .neq('status', 'spam_hidden');

    const balance = data ? data.reduce((sum: number, i: any) => sum + (i.points_earned || 0), 0) : 0;

    return {
      balance,
      campaign: campaignError ? null : (campaign as LoyaltyCampaign)
    };
  }

  async redeemPoints(phone: string, campaignId: string, pointsToRedeem: number): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;

    const { balance } = await this.getCustomerPointsBalance(phone, campaignId);
    if (balance < pointsToRedeem) {
      return false;
    }

    const nowStr = new Date('2026-06-14T15:41:53-06:00').toISOString(); // mock context date

    // Create negative points entry
    const { error: insertError } = await this.client
      .from('interactions')
      .insert([{
        business_id: campaign.business_id,
        campaign_id: campaignId,
        customer_phone: phone,
        invoice_number: null,
        feedback_text: 'Canje de premio por puntos',
        ai_sentiment: 'neutral',
        ai_category: 'other',
        ai_spam_confidence: false,
        status: 'redimidos',
        points_earned: -pointsToRedeem
      }]);

    if (insertError) return false;

    // Mark associated codes as redeemed
    const { error: codeError } = await this.client
      .from('one_time_codes')
      .update({ 
        is_redeemed: true, 
        redeemed_at: nowStr, 
        updated_at: nowStr 
      })
      .eq('customer_phone', phone)
      .eq('campaign_id', campaignId)
      .eq('is_redeemed', false);

    if (codeError) {
      console.warn('Failed to mark codes as redeemed in Supabase:', codeError.message);
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

  async generateOneTimeCode(businessId: string, code: string, campaignId: string, createdAt: string, purchaseAmount: number = 0, invoiceNumber: string | null = null): Promise<OneTimeCode> {
    try {
      await this.client.from('one_time_codes').update({ is_ready_for_scan: false }).eq('business_id', businessId);
    } catch (e) {}

    const { data, error } = await this.client
      .from('one_time_codes')
      .insert([{ 
        business_id: businessId, 
        campaign_id: campaignId, 
        code, 
        is_associated: false, 
        is_active: true, 
        is_redeemed: false,
        is_ready_for_scan: true,
        is_scanned: false,
        customer_phone: null, 
        associated_at: null,
        redeemed_at: null,
        purchase_amount: purchaseAmount,
        invoice_number: invoiceNumber || null,
        created_at: createdAt,
        updated_at: createdAt
      }])
      .select()
      .single();

    if (error || !data) {
      const { data: fallbackData, error: fallbackError } = await this.client
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
          purchase_amount: purchaseAmount,
          invoice_number: invoiceNumber || null,
          created_at: createdAt,
          updated_at: createdAt
        }])
        .select()
        .single();
      if (fallbackError || !fallbackData) {
        throw new Error(`Failed to generate one time code in Supabase: ${fallbackError?.message || error?.message}`);
      }
      return {
        ...fallbackData,
        is_ready_for_scan: true,
        is_scanned: false
      } as OneTimeCode;
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

  async setReadyForScanCode(businessId: string, code: string): Promise<boolean> {
    try {
      const nowIso = new Date().toISOString();
      
      // 1. Clear ready flag on all business codes
      const { error: errClear } = await this.client
        .from('one_time_codes')
        .update({ is_ready_for_scan: false })
        .eq('business_id', businessId);
      if (errClear) console.warn('Warning clearing is_ready_for_scan:', errClear.message);

      // 2. Set ready flag and update timestamp on selected code
      const { error: errSet } = await this.client
        .from('one_time_codes')
        .update({ is_ready_for_scan: true, updated_at: nowIso })
        .eq('code', code);

      if (errSet) {
        console.warn('Warning setting is_ready_for_scan on target, attempting updated_at fallback:', errSet.message);
        const { error: errFallback } = await this.client
          .from('one_time_codes')
          .update({ updated_at: nowIso })
          .eq('code', code);

        if (errFallback) {
          console.error('Error in setReadyForScanCode fallback:', errFallback.message);
          return false;
        }
      }

      return true;
    } catch (e: any) {
      console.error('Exception in setReadyForScanCode:', e);
      return false;
    }
  }

  async getReadyForScanCode(businessId: string): Promise<OneTimeCodeWithCampaign | null> {
    const isNotExpired = (item: any) => {
      if (!item || !item.created_at) return false;
      const ageMs = Date.now() - new Date(item.created_at).getTime();
      return ageMs <= 24 * 60 * 60 * 1000;
    };

    try {
      const { data } = await this.client
        .from('one_time_codes')
        .select('*, loyalty_campaigns(title, status)')
        .eq('business_id', businessId)
        .eq('is_ready_for_scan', true)
        .eq('is_active', true)
        .eq('is_associated', false)
        .eq('is_redeemed', false)
        .order('updated_at', { ascending: false });

      if (data && data.length > 0) {
        const validItem = data.find(isNotExpired);
        if (validItem) {
          return {
            ...validItem,
            is_ready_for_scan: true,
            campaign: validItem.loyalty_campaigns ? { title: validItem.loyalty_campaigns.title, status: validItem.loyalty_campaigns.status } : null
          };
        }
      }
    } catch (e) {}

    // Fallback: read the latest active unassociated non-expired code for this business by updated_at / created_at DESC
    try {
      const { data } = await this.client
        .from('one_time_codes')
        .select('*, loyalty_campaigns(title, status)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('is_associated', false)
        .eq('is_redeemed', false)
        .order('updated_at', { ascending: false });

      if (data && data.length > 0) {
        const validItem = data.find(isNotExpired);
        if (validItem) {
          return {
            ...validItem,
            is_ready_for_scan: true,
            campaign: validItem.loyalty_campaigns ? { title: validItem.loyalty_campaigns.title, status: validItem.loyalty_campaigns.status } : null
          };
        }
      }
    } catch (e) {}

    return null;
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
    
    const isNotExpired = (item: any) => {
      if (!item || !item.created_at) return false;
      const ageMs = Date.now() - new Date(item.created_at).getTime();
      return ageMs <= 24 * 60 * 60 * 1000;
    };

    // Find the single active unassociated non-expired code that is ready for scan:
    const explicitReady = data
      .filter((item: any) => item.is_ready_for_scan === true && item.is_active && !item.is_associated && !item.is_redeemed && isNotExpired(item))
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0];

    const fallbackReady = data
      .filter((item: any) => item.is_active && !item.is_associated && !item.is_redeemed && isNotExpired(item))
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0];

    const activeReadyCode = explicitReady ? explicitReady.code : (fallbackReady ? fallbackReady.code : null);

    return data.map((item: any) => ({
      code: item.code,
      business_id: item.business_id,
      campaign_id: item.campaign_id,
      is_associated: item.is_associated,
      is_active: item.is_active,
      is_redeemed: item.is_redeemed,
      is_ready_for_scan: activeReadyCode === item.code,
      is_scanned: item.is_scanned ?? false,
      customer_phone: item.customer_phone,
      associated_at: item.associated_at,
      redeemed_at: item.redeemed_at,
      purchase_amount: item.purchase_amount,
      invoice_number: item.invoice_number || null,
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
    // 1. Fetch current status of campaign before updating
    const { data: currentCampaign } = await this.client
      .from('loyalty_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    // 2. Perform the update
    const { data, error } = await this.client
      .from('loyalty_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;

    // 3. Auto-deactivate codes if campaign status transitions to 'inactive'
    if (updates.status === 'inactive' && currentCampaign?.status !== 'inactive') {
      const nowStr = new Date('2026-06-14T15:41:53-06:00').toISOString(); // mock context date
      const { error: updateCodesError } = await this.client
        .from('one_time_codes')
        .update({ is_active: false, updated_at: nowStr })
        .eq('campaign_id', id)
        .eq('is_active', true)
        .eq('is_associated', false);

      if (updateCodesError) {
        console.warn('Failed to deactivate codes when deactivating campaign:', updateCodesError.message);
      }
    }

    return data as LoyaltyCampaign;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('loyalty_campaigns')
      .delete()
      .eq('id', id);
    return !error;
  }

  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as Profile;
  }

  async createProfile(profile: Profile): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .insert([profile])
      .select()
      .single();
    if (error || !data) {
      throw new Error(`Failed to create profile: ${error?.message}`);
    }
    return data as Profile;
  }

  async createBusiness(name: string): Promise<Business> {
    const { data, error } = await this.client
      .from('businesses')
      .insert([{ name }])
      .select()
      .single();
    if (error || !data) {
      throw new Error(`Failed to create business: ${error?.message}`);
    }
    return data as Business;
  }

  async updateBusiness(id: string, updates: { name?: string; logo_url?: string | null }): Promise<Business | null> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.logo_url !== undefined) updateData.logo_url = updates.logo_url;

    const { data, error } = await this.client
      .from('businesses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to update business in Supabase:', error);
      return null;
    }
    return data as Business;
  }

  async uploadBusinessLogo(businessId: string, base64Data: string): Promise<string> {
    // 1. Create bucket if not exists
    try {
      await this.client.storage.createBucket('business-logos', { public: true });
    } catch (e) {
      // Bucket might already exist
    }

    // 2. Parse base64
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let ext = 'png';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      const subtype = mimeType.split('/')[1] || 'png';
      ext = subtype.includes('jpeg') || subtype.includes('jpg') ? 'jpg' : (subtype.includes('png') ? 'png' : 'webp');
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const filePath = `${businessId}/logo-${Date.now()}.${ext}`;

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await this.client.storage
      .from('business-logos')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error subiendo logo a Supabase Storage: ${uploadError.message}`);
    }

    // 4. Get Public URL
    const { data: urlData } = this.client.storage
      .from('business-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 5. Update business in DB
    await this.updateBusiness(businessId, { logo_url: publicUrl });

    return publicUrl;
  }
}

// Export database singleton
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('--- DB INIT ENV CHECK ---');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY resolved:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_ANON_KEY resolved:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_PUBLISHABLE_KEY resolved:', !!process.env.SUPABASE_PUBLISHABLE_KEY);
console.log('supabaseKey resolved length:', supabaseKey ? supabaseKey.length : 0);
console.log('-------------------------');

export const db: DBService = new SupabaseDBService(supabaseUrl, supabaseKey);
