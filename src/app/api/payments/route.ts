import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await db.payment.findMany({
      where: { orgId: user.orgId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      payments: payments.map(p => ({
        ...p,
        amount: Number(p.amount),
      })),
    });
  } catch (error) {
    console.error('Payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
