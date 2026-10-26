import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { runDatabaseSeed } from '@/lib/seed/seed-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const usersCount = await User.countDocuments();

    // Cold start bootstrap check: if users exist, require Super Admin authorization
    if (usersCount > 0) {
      const user = await getSession();
      if (!user || !isSuperAdmin(user)) {
        return NextResponse.json(
          { error: 'Akses ditolak: Hanya Super Administrator yang berwenang menjalankan inisialisasi ulang database.' },
          { status: 403 }
        );
      }
    }

    await runDatabaseSeed();
    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-seed (Roles, Super Admin, Frameworks IMS, Taxonomies)',
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal menjalankan database seed',
      },
      { status: 500 }
    );
  }
}
