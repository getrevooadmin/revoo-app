import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
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
      .from('business_staff')
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
        role: 'merchant'
      }])
      .select()
      .single();

    if (profileError || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Error creando perfil: ${profileError?.message}` }, { status: 400 });
    }

    // Insert business_staff record
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('business_staff')
      .insert([{
        business_id: businessId,
        profile_id: profile.id,
        username: cleanUsername,
        alias: alias.trim()
      }])
      .select()
      .single();

    if (staffError || !staff) {
      await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Error vinculando colaborador al comercio: ${staffError?.message}` }, { status: 400 });
    }

    // Assign role in staff_roles
    const { error: roleError } = await supabaseAdmin
      .from('staff_roles')
      .insert([{ staff_id: staff.id, role_id: roleId }]);

    if (roleError) {
      await supabaseAdmin.from('business_staff').delete().eq('id', staff.id);
      await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Error asignando rol: ${roleError.message}` }, { status: 400 });
    }

    const { data: role } = await supabaseAdmin.from('roles').select('*').eq('id', roleId).single();

    return NextResponse.json({
      message: 'Staff account created successfully',
      account: {
        id: profile.id,
        staff_id: staff.id,
        email: profile.email,
        full_name: profile.full_name,
        username: staff.username,
        alias: staff.alias,
        business_id: staff.business_id,
        custom_role_id: roleId,
        custom_role: role
      }
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

    // Find staff record by profile_id or staff id
    const { data: currentStaff } = await supabaseAdmin
      .from('business_staff')
      .select('*, profile:profiles(*)')
      .or(`profile_id.eq.${accountId},id.eq.${accountId}`)
      .single();

    if (!currentStaff) {
      return NextResponse.json({ error: 'Cuenta de colaborador no encontrada.' }, { status: 404 });
    }

    // Check username uniqueness if changed
    let cleanUsername = currentStaff.username;
    if (username && username.trim()) {
      cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (cleanUsername !== currentStaff.username) {
        const { data: existingUser } = await supabaseAdmin
          .from('business_staff')
          .select('id')
          .eq('business_id', currentStaff.business_id)
          .eq('username', cleanUsername)
          .neq('id', currentStaff.id)
          .single();

        if (existingUser) {
          return NextResponse.json({ error: 'Ya existe un usuario con este nombre de usuario en este comercio.' }, { status: 400 });
        }
      }
    }

    // Update Auth user password if provided
    if (password && password.trim().length >= 6) {
      await supabaseAdmin.auth.admin.updateUserById(currentStaff.profile_id, { password });
    }

    // Update business_staff & profile
    const { error: staffUpdateError } = await supabaseAdmin
      .from('business_staff')
      .update({
        alias: alias.trim(),
        username: cleanUsername
      })
      .eq('id', currentStaff.id);

    if (staffUpdateError) {
      return NextResponse.json({ error: staffUpdateError.message }, { status: 400 });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ full_name: alias.trim() })
      .eq('id', currentStaff.profile_id);

    // Replace role assignment in staff_roles
    await supabaseAdmin.from('staff_roles').delete().eq('staff_id', currentStaff.id);
    const { error: roleError } = await supabaseAdmin
      .from('staff_roles')
      .insert([{ staff_id: currentStaff.id, role_id: roleId }]);

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 400 });
    }

    const { data: role } = await supabaseAdmin.from('roles').select('*').eq('id', roleId).single();

    return NextResponse.json({
      message: 'Cuenta actualizada exitosamente',
      account: {
        id: currentStaff.profile_id,
        staff_id: currentStaff.id,
        email: currentStaff.profile?.email || '',
        full_name: alias.trim(),
        username: cleanUsername,
        alias: alias.trim(),
        business_id: currentStaff.business_id,
        custom_role_id: roleId,
        custom_role: role
      }
    });
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

    const { data: currentStaff } = await supabaseAdmin
      .from('business_staff')
      .select('*, staff_roles(role:roles(is_system))')
      .or(`profile_id.eq.${accountId},id.eq.${accountId}`)
      .single();

    if (!currentStaff) {
      return NextResponse.json({ error: 'Cuenta de colaborador no encontrada.' }, { status: 404 });
    }

    // Check if staff has a system role (Administrador Global)
    if ((currentStaff.staff_roles || []).some((sr: any) => sr.role?.is_system)) {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta del Administrador Global principal.' }, { status: 403 });
    }

    // Delete user from Supabase Auth (cascades to profile and business_staff)
    await supabaseAdmin.auth.admin.deleteUser(currentStaff.profile_id);
    await supabaseAdmin.from('business_staff').delete().eq('id', currentStaff.id);
    await supabaseAdmin.from('profiles').delete().eq('id', currentStaff.profile_id);

    return NextResponse.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al eliminar cuenta' }, { status: 500 });
  }
}
