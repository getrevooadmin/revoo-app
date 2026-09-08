import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // 1. Create Business in Supabase
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert([{ name: businessName.trim() }])
      .select()
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: `Error creando negocio: ${businessError?.message}` }, { status: 400 });
    }

    // 2. Create Default Global Admin Role for Business
    const { data: adminRole } = await supabaseAdmin
      .from('roles')
      .insert([{
        business_id: business.id,
        name: 'Administrador Global',
        description: 'Acceso total y configuración del comercio',
        is_system: true
      }])
      .select()
      .single();

    if (adminRole) {
      const { data: globalAdminPerm } = await supabaseAdmin
        .from('permissions')
        .select('id')
        .eq('slug', 'global_admin')
        .single();

      if (globalAdminPerm) {
        await supabaseAdmin.from('role_permissions').insert([{
          role_id: adminRole.id,
          permission_id: globalAdminPerm.id
        }]);
      }
    }

    // 3. Create User in Supabase Auth via admin API
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
      return NextResponse.json({ error: authError?.message || 'Error al crear la cuenta de usuario' }, { status: 400 });
    }

    // 4. Create Profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authUser.user.id,
        email: authUser.user.email || email,
        full_name: fullName.trim(),
        role: 'merchant',
        business_id: business.id,
        custom_role_id: adminRole?.id || null,
        phone: null
      }])
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: `Error creando perfil: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Merchant registered successfully!',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: profile.role,
        businessId: profile.business_id,
        fullName: profile.full_name
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in register-merchant route handler:', error);
    return NextResponse.json({ error: 'Error interno del servidor durante el registro' }, { status: 500 });
  }
}
