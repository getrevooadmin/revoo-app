import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// POST: Create new Staff Account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, username, alias, password, roleId } = body;

    const supabaseAdmin = getSupabaseAdmin();

    if (!businessId || !username || !alias || !password || !roleId) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios (Negocio, Usuario, Alias, Contraseña, Rol).' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener al menos 3 caracteres alfanuméricos.' }, { status: 400 });
    }

    // Check if username exists for this business
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('business_id', businessId)
      .eq('username', cleanUsername)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con este nombre de usuario en este comercio.' }, { status: 400 });
    }

    // Internal unique email for staff auth
    const internalEmail = `${cleanUsername}.${businessId.slice(0, 8)}@staff.revoo.internal`;

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        alias: alias.trim(),
        role: 'merchant',
        business_id: businessId
      }
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message || 'Error al crear credenciales de colaborador.' }, { status: 400 });
    }

    // Insert profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authUser.user.id,
        email: internalEmail,
        full_name: alias.trim(),
        username: cleanUsername,
        alias: alias.trim(),
        role: 'merchant',
        custom_role_id: roleId,
        business_id: businessId
      }])
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: `Error creando perfil: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Staff account created successfully',
      account: profile
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in manage-staff POST handler:', error);
    return NextResponse.json({ error: 'Error interno al crear cuenta de colaborador.' }, { status: 500 });
  }
}

// PUT: Edit existing Staff Account
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { accountId, username, alias, password, roleId } = body;

    const supabaseAdmin = getSupabaseAdmin();

    if (!accountId || !alias || !roleId) {
      return NextResponse.json({ error: 'ID de cuenta, Alias y Rol son obligatorios.' }, { status: 400 });
    }

    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('*, custom_role:roles(is_system)')
      .eq('id', accountId)
      .single();

    if (!currentProfile) {
      return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
    }

    // Check username uniqueness if changed
    let cleanUsername = currentProfile.username;
    if (username && username.trim()) {
      cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (cleanUsername !== currentProfile.username) {
        const { data: existingUser } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('business_id', currentProfile.business_id)
          .eq('username', cleanUsername)
          .neq('id', accountId)
          .single();

        if (existingUser) {
          return NextResponse.json({ error: 'Ya existe un usuario con este nombre de usuario en este comercio.' }, { status: 400 });
        }
      }
    }

    // Update Auth user password if provided
    if (password && password.trim().length >= 6) {
      await supabaseAdmin.auth.admin.updateUserById(accountId, { password });
    }

    // Update profile
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: alias.trim(),
        alias: alias.trim(),
        username: cleanUsername,
        custom_role_id: roleId
      })
      .eq('id', accountId)
      .select('*, custom_role:roles(*)')
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Cuenta actualizada exitosamente', account: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al actualizar cuenta' }, { status: 500 });
  }
}

// DELETE: Remove Staff Account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    const supabaseAdmin = getSupabaseAdmin();

    if (!accountId) {
      return NextResponse.json({ error: 'ID de cuenta requerido.' }, { status: 400 });
    }

    // Check if account has a system role (Administrador Global)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('custom_role:roles(is_system)')
      .eq('id', accountId)
      .single();

    if ((profile as any)?.custom_role?.is_system) {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta del Administrador Global principal.' }, { status: 403 });
    }

    // Delete user from Supabase Auth & profiles
    await supabaseAdmin.auth.admin.deleteUser(accountId);
    await supabaseAdmin.from('profiles').delete().eq('id', accountId);

    return NextResponse.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar cuenta' }, { status: 500 });
  }
}
