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

    // 1. Find business by slug, name or ID
    const query = businessName.trim();
    const cleanSlug = query.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    let businessId: string | null = null;

    // Try to find by slug
    if (cleanSlug) {
      const { data: bBySlug } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', cleanSlug)
        .limit(1);

      if (bBySlug && bBySlug.length > 0) {
        businessId = bBySlug[0].id;
      }
    }

    // Fallback: find by exact or ilike name
    if (!businessId) {
      const { data: bByName } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .ilike('name', query)
        .limit(1);

      if (bByName && bByName.length > 0) {
        businessId = bByName[0].id;
      }
    }

    // Fallback: check if query is a direct UUID
    if (!businessId && query.length === 36) {
      const { data: bById } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('id', query)
        .limit(1);

      if (bById && bById.length > 0) {
        businessId = bById[0].id;
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: 'No se encontró ningún comercio con ese identificador o nombre.' }, { status: 404 });
    }

    // 2. Find staff by business_id and username
    const { data: staff } = await supabaseAdmin
      .from('business_staff')
      .select('profile:profiles(email)')
      .eq('business_id', businessId)
      .eq('username', cleanUsername)
      .single();

    const staffEmail = (staff?.profile as any)?.email;
    if (!staff || !staffEmail) {
      return NextResponse.json({ error: 'Credenciales de colaborador no encontradas. Verifique el comercio y usuario.' }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Staff profile resolved',
      email: staffEmail
    });

  } catch (error: any) {
    console.error('Error in login-staff route handler:', error);
    return NextResponse.json({ error: 'Error al procesar login de colaborador.' }, { status: 500 });
  }
}
