import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return new Response('Unauthorized', { status: 401 });

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Create CSV content
    const header = 'ID,Name,Email,Phone,Source,Date\n';
    const rows = leads.map(lead => {
      const date = new Date(lead.createdAt).toISOString();
      // Escape commas and quotes
      const name = `"${(lead.name || '').replace(/"/g, '""')}"`;
      const email = `"${(lead.email || '').replace(/"/g, '""')}"`;
      const phone = `"${(lead.phone || '').replace(/"/g, '""')}"`;
      const source = `"${(lead.source || '').replace(/"/g, '""')}"`;
      return `${lead.id},${name},${email},${phone},${source},${date}`;
    }).join('\n');

    const csvData = header + rows;

    const response = new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

    return response;
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Failed to export leads', { status: 500 });
  }
}
