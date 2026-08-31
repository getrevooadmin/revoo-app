import { supabase } from './supabase';

export type Permission =
  | 'global_admin'
  | 'manage_roles'
  | 'manage_users'
  | 'manage_campaigns'
  | 'generate_codes'
  | 'redeem_prizes'
  | 'view_analytics'
  | 'manage_settings';

export interface Role {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  created_at?: string;
}

export interface StaffAccount {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  alias?: string;
  role: string;
  custom_role_id?: string;
  custom_role?: Role;
  business_id: string;
  created_at?: string;
}

export interface Business {
  id: string;
  name: string;
  logo_url?: string | null;
  created_at?: string;
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
  tiers?: any[];
  multipliers?: any[];
  created_at?: string;
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
  purchase_amount: number;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  campaign?: { title: string; status: 'active' | 'inactive' } | null;
}

export function generateDeterministicCustomerPin(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '4932';
  let hash = 5381;
  const salt = 'revoo-customer-pin-v1';
  const str = digits + salt;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  const pinNum = (Math.abs(hash) % 9000) + 1000;
  return pinNum.toString();
}

export class SupabaseService {
  // Fetch merchant business profile
  static async getMyBusiness(): Promise<Business | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.business_id) return null;

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', profile.business_id)
      .single();

    return business as Business | null;
  }

  // Update merchant business profile
  static async updateBusiness(businessId: string, name?: string, logoUrl?: string | null): Promise<Business> {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (logoUrl !== undefined) updateData.logo_url = logoUrl ? logoUrl.trim() : null;

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al actualizar información del comercio');
    }
    return data as Business;
  }

  // Upload business logo to Supabase Storage Bucket
  static async uploadBusinessLogo(businessId: string, base64Data: string): Promise<string> {
    const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let ext = 'png';
    let buffer: Uint8Array;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      const subtype = mimeType.split('/')[1] || 'png';
      ext = subtype.includes('jpeg') || subtype.includes('jpg') ? 'jpg' : (subtype.includes('png') ? 'png' : 'webp');
      const binaryStr = atob(matches[2]);
      buffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        buffer[i] = binaryStr.charCodeAt(i);
      }
    } else {
      const binaryStr = atob(base64Data);
      buffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        buffer[i] = binaryStr.charCodeAt(i);
      }
    }

    const filePath = `${businessId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error subiendo logo a Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('business-logos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    await SupabaseService.updateBusiness(businessId, undefined, publicUrl);

    return publicUrl;
  }

  // Fetch campaigns for a business
  static async getCampaigns(businessId: string): Promise<LoyaltyCampaign[]> {
    const { data, error } = await supabase
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as LoyaltyCampaign[];
  }

  // Create new campaign
  static async createCampaign(businessId: string, campaign: Omit<LoyaltyCampaign, 'id' | 'business_id' | 'created_at'>): Promise<LoyaltyCampaign> {
    const { data, error } = await supabase
      .from('loyalty_campaigns')
      .insert([{
        business_id: businessId,
        ...campaign
      }])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al crear la campaña');
    }
    return data as LoyaltyCampaign;
  }

  // Update existing campaign
  static async updateCampaign(campaignId: string, updates: Partial<LoyaltyCampaign>): Promise<LoyaltyCampaign> {
    const { data, error } = await supabase
      .from('loyalty_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al actualizar la campaña');
    }

    // Auto-deactivate codes if campaign becomes inactive
    if (updates.status === 'inactive') {
      const nowStr = new Date().toISOString();
      await supabase
        .from('one_time_codes')
        .update({ is_active: false, updated_at: nowStr })
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .eq('is_associated', false);
    }

    return data as LoyaltyCampaign;
  }

  // Delete campaign
  static async deleteCampaign(campaignId: string): Promise<boolean> {
    const { error } = await supabase
      .from('loyalty_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  // Fetch purchase codes
  static async getPurchaseCodes(businessId: string): Promise<OneTimeCode[]> {
    const { data, error } = await supabase
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

  // Generate purchase code
  static async generatePurchaseCode(businessId: string, campaignId?: string, purchaseAmount: number = 10, invoiceNumber?: string | null): Promise<OneTimeCode> {
    let selectedCampaignId = campaignId;

    if (!selectedCampaignId) {
      const nowStr = new Date().toISOString();
      const { data: activeCampaigns } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .lte('start_date', nowStr)
        .gte('end_date', nowStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!activeCampaigns || activeCampaigns.length === 0) {
        throw new Error('Campaña no especificada y no hay campaña activa para este comercio.');
      }
      selectedCampaignId = activeCampaigns[0].id;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `FEEB-${randStr}`;
    const nowStr = new Date().toISOString();

    const { data, error } = await supabase
      .from('one_time_codes')
      .insert([{
        business_id: businessId,
        campaign_id: selectedCampaignId,
        code,
        is_associated: false,
        is_active: true,
        is_redeemed: false,
        customer_phone: null,
        purchase_amount: purchaseAmount,
        invoice_number: invoiceNumber || null,
        created_at: nowStr,
        updated_at: nowStr
      }])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al generar el código de compra.');
    }

    return data as OneTimeCode;
  }

  // Deactivate purchase code
  static async deactivateCode(code: string): Promise<boolean> {
    const { error } = await supabase
      .from('one_time_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('code', code);

    if (error) throw new Error(error.message);
    return true;
  }

  // Set code ready for scan at cash register counter (updates updated_at timestamp)
  static async setReadyForScan(businessId: string, code: string): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('one_time_codes')
      .update({ updated_at: nowIso })
      .eq('code', code);

    if (error) throw new Error(error.message);
    return true;
  }

  // Fetch recent interactions
  static async getRecentInteractions(businessId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  }

  // Customer status lookup directly via Supabase query
  static async getCustomerStatus(phone: string, businessId: string): Promise<any> {
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+') && /^[1-9]\d{6,14}$/.test(formattedPhone)) {
      formattedPhone = '+' + formattedPhone;
    }

    const nowStr = new Date().toISOString();
    const { data: activeCampaigns } = await supabase
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return {
        customer_phone: formattedPhone,
        current_points: 0,
        target_points: 1000,
        prize_description: 'Sin campaña activa'
      };
    }

    const activeCampaign = activeCampaigns[0];

    const { data: interactions } = await supabase
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
      pin: generateDeterministicCustomerPin(formattedPhone)
    };
  }

  // Redeem customer points with strict balance and PIN validation
  static async redeemPoints(businessId: string, customerPhone: string, pointsToRedeem: number, customerPin?: string): Promise<boolean> {
    let formattedPhone = customerPhone.trim();
    if (!formattedPhone.startsWith('+') && /^[1-9]\d{6,14}$/.test(formattedPhone)) {
      formattedPhone = '+' + formattedPhone;
    }

    // 1. PIN Validation
    const expectedPin = generateDeterministicCustomerPin(formattedPhone);
    if (!customerPin || customerPin.trim() !== expectedPin) {
      throw new Error(`PIN del cliente incorrecto. El PIN de 4 dígitos para ${customerPhone} es: ${expectedPin}`);
    }

    // 2. Fetch active campaign to get max allowed points per redemption
    const nowStr = new Date().toISOString();
    const { data: activeCampaigns } = await supabase
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .lte('start_date', nowStr)
      .gte('end_date', nowStr)
      .limit(1);

    if (!activeCampaigns || activeCampaigns.length === 0) {
      throw new Error('No hay una campaña activa para este comercio.');
    }

    const campaign = activeCampaigns[0];
    const maxCampaignPoints = campaign.target_points;

    // 3. Validate pointsToRedeem boundaries
    if (pointsToRedeem <= 0) {
      throw new Error('Ingrese una cantidad válida de puntos a canjear.');
    }

    if (pointsToRedeem > maxCampaignPoints) {
      throw new Error(`El canje máximo permitido por la campaña es de ${maxCampaignPoints} Pts. El saldo remanente permanecerá disponible para el cliente.`);
    }

    // 4. Points Balance Check (Prevent Negative Balances!)
    const currentStatus = await SupabaseService.getCustomerStatus(formattedPhone, businessId);
    const currentBalance = currentStatus?.current_points || 0;

    if (currentBalance < pointsToRedeem) {
      throw new Error(`Saldo insuficiente. El cliente solo tiene ${currentBalance} Pts acumulados, pero intenta canjear ${pointsToRedeem} Pts.`);
    }

    const campaignId = campaign.id;

    // Insert negative points redemption interaction
    const { error: insertError } = await supabase
      .from('interactions')
      .insert([{
        business_id: businessId,
        campaign_id: campaignId,
        customer_phone: formattedPhone,
        invoice_number: null,
        feedback_text: 'Canje de premio por puntos',
        ai_sentiment: 'neutral',
        ai_category: 'other',
        ai_spam_confidence: false,
        status: 'redimidos',
        points_earned: -pointsToRedeem
      }]);

    if (insertError) {
      throw new Error(`Error al registrar el canje: ${insertError.message}`);
    }

    // Mark codes as redeemed
    await supabase
      .from('one_time_codes')
      .update({ is_redeemed: true, redeemed_at: nowStr, updated_at: nowStr })
      .eq('customer_phone', formattedPhone)
      .eq('campaign_id', campaignId)
      .eq('is_redeemed', false);

    return true;
  }

  // Fetch my profile with role permissions
  static async getMyProfile(): Promise<StaffAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, custom_role:roles(*)')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    let permissions: Permission[] = [];
    if (profile.custom_role_id) {
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('permission:permissions(slug)')
        .eq('role_id', profile.custom_role_id);
      if (perms && perms.length > 0) {
        permissions = perms.map((p: any) => p.permission?.slug as Permission).filter(Boolean);
      }
    }

    // Expand global_admin or fallback for primary merchant owner (when custom_role_id is null)
    if (permissions.includes('global_admin') || !profile.custom_role_id) {
      permissions = ['global_admin', 'manage_roles', 'manage_users', 'manage_campaigns', 'generate_codes', 'redeem_prizes', 'view_analytics', 'manage_settings'];
    }

    return {
      ...profile,
      custom_role: profile.custom_role ? { ...profile.custom_role, permissions } : undefined
    } as StaffAccount;
  }

  // Permissions Catalog
  static async getPermissionsCatalog(): Promise<{ id: string; slug: Permission; name: string; description?: string }[]> {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) throw new Error(error.message);
    return data || [];
  }

  // Roles CRUD
  static async getRoles(businessId: string): Promise<Role[]> {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!roles) return [];

    const rolesWithPermissions: Role[] = [];
    for (const role of roles) {
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('permission:permissions(slug)')
        .eq('role_id', role.id);
      
      rolesWithPermissions.push({
        ...role,
        permissions: perms ? perms.map((p: any) => p.permission?.slug as Permission).filter(Boolean) : []
      });
    }

    return rolesWithPermissions;
  }

  static async createRole(businessId: string, name: string, description: string, permissions: Permission[]): Promise<Role> {
    const { data: role, error } = await supabase
      .from('roles')
      .insert([{
        business_id: businessId,
        name: name.trim(),
        description: description.trim(),
        is_system: false
      }])
      .select()
      .single();

    if (error || !role) throw new Error(error?.message || 'Error al crear rol');

    if (permissions.length > 0) {
      const catalog = await this.getPermissionsCatalog();
      const permRows = permissions
        .map(slug => {
          const item = catalog.find(c => c.slug === slug);
          return item ? { role_id: role.id, permission_id: item.id } : null;
        })
        .filter((r): r is { role_id: string; permission_id: string } => r !== null);

      if (permRows.length > 0) {
        await supabase.from('role_permissions').insert(permRows);
      }
    }

    return { ...role, permissions };
  }

  static async updateRole(roleId: string, name: string, description: string, permissions: Permission[], isGlobalAdminRole = false): Promise<Role> {
    let updatedPermissions = [...permissions];
    if (isGlobalAdminRole && !updatedPermissions.includes('global_admin')) {
      updatedPermissions.push('global_admin');
    }

    const { data: role, error } = await supabase
      .from('roles')
      .update({ name: name.trim(), description: description.trim() })
      .eq('id', roleId)
      .select()
      .single();

    if (error || !role) throw new Error(error?.message || 'Error al actualizar rol');

    await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (updatedPermissions.length > 0) {
      const catalog = await this.getPermissionsCatalog();
      const permRows = updatedPermissions
        .map(slug => {
          const item = catalog.find(c => c.slug === slug);
          return item ? { role_id: roleId, permission_id: item.id } : null;
        })
        .filter((r): r is { role_id: string; permission_id: string } => r !== null);

      if (permRows.length > 0) {
        await supabase.from('role_permissions').insert(permRows);
      }
    }

    return { ...role, permissions: updatedPermissions };
  }

  static async deleteRole(roleId: string): Promise<boolean> {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) throw new Error(error.message);
    return true;
  }

  // Staff Accounts CRUD
  static async getStaffAccounts(businessId: string): Promise<StaffAccount[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*, custom_role:roles(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (profiles || []) as StaffAccount[];
  }

  static async updateStaffAccount(accountId: string, username: string, alias: string, password: string, roleId: string): Promise<StaffAccount> {
    const res = await fetch('/api/auth/manage-staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, username, alias, password, roleId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar cuenta de colaborador');
    return data.account;
  }
}
