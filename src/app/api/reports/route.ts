import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AccountType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'balance-sheet';

    const accounts = await db.account.findMany({
      where: { orgId: user.orgId, isActive: true },
      orderBy: { code: 'asc' },
    });

    if (type === 'balance-sheet') {
      const assets = accounts.filter(a => a.type === AccountType.ASSET);
      const liabilities = accounts.filter(a => a.type === AccountType.LIABILITY);
      const equity = accounts.filter(a => a.type === AccountType.EQUITY);

      return NextResponse.json({
        assets: assets.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Number(a.balance) })),
        liabilities: liabilities.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Number(a.balance) })),
        equity: equity.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Number(a.balance) })),
        totalAssets: assets.reduce((sum, a) => sum + Number(a.balance), 0),
        totalLiabilities: liabilities.reduce((sum, a) => sum + Number(a.balance), 0),
        totalEquity: equity.reduce((sum, a) => sum + Number(a.balance), 0),
      });
    }

    if (type === 'profit-loss') {
      const revenue = accounts.filter(a => a.type === AccountType.REVENUE);
      const expenses = accounts.filter(a => a.type === AccountType.EXPENSE);

      const totalRevenue = revenue.reduce((sum, a) => sum + Number(a.balance), 0);
      const totalExpenses = expenses.reduce((sum, a) => sum + Number(a.balance), 0);

      return NextResponse.json({
        revenue: revenue.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Number(a.balance) })),
        expenses: expenses.map(a => ({ id: a.id, code: a.code, name: a.name, balance: Number(a.balance) })),
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
      });
    }

    if (type === 'trial-balance') {
      const accountsWithBalance = accounts.map(a => {
        const balance = Number(a.balance);
        const isDebit = a.type === AccountType.ASSET || a.type === AccountType.EXPENSE;
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          debit: isDebit ? Math.max(balance, 0) : 0,
          credit: !isDebit ? Math.max(balance, 0) : 0,
        };
      });

      const totalDebit = accountsWithBalance.reduce((sum, a) => sum + a.debit, 0);
      const totalCredit = accountsWithBalance.reduce((sum, a) => sum + a.credit, 0);

      return NextResponse.json({
        accounts: accountsWithBalance,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
