import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, businessName } = body;

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
      await supabaseAdmin.from('role_permissions').insert([{
        role_id: adminRole.id,
        permission_id: 'global_admin'
      }]);
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
