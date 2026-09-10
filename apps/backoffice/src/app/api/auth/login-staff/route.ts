import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, username, password } = body;

    if (!businessName || !username || !password) {
      return NextResponse.json({ error: 'Comercio, usuario y contraseña son requeridos.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Find business by name or ID
    let businessId = businessName.trim();
    const { data: bByName } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .ilike('name', businessName.trim())
      .limit(1);

    if (bByName && bByName.length > 0) {
      businessId = bByName[0].id;
    }

    // 2. Find profile by business_id and username
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('business_id', businessId)
      .eq('username', cleanUsername)
      .single();

    if (!profile || !profile.email) {
      return NextResponse.json({ error: 'Credenciales de colaborador no encontradas. Verifique el comercio y usuario.' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Staff profile resolved',
      email: profile.email
    });

  } catch (error: any) {
    console.error('Error in login-staff route handler:', error);
    return NextResponse.json({ error: 'Error al procesar login de colaborador.' }, { status: 500 });
  }
}
