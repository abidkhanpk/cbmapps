import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { companySchema } from '@/lib/validation/schemas';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { AuditService } from '@/lib/services/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = session.user.roles || [];
    if (!hasPermission(userRoles, PERMISSIONS.VIEW_ASSET)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            sites: true,
            fmeca_studies: true,
          },
        },
      },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = session.user.roles || [];
    if (!hasPermission(userRoles, PERMISSIONS.CREATE_ASSET)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = companySchema.parse(body);

    const company = await prisma.company.create({
      data: validatedData,
    });

    // Audit log
    await AuditService.logCreate(
      session.user.id,
      'company',
      company.id,
      { name: company.name, code: company.code }
    );

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Company name or code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}