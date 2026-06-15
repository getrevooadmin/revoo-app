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

// Helper: current date specified in product requirements (2026-06-14)
const getTargetDate = () => {
  return new Date('2026-06-14T15:41:53-06:00').toISOString();
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
    if (invoice_number) {
      const codeInput = invoice_number.trim();
      const codeRecord = await db.getOneTimeCode(codeInput);
      
      if (!codeRecord) {
        return res.status(400).json({ error: 'El código de compra no existe.' });
      }
      
      if (codeRecord.business_id !== business_id) {
        return res.status(400).json({ error: 'El código de compra no pertenece a este comercio.' });
      }
      
      if (codeRecord.is_used) {
        return res.status(400).json({ error: 'El código de compra ya ha sido utilizado.' });
      }
      
      // Calculate expiration: 24 hours (24 * 60 * 60 * 1000 ms)
      const createdTime = new Date(codeRecord.created_at).getTime();
      const transactionTime = new Date(currentDate).getTime();
      const diffHrs = (transactionTime - createdTime) / (1000 * 60 * 60);
      if (diffHrs > 24) {
        return res.status(400).json({ error: 'El código de compra ha expirado (validez de 24 horas).' });
      }
      
      // Mark code as used
      await db.useOneTimeCode(codeInput);
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
      campaign_id: (activeCampaign && invoice_number) ? activeCampaign.id : null,
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
    if (invoice_number && activeCampaign && !aiResponse.is_spam) {
      const { count } = await db.getAccumulatedStampsCount(customer_phone, activeCampaign.id);
      stampStatus = {
        current_stamps: count,
        target_stamps: activeCampaign.target_stamps,
        prize: activeCampaign.prize_description,
        campaign_expires: activeCampaign.end_date
      };
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
      campaign_id: activeCampaign.id
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
    const business = await db.getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Generate a 6-character random alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `FEEB-${randStr}`;

    const currentDate = getTargetDate();
    const generated = await db.generateOneTimeCode(businessId, code, currentDate);

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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
