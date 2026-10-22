import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Seeded by migration 20260903000000_global_admin_role_and_profile_roles.sql
const GLOBAL_ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';

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
    const { email, password, fullName, businessName } = body;

    const supabaseAdmin = getSupabaseAdmin();

    if (!email || !password || !fullName || !businessName) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    // 1. Create Business (our client company)
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert([{ name: businessName.trim() }])
      .select()
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: `Error creando negocio: ${businessError?.message}` }, { status: 400 });
    }

    // 2. Create Auth user with the signup email
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'merchant',
        business_id: business.id
      }
    });

    if (authError || !authUser.user) {
      await supabaseAdmin.from('businesses').delete().eq('id', business.id);
      return NextResponse.json({ error: authError?.message || 'Error al crear la cuenta de usuario' }, { status: 400 });
    }

    // 3. Create generic Profile (identity)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authUser.user.id,
        email: authUser.user.email || email,
        full_name: fullName.trim(),
        role: 'merchant',
        phone: null
      }])
      .select()
      .single();

    if (profileError || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('businesses').delete().eq('id', business.id);
      return NextResponse.json({ error: `Error creando perfil: ${profileError?.message}` }, { status: 400 });
    }

    // 4. Create Business Staff record
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('business_staff')
      .insert([{
        business_id: business.id,
        profile_id: profile.id,
        alias: fullName.trim()
      }])
      .select()
      .single();

    if (staffError || !staff) {
      await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('businesses').delete().eq('id', business.id);
      return NextResponse.json({ error: `Error registrando colaborador: ${staffError?.message}` }, { status: 400 });
    }

    // 5. Assign the default Global Admin role in staff_roles
    const { error: roleError } = await supabaseAdmin
      .from('staff_roles')
      .insert([{ staff_id: staff.id, role_id: GLOBAL_ADMIN_ROLE_ID }]);

    if (roleError) {
      await supabaseAdmin.from('business_staff').delete().eq('id', staff.id);
      await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('businesses').delete().eq('id', business.id);
      return NextResponse.json({ error: `Error asignando rol: ${roleError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Merchant registered successfully!',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: profile.role,
        businessId: business.id,
        fullName: profile.full_name
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in register-merchant route handler:', error);
    return NextResponse.json({ error: 'Error interno del servidor durante el registro' }, { status: 500 });
  }
}
