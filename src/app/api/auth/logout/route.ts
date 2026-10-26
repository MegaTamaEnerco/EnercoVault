import { NextResponse } from 'next/server';
import { COOKIE_NAME, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST() {
  const user = await getSession();

  if (user) {
    await logAudit({
      actor: user,
      action: 'auth.logout',
      resource: { type: 'user', id: user.id },
      status: 'SUCCESS',
    });
  }

  const response = NextResponse.json({ success: true, message: 'Berhasil logout' });

  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
