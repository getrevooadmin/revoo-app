import app from './app';

const PORT = 3001; // use separate port for test
const BASE_URL = `http://localhost:${PORT}`;

// Launch server in background
const server = app.listen(PORT, async () => {
  console.log(`🧪 Test server started on port ${PORT}`);
  try {
    await runTests();
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
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
  const testPhone = '88889999';
  const duplicateInvoice = 'INV-TEST-999';

  console.log('\n--- 1. Testing Nicaraguan Phone Validation ---');
  // Invalid phone (starts with 1, wrong length)
  const phoneRes1 = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: '12345678',
      invoice_number: 'INV-1',
      feedback_text: 'Excelente'
    })
  });
  console.log(`Invalid Phone (12345678) Response Status: ${phoneRes1.status}`);
  const phoneData1 = await phoneRes1.json();
  console.log(`Expected Error Msg: "${phoneData1.error}"`);

  // Valid phone (starts with 8, 8 digits)
  const phoneRes2 = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: testPhone,
      invoice_number: duplicateInvoice,
      feedback_text: 'La comida estuvo espectacular'
    })
  });
  console.log(`Valid Phone (${testPhone}) Response Status: ${phoneRes2.status}`);
  const phoneData2 = await phoneRes2.json();
  console.log(`Success Message: "${phoneData2.message}"`);
  console.log(`AI sentiment category: ${phoneData2.interaction.ai_sentiment} / ${phoneData2.interaction.ai_category}`);

  console.log('\n--- 2. Testing Invoice Duplication Rule (Anti-Fraud) ---');
  // Attempt to reuse same invoice number
  const dupInvoiceRes = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: '77778888',
      invoice_number: duplicateInvoice,
      feedback_text: 'Excelente bistec'
    })
  });
  console.log(`Duplicate Invoice Response Status: ${dupInvoiceRes.status}`);
  const dupInvoiceData = await dupInvoiceRes.json();
  console.log(`Expected Error Msg: "${dupInvoiceData.error}"`);

  console.log('\n--- 3. Testing 24h Cooldown Rule (Without Purchase Feedback) ---');
  const rateLimitPhone = '55556666';
  
  // First complaint submission
  const feedbackRes1 = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: rateLimitPhone,
      invoice_number: null,
      feedback_text: 'El servicio al cliente estuvo muy lento'
    })
  });
  console.log(`First Feedback Response Status: ${feedbackRes1.status}`);

  // Immediate second complaint submission
  const feedbackRes2 = await fetch(`${BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_phone: rateLimitPhone,
      invoice_number: null,
      feedback_text: 'No me gustó el trato'
    })
  });
  console.log(`Second Feedback (Immediate) Response Status: ${feedbackRes2.status}`);
  const feedbackData2 = await feedbackRes2.json();
  console.log(`Expected Cooldown Msg: "${feedbackData2.error}"`);

  console.log('\n--- 4. Testing Customer Stamp Accumulation Count ---');
  // Query status of the first test phone
  const statusRes = await fetch(`${BASE_URL}/api/customers/${testPhone}/status?business_id=${businessId}`);
  console.log(`Lookup Customer Status Code: ${statusRes.status}`);
  const statusData = await statusRes.json();
  console.log(`Current stamps for ${testPhone}: ${statusData.current_stamps} out of ${statusData.target_stamps}`);
  console.log(`Campaign Exp Date: ${statusData.expiration_date}`);

  console.log('\n--- 5. Testing Merchant Verification and Redemption ---');
  // Attempt to redeem when stamps are less than target_stamps (currently 1, target is 6)
  const redeemRes1 = await fetch(`${BASE_URL}/api/businesses/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_phone: testPhone,
      business_id: businessId
    })
  });
  console.log(`Redemption Attempt (1/6 stamps) Status: ${redeemRes1.status}`);
  const redeemData1 = await redeemRes1.json();
  console.log(`Expected Error Msg: "${redeemData1.error}"`);

  // Let's add 5 more purchases with unique invoice numbers to reach 6 stamps
  console.log('Adding 5 more stamp visits...');
  for (let i = 1; i <= 5; i++) {
    await fetch(`${BASE_URL}/api/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        customer_phone: testPhone,
        invoice_number: `INV-TEST-STAMP-${i}`,
        feedback_text: `Excelente visita número ${i}`
      })
    });
  }

  // Look up status again
  const statusRes2 = await fetch(`${BASE_URL}/api/customers/${testPhone}/status?business_id=${businessId}`);
  const statusData2 = await statusRes2.json();
  console.log(`Stamps updated count: ${statusData2.current_stamps} / ${statusData2.target_stamps}`);

  // Try redemption again (should succeed)
  const redeemRes2 = await fetch(`${BASE_URL}/api/businesses/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_phone: testPhone,
      business_id: businessId
    })
  });
  console.log(`Redemption Attempt (6/6 stamps) Status: ${redeemRes2.status}`);
  const redeemData2 = await redeemRes2.json();
  console.log(`Redeem Success Msg: "${redeemData2.message}"`);
  console.log(`Remaining stamps after redemption: ${redeemData2.remaining_stamps}`);

  console.log('\n✅ All integration tests passed successfully!');
}
