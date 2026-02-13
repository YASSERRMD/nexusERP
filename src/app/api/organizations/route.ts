import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    const organization = await db.organization.findUnique({
      where: { id: user.orgId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        taxId: organization.taxId,
        currency: organization.currency,
        fiscalYear: organization.fiscalYear,
        isActive: organization.isActive,
      },
    });
  } catch (error) {
    console.error('Organization fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    const organization = await db.organization.update({
      where: { id: user.orgId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        taxId: body.taxId,
        currency: body.currency,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Organization update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
