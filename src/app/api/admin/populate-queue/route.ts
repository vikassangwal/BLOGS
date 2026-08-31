import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SEED_KEYWORDS = [
  'SSC CGL 2026 Notification & Exam Date',
  'RRB Group D 2026 Recruitment Online Form',
  'UPSC Civil Services IAS Prelims 2026 Notification',
  'IBPS PO 2026 Notification & Syllabus',
  'SBI Clerk 2026 Recruitment Online Apply',
  'Army Agniveer Bharti 2026 Registration',
  'Air Force Agniveer Vayu Intake 2026 Form',
  'Navy SSR MR Recruitment 2026 Notification',
  'India Post GDS Recruitment 2026 Merit List',
  'CTET 2026 Online Form & Exam Date',
  'Rajasthan Police Constable Bharti 2026',
  'UPSSSC PET 2026 Notification & Syllabus',
  'Bihar Police Constable Recruitment 2026',
  'MP Police Constable Bharti 2026 Form',
  'Haryana CET Group C D 2026 Notification',
  'Delhi Police Constable Recruitment 2026',
  'Railway RRB ALP Technician Bharti 2026',
  'LIC AAO ADO Recruitment 2026 Apply Online',
  'FCI Assistant Manager Recruitment 2026',
  'RPSC RAS 2026 Notification PDF Download',
  'BPSC 71st CCE Notification 2026',
  'UKPSC Combined State Civil Services 2026',
  'JSSC CGL 2026 Exam Date & Admit Card',
  'OSSSC Combined Recruitment Exam 2026',
  'APPSC Group 2 Recruitment 2026 Notification',
  'TSPSC Group 1 2 2026 Online Form',
  'KPSC KAS Recruitment 2026 Notification',
  'MPSC State Services Prelims Exam 2026',
  'WBPSC WBCS 2026 Notification & Syllabus',
  'Punjab Police Constable Sub Inspector 2026'
];

export async function GET() {
  try {
    let added = 0;
    for (const kw of SEED_KEYWORDS) {
      const exists = await prisma.autoBlogKeyword.findFirst({ where: { keyword: kw } });
      if (!exists) {
        await prisma.autoBlogKeyword.create({
          data: {
            keyword: kw,
            niche: 'Education & Career',
            status: 'pending',
            priority: 10
          }
        });
        added++;
      }
    }

    const totalKeywords = await prisma.autoBlogKeyword.count();
    const totalPosts = await prisma.blogPost.count();

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${added} नए 2026 कीवर्ड्स ऑटो-ब्लॉग कतार में जोड़ दिए गए हैं!`,
      totalKeywords,
      totalPosts
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
