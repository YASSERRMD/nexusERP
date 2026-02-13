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

    // Get counts
    const [
      totalCustomers,
      totalProducts,
      totalInvoices,
    ] = await Promise.all([
      db.customer.count({ where: { orgId: user.orgId } }),
      db.product.count({ where: { orgId: user.orgId } }),
      db.invoice.count({ where: { orgId: user.orgId } }),
    ]);

    // Get financial summaries
    const invoices = await db.invoice.findMany({
      where: { orgId: user.orgId, status: { not: 'DRAFT' } },
      select: { total: true, amountPaid: true, amountDue: true },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const pendingPayments = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);

    // Get revenue by month (last 6 months)
    const months: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0,
      });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const paidInvoices = await db.invoice.findMany({
      where: {
        orgId: user.orgId,
        status: { not: 'DRAFT' },
        date: { gte: sixMonthsAgo },
      },
      select: { date: true, amountPaid: true },
    });

    paidInvoices.forEach(inv => {
      const monthIndex = months.findIndex(m => 
        m.month === inv.date.toLocaleDateString('en-US', { month: 'short' })
      );
      if (monthIndex >= 0) {
        months[monthIndex].amount += Number(inv.amountPaid);
      }
    });

    // Get recent invoices
    const recentInvoices = await db.invoice.findMany({
      where: { orgId: user.orgId },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get recent payments
    const recentPayments = await db.payment.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      totalRevenue,
      totalExpenses: 0,
      totalInvoices,
      totalCustomers,
      totalProducts,
      pendingPayments,
      revenueByMonth: months,
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        total: Number(inv.total),
        status: inv.status,
      })),
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        paymentType: p.paymentType,
        amount: Number(p.amount),
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
