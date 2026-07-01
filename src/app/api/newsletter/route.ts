import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60; // Vercel hobby limits
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Basic Auth Check
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch AutoBlog Settings for SMTP
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) {
      return NextResponse.json({ success: false, error: 'SMTP settings are not configured. Please add them in Auto-Blog Settings.' });
    }

    // 2. Fetch Leads (Emails)
    const leads = await prisma.lead.findMany({
      select: { email: true, name: true },
      distinct: ['email'] // prevent duplicates
    });

    if (leads.length === 0) {
      return NextResponse.json({ success: false, error: 'No subscribers found to send newsletter.' });
    }

    // 3. Fetch Top 3 Blogs of the Week
    const topBlogs = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, excerpt: true, slug: true, featuredImage: true }
    });

    if (topBlogs.length === 0) {
      return NextResponse.json({ success: false, error: 'No published blogs found to include in newsletter.' });
    }

    // 4. Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 465,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    // 5. Build HTML Email
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const siteName = siteSettings?.siteName || 'Knowora';
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
          <h1 style="color: #0066cc; margin: 0;">${siteName} Weekly Digest</h1>
          <p style="color: #666; margin-top: 5px;">Here are our top articles you might have missed!</p>
        </div>
        <div style="padding: 20px 0;">
    `;

    topBlogs.forEach((blog) => {
      const url = `https://www.knowora.in/blog/${blog.slug}`;
      const img = blog.featuredImage ? `<img src="${blog.featuredImage}" alt="${blog.title}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; margin-bottom: 10px;" />` : '';
      
      htmlContent += `
        <div style="margin-bottom: 30px; background: #fafafa; padding: 15px; border-radius: 12px; border: 1px solid #eaeaea;">
          ${img}
          <h2 style="margin: 0 0 10px 0;"><a href="${url}" style="color: #111; text-decoration: none;">${blog.title}</a></h2>
          <p style="color: #555; font-size: 14px; margin-bottom: 15px;">${blog.excerpt || 'Read this interesting article on our blog.'}</p>
          <a href="${url}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Read More &rarr;</a>
        </div>
      `;
    });

    htmlContent += `
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #f0f0f0;">
          <p>You are receiving this email because you subscribed to updates at ${siteName}.</p>
        </div>
      </div>
    `;

    // 6. Send Emails
    // For large lists, it's better to use a loop with batching or BCC. We will use BCC for simplicity and rate limiting.
    const emails = leads.map(l => l.email);
    
    // Batch in groups of 50 to avoid SMTP BCC limits
    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      try {
        await transporter.sendMail({
          from: `"${siteName}" <${settings.smtpUser}>`,
          bcc: batch,
          subject: `🔥 Weekly Top Blogs from ${siteName}`,
          html: htmlContent
        });
        successCount += batch.length;
      } catch (err) {
        console.error('Failed batch:', err);
      }
    }

    return NextResponse.json({ success: true, message: `Newsletter sent successfully to ${successCount} subscribers!` });
  } catch (error: any) {
    console.error('Newsletter Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send newsletter' }, { status: 500 });
  }
}
