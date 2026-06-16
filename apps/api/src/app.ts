import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { z } from 'zod';
import { db } from './db';

const app = express();

app.use(cors());
app.use(express.json());

// E.164 phone regex: starting with '+' followed by country code and 6 to 14 digits
const phoneRegex = /^\+[1-9]\d{6,14}$/;

// Input Validation schemas
const interactionSchema = z.object({
  business_id: z.string().uuid('Invalid business UUID'),
  customer_phone: z.string().refine(
    (phone) => phoneRegex.test(phone),
    { message: 'Invalid phone number. Must start with + followed by country code and digits.' }
  ),
  invoice_number: z.string().trim().min(1).nullable().optional(),
  feedback_text: z.string().trim().min(3, 'Feedback must be at least 3 characters long'),
});

const redeemSchema = z.object({
  customer_phone: z.string().refine(
    (phone) => phoneRegex.test(phone),
    { message: 'Invalid phone number format.' }
  ),
  business_id: z.string().uuid('Invalid business UUID'),
});

// Helper: current date specified in product requirements (2026-06-14), can be overridden in dev
let mockDateOverride: string | null = null;

const getTargetDate = () => {
  return mockDateOverride || new Date('2026-06-14T15:41:53-06:00').toISOString();
};

// ==========================================
// ENDPOINT: Customer Submission (Visit/Complaint)
// ==========================================
app.post('/api/interactions', async (req, res) => {
  try {
    // 1. Validate inputs
    const parsed = interactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: parsed.error.errors[0].message 
      });
    }

    const { business_id, customer_phone, invoice_number, feedback_text } = parsed.data;

    // Check if business exists
    const business = await db.getBusiness(business_id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // 2. Check active campaign for the business based on the current date: 2026-06-14
    const currentDate = getTargetDate();
    const activeCampaign = await db.getActiveCampaign(business_id, currentDate);

    // If customer is claiming a purchase but there's no active campaign
    if (invoice_number && !activeCampaign) {
      return res.status(400).json({ 
        error: 'No active loyalty campaign found for this business on the current date' 
      });
    }

    // 3. Purchase Code Validation Rule
    let resolvedCampaignId: string | null = null;
    if (invoice_number) {
      const codeInput = invoice_number.trim();
      const codeRecord = await db.getOneTimeCode(codeInput);
      
      if (!codeRecord) {
        return res.status(400).json({ error: 'El código de compra no existe.' });
      }
      
      if (codeRecord.business_id !== business_id) {
        return res.status(400).json({ error: 'El código de compra no pertenece a este comercio.' });
      }
      
      if (!codeRecord.is_active) {
        return res.status(400).json({ error: 'El código de compra ha sido desactivado.' });
      }
      
      if (codeRecord.is_associated) {
        return res.status(400).json({ error: 'El código de compra ya ha sido utilizado.' });
      }
      
      // Calculate expiration: 24 hours (24 * 60 * 60 * 1000 ms)
      const createdTime = new Date(codeRecord.created_at).getTime();
      const transactionTime = new Date(currentDate).getTime();
      const diffHrs = (transactionTime - createdTime) / (1000 * 60 * 60);
      if (diffHrs > 24) {
        return res.status(400).json({ error: 'El código de compra ha expirado (validez de 24 horas).' });
      }

      // Check if the associated campaign is active
      if (codeRecord.campaign_id) {
        const campaign = await db.getCampaign(codeRecord.campaign_id);
        if (!campaign) {
          return res.status(400).json({ error: 'La campaña asociada a este código no existe.' });
        }
        
        const curTime = new Date(currentDate).getTime();
        const start = new Date(campaign.start_date).getTime();
        const end = new Date(campaign.end_date).getTime();
        const isActive = campaign.status === 'active' && curTime >= start && curTime <= end;
        
        if (!isActive) {
          return res.status(400).json({ error: 'La campaña asociada a este código no está activa.' });
        }
        resolvedCampaignId = codeRecord.campaign_id;
      } else {
        // Fallback for legacy codes (without campaign_id): use activeCampaign
        if (!activeCampaign) {
          return res.status(400).json({ error: 'No active loyalty campaign found for this business on the current date' });
        }
        resolvedCampaignId = activeCampaign.id;
      }
      
      // Mark code as used
      await db.useOneTimeCode(codeInput, customer_phone, currentDate);
    } else {
      // 4. Spam Cooldown Rule Check (Without Purchase Flow)
      // A user (phone) can only submit ONE complaint (no invoice) every 24 hours per business
      const cooldownActive = await db.checkRecentComplaintCooldown(customer_phone, business_id);
      if (cooldownActive) {
        return res.status(429).json({ error: 'Cooldown active. You can only submit one feedback without purchase every 24 hours.' });
      }
    }

    // 5. Call Python AI Microservice for analysis
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/v1/analyze-feedback';
    let aiResponse = { sentiment: 'neutral', category: 'other', is_spam: false };

    try {
      const response = await axios.post(aiServiceUrl, { text: feedback_text }, { timeout: 3000 });
      aiResponse = response.data;
    } catch (err: any) {
      console.warn(`Could not connect to AI service at ${aiServiceUrl}: ${err.message}. Using default values.`);
      // Local fallback simulation if AI service is not running
      if (feedback_text.toLowerCase().includes('asdf') || feedback_text.length < 5) {
        aiResponse.is_spam = true;
      }
    }

    // 6. Map status based on spam flag
    const status = aiResponse.is_spam ? 'spam_hidden' : 'accumulated';

    // 7. Save interaction
    const interaction = await db.createInteraction({
      business_id,
      campaign_id: resolvedCampaignId,
      customer_phone,
      invoice_number: invoice_number || null,
      feedback_text,
      ai_sentiment: aiResponse.sentiment as any,
      ai_category: aiResponse.category as any,
      ai_spam_confidence: aiResponse.is_spam,
      status
    });

    // 8. Return response
    let stampStatus = null;
    if (invoice_number && resolvedCampaignId && !aiResponse.is_spam) {
      const { count } = await db.getAccumulatedStampsCount(customer_phone, resolvedCampaignId);
      const campaign = await db.getCampaign(resolvedCampaignId);
      if (campaign) {
        stampStatus = {
          current_stamps: count,
          target_stamps: campaign.target_stamps,
          prize: campaign.prize_description,
          campaign_expires: campaign.end_date
        };
      }
    }

    return res.status(201).json({
      message: aiResponse.is_spam ? 'Feedback received (flagged as spam)' : 'Interaction registered successfully',
      interaction,
      stamps: stampStatus
    });

  } catch (error: any) {
    console.error('Error in interactions controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: Consumer Points Lookup
// ==========================================
app.get('/api/customers/:phone/status', async (req, res) => {
  try {
    const { phone } = req.params;
    const businessId = req.query.business_id as string;

    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+') && /^[1-9]\d{6,14}$/.test(formattedPhone)) {
      formattedPhone = '+' + formattedPhone;
    }

    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    if (!businessId) {
      return res.status(400).json({ error: 'Missing business_id query parameter' });
    }

    // Find active campaign
    const currentDate = getTargetDate();
    const activeCampaign = await db.getActiveCampaign(businessId, currentDate);
    if (!activeCampaign) {
      return res.status(404).json({ error: 'No active campaign found for this business' });
    }

    // Query stamps (status = 'accumulated' AND campaign_id matches AND invoice_number IS NOT NULL)
    // db.getAccumulatedStampsCount fetches rows with status = 'accumulated' for the campaign.
    // Let's filter that count to only count purchase interactions. In db.ts, getAccumulatedStampsCount counts stamps. 
    // Wait! Since in our memory/supabase db.ts implementation we count all 'accumulated' rows, we should double check if it counts complaints.
    // Actually, in db.ts MemoryDBService.getAccumulatedStampsCount, it counts items with status = 'accumulated' AND campaign_id = campaignId AND customer_phone = phone.
    // In our backend, complaints (Without Purchase Flow) have invoice_number = null, and campaign_id is null.
    // Since campaign_id is null for complaints, they are NOT counted in getAccumulatedStampsCount because they don't have campaignId!
    // This is a beautiful implicit design: without-purchase feedbacks have campaign_id = null, and getAccumulatedStampsCount filters by campaign_id = campaignId. Thus complaints never result in stamps!
    const { count } = await db.getAccumulatedStampsCount(formattedPhone, activeCampaign.id);

    return res.status(200).json({
      customer_phone: formattedPhone,
      current_stamps: count,
      target_stamps: activeCampaign.target_stamps,
      prize_description: activeCampaign.prize_description,
      expiration_date: activeCampaign.end_date,
      campaign_id: activeCampaign.id,
      title: activeCampaign.title,
      description: activeCampaign.description
    });

  } catch (error: any) {
    console.error('Error in customer status controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: Merchant Redemption
// ==========================================
app.post('/api/businesses/redeem', async (req, res) => {
  try {
    const parsed = redeemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { customer_phone, business_id } = parsed.data;

    // Find active campaign
    const currentDate = getTargetDate();
    const activeCampaign = await db.getActiveCampaign(business_id, currentDate);
    if (!activeCampaign) {
      return res.status(404).json({ error: 'No active loyalty campaign found for this business' });
    }

    // Check stamp count
    const { count } = await db.getAccumulatedStampsCount(customer_phone, activeCampaign.id);
    if (count < activeCampaign.target_stamps) {
      return res.status(400).json({ 
        error: `Customer does not have enough stamps. Has ${count}, needs ${activeCampaign.target_stamps} to redeem.` 
      });
    }

    // Update target_stamps rows from 'accumulated' to 'redimidos'
    const success = await db.redeemStamps(customer_phone, activeCampaign.id, activeCampaign.target_stamps);
    if (!success) {
      return res.status(500).json({ error: 'Failed to redeem stamps' });
    }

    return res.status(200).json({
      message: 'Prize redeemed successfully!',
      redeemed_stamps: activeCampaign.target_stamps,
      remaining_stamps: count - activeCampaign.target_stamps
    });

  } catch (error: any) {
    console.error('Error in redeem controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: List Recent Interactions (Merchant Dashboard)
// ==========================================
app.get('/api/businesses/:id/interactions', async (req, res) => {
  try {
    const { id } = req.params;
    const interactions = await db.getRecentInteractions(id);
    return res.status(200).json(interactions);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: List Businesses (Dropdown Helper)
// ==========================================
app.get('/api/businesses', async (req, res) => {
  try {
    const businesses = await db.getAllBusinesses();
    return res.status(200).json(businesses);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: Generate Purchase Code (Backoffice)
// ==========================================
app.post('/api/businesses/:businessId/codes', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { campaignId } = req.body;

    const business = await db.getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    let selectedCampaignId = campaignId;

    if (!selectedCampaignId) {
      // Fallback to active campaign if not provided
      const currentDate = getTargetDate();
      const activeCampaign = await db.getActiveCampaign(businessId, currentDate);
      if (!activeCampaign) {
        return res.status(400).json({ error: 'Campaña no especificada y no hay campaña activa para este comercio.' });
      }
      selectedCampaignId = activeCampaign.id;
    } else {
      // Validate campaign belongs to the business
      const campaign = await db.getCampaign(selectedCampaignId);
      if (!campaign || campaign.business_id !== businessId) {
        return res.status(400).json({ error: 'La campaña especificada no pertenece a este comercio.' });
      }
    }

    // Generate a 6-character random alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `FEEB-${randStr}`;

    const currentDate = getTargetDate();
    const generated = await db.generateOneTimeCode(businessId, code, selectedCampaignId, currentDate);

    return res.status(201).json(generated);
  } catch (error: any) {
    console.error('Error generating purchase code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: List Recent Purchase Codes (Backoffice)
// ==========================================
app.get('/api/businesses/:businessId/codes', async (req, res) => {
  try {
    const { businessId } = req.params;
    const codes = await db.getRecentOneTimeCodes(businessId);
    return res.status(200).json(codes);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINT: Deactivate Purchase Code (Backoffice)
// ==========================================
app.post('/api/businesses/:businessId/codes/:code/deactivate', async (req, res) => {
  try {
    const { businessId, code } = req.params;
    
    const codeRecord = await db.getOneTimeCode(code);
    if (!codeRecord) {
      return res.status(404).json({ error: 'El código de compra no existe.' });
    }
    
    if (codeRecord.business_id !== businessId) {
      return res.status(400).json({ error: 'El código de compra no pertenece a este comercio.' });
    }
    
    if (codeRecord.is_associated) {
      return res.status(400).json({ error: 'El código de compra ya ha sido utilizado y no se puede desactivar.' });
    }
    
    const success = await db.deactivateOneTimeCode(code);
    if (!success) {
      return res.status(500).json({ error: 'Failed to deactivate code' });
    }
    
    return res.status(200).json({ message: 'Código desactivado correctamente.' });
  } catch (error: any) {
    console.error('Error deactivating purchase code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ENDPOINTS: Campaigns Management (Backoffice)
// ==========================================

const campaignSchema = z.object({
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().trim().default(''),
  status: z.enum(['active', 'inactive']).default('active'),
  target_stamps: z.number().int().positive('La meta de sellos debe ser mayor a 0'),
  prize_description: z.string().trim().min(3, 'El premio debe tener al menos 3 caracteres'),
  start_date: z.string().trim(),
  end_date: z.string().trim(),
});

// List all campaigns for a business
app.get('/api/businesses/:businessId/campaigns', async (req, res) => {
  try {
    const { businessId } = req.params;
    const campaigns = await db.getCampaigns(businessId);
    return res.status(200).json(campaigns);
  } catch (error: any) {
    console.error('Error listing campaigns:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new campaign
app.post('/api/businesses/:businessId/campaigns', async (req, res) => {
  try {
    const { businessId } = req.params;
    const parsed = campaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const campaign = await db.createCampaign({
      business_id: businessId,
      ...parsed.data
    });

    return res.status(201).json(campaign);
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a campaign
app.put('/api/businesses/:businessId/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const parsed = campaignSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updated = await db.updateCampaign(campaignId, parsed.data);
    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a campaign
app.delete('/api/businesses/:businessId/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const success = await db.deleteCampaign(campaignId);
    if (!success) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    return res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// DEV ONLY ENDPOINTS: Simulated Clock / Mock Time overrides
// ==========================================
app.get('/api/dev/mock-time', (req, res) => {
  return res.status(200).json({ mockDate: getTargetDate(), isOverridden: mockDateOverride !== null });
});

app.post('/api/dev/mock-time', (req, res) => {
  const { mockDate } = req.body;
  if (!mockDate) {
    return res.status(400).json({ error: 'Missing mockDate in request body' });
  }
  try {
    mockDateOverride = new Date(mockDate).toISOString();
    return res.status(200).json({ mockDate: getTargetDate(), isOverridden: true, message: 'Mock time updated successfully' });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
});

app.post('/api/dev/mock-time/advance', (req, res) => {
  const { hours } = req.body;
  const current = new Date(getTargetDate());
  current.setHours(current.getHours() + (hours || 24));
  mockDateOverride = current.toISOString();
  return res.status(200).json({ mockDate: getTargetDate(), isOverridden: true, message: `Mock time advanced by ${hours || 24} hours` });
});

app.post('/api/dev/mock-time/reset', (req, res) => {
  mockDateOverride = null;
  return res.status(200).json({ mockDate: getTargetDate(), isOverridden: false, message: 'Mock time reset to default' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
