import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMockDate } from '../dev/mock-time/route';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

const phoneRegex = /^\+[1-9]\d{6,14}$/;

function generateDeterministicCustomerPin(phone: string): string {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_id, customer_phone, invoice_number, feedback_text } = body;

    const supabaseAdmin = getSupabaseAdmin();

    if (!business_id || !customer_phone) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    if (!invoice_number || !invoice_number.trim()) {
      return NextResponse.json({ error: 'Por favor ingrese el código de compra (ticket).' }, { status: 400 });
    }

    if (!phoneRegex.test(customer_phone)) {
      return NextResponse.json({ error: 'Número de teléfono inválido.' }, { status: 400 });
    }

    // 1. Check business
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // 2. First time check
    const { count: interactionCount } = await supabaseAdmin
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('customer_phone', customer_phone)
      .eq('business_id', business_id);

    const isFirstTime = (interactionCount || 0) === 0;

    // 3. Active campaign check
    const currentDate = getMockDate().toISOString();
    const { data: activeCampaigns } = await supabaseAdmin
      .from('loyalty_campaigns')
      .select('*')
      .eq('business_id', business_id)
      .eq('status', 'active')
      .lte('start_date', currentDate)
      .gte('end_date', currentDate)
      .order('created_at', { ascending: false })
      .limit(1);

    const activeCampaign = activeCampaigns && activeCampaigns.length > 0 ? activeCampaigns[0] : null;

    if (invoice_number && !activeCampaign) {
      return NextResponse.json({ error: 'No hay una campaña de lealtad activa para este comercio.' }, { status: 400 });
    }

    let resolvedCampaignId: string | null = null;
    let resolvedCampaign: any = null;
    let codeRecord: any = null;

    if (invoice_number) {
      const codeInput = invoice_number.trim();
      const { data: codeData } = await supabaseAdmin
        .from('one_time_codes')
        .select('*')
        .ilike('code', codeInput)
        .single();

      if (!codeData) {
        return NextResponse.json({ error: 'El código de compra no existe.' }, { status: 400 });
      }

      if (codeData.business_id !== business_id) {
        return NextResponse.json({ error: 'El código de compra no pertenece a este comercio.' }, { status: 400 });
      }

      if (!codeData.is_active) {
        return NextResponse.json({ error: 'El código de compra ha sido desactivado.' }, { status: 400 });
      }

      if (codeData.is_associated) {
        return NextResponse.json({ error: 'El código de compra ya ha sido utilizado.' }, { status: 400 });
      }

      codeRecord = codeData;

      if (codeData.campaign_id) {
        const { data: campaign } = await supabaseAdmin
          .from('loyalty_campaigns')
          .select('*')
          .eq('id', codeData.campaign_id)
          .single();

        if (!campaign) {
          return NextResponse.json({ error: 'La campaña asociada a este código no existe.' }, { status: 400 });
        }

        if (campaign.status === 'grace_period') {
          return NextResponse.json({
            error: 'Esta campaña se encuentra en período de gracia exclusivamente para canjes. No se permite acumular nuevos puntos.'
          }, { status: 400 });
        }

        if (campaign.status !== 'active') {
          return NextResponse.json({ error: 'La campaña asociada a este código ya no se encuentra activa.' }, { status: 400 });
        }

        resolvedCampaignId = codeData.campaign_id;
        resolvedCampaign = campaign;
      } else {
        if (activeCampaign.status === 'grace_period') {
          return NextResponse.json({
            error: 'Esta campaña se encuentra en período de gracia exclusivamente para canjes. No se permite acumular nuevos puntos.'
          }, { status: 400 });
        }

        resolvedCampaignId = activeCampaign.id;
        resolvedCampaign = activeCampaign;
      }

      // Mark code as used
      await supabaseAdmin
        .from('one_time_codes')
        .update({
          is_associated: true,
          customer_phone,
          associated_at: currentDate,
          updated_at: currentDate
        })
        .eq('code', codeInput);
    } else {
      // Cooldown check (24h) for feedback without purchase
      const twentyFourHoursAgo = new Date(getMockDate().getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: cooldownCount } = await supabaseAdmin
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_phone', customer_phone)
        .eq('business_id', business_id)
        .is('invoice_number', null)
        .gt('created_at', twentyFourHoursAgo);

      if ((cooldownCount || 0) > 0) {
        return NextResponse.json({ error: 'Cooldown activo. Solo puedes enviar 1 opinión sin compra cada 24 horas.' }, { status: 429 });
      }
    }

    const cleanFeedbackText = feedback_text?.trim() || 'Visita registrada en local';

    const aiResponse = {
      sentiment: 'neutral',
      category: 'other',
      is_spam: cleanFeedbackText.toLowerCase().includes('asdf')
    };

    const status = aiResponse.is_spam ? 'spam_hidden' : 'accumulated';

    let pointsEarned = 0;
    let feedbackPromoApplied = false;
    const hasProvidedFeedback = !!(feedback_text && feedback_text.trim().length > 0);
    const isFeedbackPromoEnabled = resolvedCampaign?.feedback_promo_enabled !== false;
    const feedbackMultiplier = Number(resolvedCampaign?.feedback_multiplier) || 2.0;

    let isFeedbackPromoEligible = false;
    if (invoice_number && hasProvidedFeedback && isFeedbackPromoEnabled) {
      const twentyFourHoursAgo = new Date(getMockDate().getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: feedbackPromoCount } = await supabaseAdmin
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_phone', customer_phone)
        .eq('business_id', business_id)
        .eq('feedback_promo_applied', true)
        .gt('created_at', twentyFourHoursAgo);

      if ((feedbackPromoCount || 0) === 0) {
        isFeedbackPromoEligible = true;
      }
    }

    if (invoice_number && resolvedCampaign && codeRecord) {
      const rate = resolvedCampaign.points_per_value_unit || 1;
      const totalPurchase = Number(codeRecord.purchase_amount) || 0;
      const multiplier = Number(codeRecord.multiplier) || 1.0;
      
      let baseCalculatedPoints = 0;
      if (codeRecord.item_promo_name && codeRecord.promo_amount !== null && codeRecord.promo_amount !== undefined) {
        const promoAmt = Math.min(totalPurchase, Math.max(0, Number(codeRecord.promo_amount)));
        const regularAmt = Math.max(0, totalPurchase - promoAmt);
        
        const regularPts = regularAmt * rate;
        const promoPts = promoAmt * rate * multiplier;
        baseCalculatedPoints = regularPts + promoPts;
      } else {
        baseCalculatedPoints = totalPurchase * rate * multiplier;
      }

      if (isFeedbackPromoEligible) {
        baseCalculatedPoints = baseCalculatedPoints * feedbackMultiplier;
        feedbackPromoApplied = true;
      }

      pointsEarned = Math.round(baseCalculatedPoints * 100) / 100;
    }

    // 5. Create Interaction
    const { data: interaction, error: interactionError } = await supabaseAdmin
      .from('interactions')
      .insert([{
        business_id,
        campaign_id: resolvedCampaignId,
        customer_phone,
        invoice_number: invoice_number || null,
        feedback_text: cleanFeedbackText,
        ai_sentiment: aiResponse.sentiment,
        ai_category: aiResponse.category,
        ai_spam_confidence: aiResponse.is_spam,
        status,
        points_earned: status === 'spam_hidden' ? 0 : pointsEarned,
        multiplier: codeRecord?.multiplier || 1.0,
        item_promo_name: codeRecord?.item_promo_name || null,
        promo_amount: codeRecord?.promo_amount || null,
        feedback_promo_applied: status === 'spam_hidden' ? false : feedbackPromoApplied
      }])
      .select()
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: `Error creando interacción: ${interactionError?.message}` }, { status: 500 });
    }

    let pointsStatus = null;
    if (invoice_number && resolvedCampaignId && !aiResponse.is_spam) {
      const { data: pointsData } = await supabaseAdmin
        .from('interactions')
        .select('points_earned')
        .eq('customer_phone', customer_phone)
        .eq('campaign_id', resolvedCampaignId)
        .neq('status', 'spam_hidden');

      const balance = pointsData
        ? Math.round(pointsData.reduce((sum, i) => sum + Number(i.points_earned || 0), 0) * 100) / 100
        : 0;

      if (resolvedCampaign) {
        pointsStatus = {
          current_points: balance,
          target_points: resolvedCampaign.target_points,
          points_earned: pointsEarned,
          item_promo_name: codeRecord?.item_promo_name || null,
          multiplier: codeRecord?.multiplier || 1.0,
          feedback_promo_applied: feedbackPromoApplied,
          feedback_multiplier: feedbackMultiplier,
          tiers: resolvedCampaign.tiers || [],
          multipliers: resolvedCampaign.multipliers || [],
          current_stamps: balance,
          target_stamps: resolvedCampaign.target_points,
          prize: resolvedCampaign.prize_description,
          campaign_expires: resolvedCampaign.end_date
        };
      }
    }

    const customerPin = generateDeterministicCustomerPin(customer_phone);

    return NextResponse.json({
      message: aiResponse.is_spam ? 'Feedback recibido (marcado como spam)' : 'Interacción registrada con éxito',
      interaction,
      stamps: pointsStatus,
      points: pointsStatus,
      is_first_time: isFirstTime,
      pin: customerPin
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in interactions route handler:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
