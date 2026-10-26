import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { getSession, hashPassword } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'user:update')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin user:update' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const body = await req.json();
    const { fullName, roleIds, departmentId, isActive, unlock, newPassword } = body;

    const superAdminRole = await Role.findOne({ code: 'SUPER_ADMIN' });
    const targetIsSuperAdmin = superAdminRole && targetUser.roleIds.some((r: any) => r.toString() === superAdminRole._id.toString());
    const isCallerSuperAdmin = isSuperAdmin(user);

    // Safeguard 1: Non-SuperAdmin cannot edit a SuperAdmin account
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Super Administrator yang berhak mengubah atau mereset akun Super Administrator.' },
        { status: 403 }
      );
    }

    // Safeguard 2: Non-SuperAdmin cannot grant SUPER_ADMIN role
    if (superAdminRole && Array.isArray(roleIds) && roleIds.includes(superAdminRole._id.toString()) && !isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Super Administrator yang berhak menetapkan peran Super Admin.' },
        { status: 403 }
      );
    }

    // Safeguard 3: Prevent demoting or deactivating the last active Super Admin
    if (targetIsSuperAdmin && (isActive === false || (Array.isArray(roleIds) && !roleIds.includes(superAdminRole._id.toString())))) {
      const activeSuperAdminCount = await User.countDocuments({
        roleIds: superAdminRole._id,
        isActive: true,
      });
      if (activeSuperAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Gagal: Sistem harus memiliki minimal 1 Super Administrator aktif. Anda tidak dapat menonaktifkan atau mencabut peran Super Admin terakhir.' },
          { status: 400 }
        );
      }
    }

    // Granular permission check: unlock account
    if (unlock) {
      if (!can(user, 'user:unlock') && !isCallerSuperAdmin) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda membutuhkan izin user:unlock untuk membuka kunci akun.' },
          { status: 403 }
        );
      }
      targetUser.security = {
        ...(targetUser.security || {}),
        failedAttempts: 0,
        lockedUntil: null,
      };
    }

    if (typeof isActive === 'boolean') {
      // Safeguard: cannot deactivate self
      if (user.id === id && !isActive) {
        return NextResponse.json(
          { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
          { status: 400 }
        );
      }
      targetUser.isActive = isActive;
    }

    if (fullName) targetUser.fullName = fullName.trim();
    if (Array.isArray(roleIds) && roleIds.length > 0) targetUser.roleIds = roleIds;
    if (departmentId !== undefined) targetUser.departmentId = departmentId || null;

    // Granular permission check: reset password
    if (newPassword && newPassword.trim()) {
      if (!can(user, 'user:reset_password') && !isCallerSuperAdmin) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda membutuhkan izin user:reset_password untuk mereset kata sandi.' },
          { status: 403 }
        );
      }
      targetUser.passwordHash = await hashPassword(newPassword.trim());
    }

    await targetUser.save();

    await logAudit({
      actor: user,
      action: unlock ? 'user.unlock' : 'user.update',
      resource: { type: 'user', id, name: targetUser.fullName },
      status: 'SUCCESS',
      metadata: { unlock, isActive, updatedRoles: roleIds },
    });

    const populated = await User.findById(id)
      .populate('roleIds')
      .populate('departmentId')
      .lean();

    return NextResponse.json({ success: true, user: populated });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'user:delete')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin user:delete' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    if (user.id === id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Safeguard: Prevent deleting the last superadmin
    const superAdminRole = await Role.findOne({ code: 'SUPER_ADMIN' });
    if (superAdminRole && targetUser.roleIds.includes(superAdminRole._id)) {
      const superAdminCount = await User.countDocuments({
        roleIds: superAdminRole._id,
        isActive: true,
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Gagal: Tidak dapat menghapus Super Admin terakhir pada sistem.' },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    await logAudit({
      actor: user,
      action: 'user.delete',
      resource: { type: 'user', id, name: targetUser.fullName },
      status: 'SUCCESS',
      metadata: { username: targetUser.username },
    });

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus dari sistem.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
