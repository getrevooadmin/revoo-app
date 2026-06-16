import app from './app';
import { db } from './db';

const PORT = 3003; // Separate port for these tests
const BASE_URL = `http://localhost:${PORT}`;

// Launch server in background
const server = app.listen(PORT, async () => {
  console.log(`🧪 Campaign Codes test server started on port ${PORT}`);
  try {
    await runTests();
  } catch (error) {
    console.error('❌ Campaign Codes integration tests failed:', error);
    process.exit(1);
  } finally {
    server.close(() => {
      console.log('🏁 Test server stopped');
      process.exit(0);
    });
  }
});

async function runTests() {
  const businessId = '11111111-1111-1111-1111-111111111111'; // La Pampa Steakhouse
  const testPhone = '+50577778888';

  console.log('\n--- Test 1: Generate code associated with an active campaign ---');
  // First, let's create a new active campaign to associate code with
  const activeCampaign = await db.createCampaign({
    business_id: businessId,
    title: 'Campaña Activa de Test',
    description: 'Para probar asociación de códigos',
    target_stamps: 3,
    prize_description: 'Entrada gratis',
    status: 'active',
    start_date: new Date('2026-06-01').toISOString(),
    end_date: new Date('2026-06-30').toISOString()
  });

  const responseGenActive = await fetch(`${BASE_URL}/api/businesses/${businessId}/codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: activeCampaign.id })
  });

  console.log(`Generate Active Campaign Code Status: ${responseGenActive.status}`);
  const codeActive = await responseGenActive.json();
  console.log(`Generated Code: ${codeActive.code}, Associated Campaign: ${codeActive.campaign_id}`);
  
  if (codeActive.campaign_id !== activeCampaign.id) {
    throw new Error('Code is not associated with the active campaign');
  }

  // Verify code validation succeeds
  console.log('\n--- Test 2: Validate code associated with active campaign ---');
  const responseValActive = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: testPhone,
      invoice_number: codeActive.code,
      feedback_text: 'Excelente comida y servicio'
    })
  });

  console.log(`Validate Active Campaign Code Status: ${responseValActive.status}`);
  const dataValActive = await responseValActive.json();
  console.log(`Response message: ${dataValActive.message || dataValActive.error}`);
  if (responseValActive.status !== 201) {
    throw new Error('Validation of active campaign code failed');
  }

  console.log('\n--- Test 3: Generate code associated with an inactive campaign ---');
  // Let's create an inactive campaign
  const inactiveCampaign = await db.createCampaign({
    business_id: businessId,
    title: 'Campaña Inactiva de Test',
    description: 'Esta campaña no debería aceptar códigos',
    target_stamps: 5,
    prize_description: 'Bebida gratis',
    status: 'inactive',
    start_date: new Date('2026-06-01').toISOString(),
    end_date: new Date('2026-06-30').toISOString()
  });

  const responseGenInactive = await fetch(`${BASE_URL}/api/businesses/${businessId}/codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: inactiveCampaign.id })
  });

  console.log(`Generate Inactive Campaign Code Status: ${responseGenInactive.status}`);
  const codeInactive = await responseGenInactive.json();
  console.log(`Generated Code: ${codeInactive.code}, Associated Campaign: ${codeInactive.campaign_id}`);

  // Verify validation fails
  console.log('\n--- Test 4: Validate code associated with inactive campaign ---');
  const responseValInactive = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: '+50555554444',
      invoice_number: codeInactive.code,
      feedback_text: 'La carne estuvo un poco fría'
    })
  });

  console.log(`Validate Inactive Campaign Code Status: ${responseValInactive.status}`);
  const dataValInactive = await responseValInactive.json();
  console.log(`Expected Error Message: "${dataValInactive.error}"`);
  if (responseValInactive.status !== 400 || !dataValInactive.error.includes('no está activa')) {
    throw new Error('Validation of inactive campaign code should have failed');
  }

  console.log('\n--- Test 5: Verify legacy fallback logic (code without campaign_id) ---');
  // We manually seed a code with null campaign_id using MemoryDBService directly
  const legacyCode = 'LEGACY-CODE-123';
  await db.generateOneTimeCode(businessId, legacyCode, null as any, new Date('2026-06-14T12:00:00-06:00').toISOString());

  const responseValLegacy = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: '+50577772222',
      invoice_number: legacyCode,
      feedback_text: 'El postre estuvo fantástico'
    })
  });

  console.log(`Validate Legacy Code Status: ${responseValLegacy.status}`);
  const dataValLegacy = await responseValLegacy.json();
  console.log(`Response message: ${dataValLegacy.message || dataValLegacy.error}`);
  if (responseValLegacy.status !== 201) {
    throw new Error('Legacy fallback validation failed');
  }

  console.log('\n--- Test 6: Verify new fields (associated_at, is_redeemed, updated_at) updates ---');
  // Create active campaign for stamp redemption test
  const redemptionCampaign = await db.createCampaign({
    business_id: businessId,
    title: 'Campaña Redención Test',
    description: 'Para probar is_redeemed',
    target_stamps: 1, // small target to redeem quickly
    prize_description: 'Café gratis',
    status: 'active',
    start_date: new Date('2026-06-01').toISOString(),
    end_date: new Date('2026-06-30').toISOString()
  });

  // 1. Generate code
  const codeToTrack = `TRACK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const mockDate = new Date('2026-06-14T15:41:53-06:00').toISOString();
  const generatedCode = await db.generateOneTimeCode(businessId, codeToTrack, redemptionCampaign.id, mockDate);
  
  console.log(`Initial State - is_associated: ${generatedCode.is_associated}, is_active: ${generatedCode.is_active}, is_redeemed: ${generatedCode.is_redeemed}, associated_at: ${generatedCode.associated_at}, redeemed_at: ${generatedCode.redeemed_at}`);
  if (generatedCode.is_associated !== false || generatedCode.is_active !== true || generatedCode.is_redeemed !== false || generatedCode.associated_at !== null || generatedCode.redeemed_at !== null) {
    throw new Error('Initial code state is incorrect');
  }

  // 2. Associate (use) code via interactions endpoint
  const targetPhone = '+50588887777';
  const responseVal = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: targetPhone,
      invoice_number: codeToTrack,
      feedback_text: 'Muy buen café'
    })
  });

  if (responseVal.status !== 201) {
    throw new Error(`Failed to associate code: ${responseVal.status}`);
  }

  // Retrieve code after association
  const associatedCode = await db.getOneTimeCode(codeToTrack);
  if (!associatedCode) throw new Error('Code not found after association');
  
  console.log(`Associated State - is_associated: ${associatedCode.is_associated}, is_active: ${associatedCode.is_active}, is_redeemed: ${associatedCode.is_redeemed}, associated_at: ${associatedCode.associated_at}, updated_at: ${associatedCode.updated_at}`);
  if (associatedCode.is_associated !== true || associatedCode.is_active !== true || associatedCode.associated_at !== mockDate || associatedCode.updated_at !== mockDate) {
    throw new Error('Association fields were not correctly populated');
  }

  // 3. Redeem stamps
  const redeemRes = await fetch(`${BASE_URL}/api/businesses/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_phone: targetPhone,
      business_id: businessId
    })
  });

  if (redeemRes.status !== 200) {
    throw new Error(`Failed to redeem stamps: ${redeemRes.status}`);
  }

  // Retrieve code after redemption
  const redeemedCode = await db.getOneTimeCode(codeToTrack);
  if (!redeemedCode) throw new Error('Code not found after redemption');

  console.log(`Redeemed State - is_associated: ${redeemedCode.is_associated}, is_active: ${redeemedCode.is_active}, is_redeemed: ${redeemedCode.is_redeemed}, associated_at: ${redeemedCode.associated_at}, redeemed_at: ${redeemedCode.redeemed_at}, updated_at: ${redeemedCode.updated_at}`);
  if (redeemedCode.is_redeemed !== true || redeemedCode.redeemed_at === null) {
    throw new Error('is_redeemed was not set to true or redeemed_at was not populated after stamp redemption');
  }

  console.log('\n✅ All campaign-code association and metadata tests passed successfully!');
}
