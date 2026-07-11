import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// -------------------------------------------------------------
// HELPER: WhatsApp Auto-Poster
// -------------------------------------------------------------
async function postToWhatsApp(token: string, phoneId: string, groupId: string, text: string, imageUrl: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: groupId, type: 'image', image: { link: imageUrl, caption: text } })
    });
    return res.ok;
  } catch(e) { return false; }
}

// -------------------------------------------------------------
// HELPER: Instagram Auto-Poster
// -------------------------------------------------------------
async function postToInstagram(token: string, accountId: string, imageUrl: string, caption: string) {
  try {
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`, { method: 'POST' });
    const containerData = await containerRes.json();
    if (containerData.id) {
      await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${containerData.id}&access_token=${token}`, { method: 'POST' });
      return true;
    }
    return false;
  } catch(e) { return false; }
}

// -------------------------------------------------------------
// HELPER: Twitter Auto-Poster (v2)
// -------------------------------------------------------------
async function postToTwitter(bearerToken: string, text: string) {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return res.ok;
  } catch (e) { return false; }
}

// GET: List posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    const qualification = searchParams.get('qualification') || '';
    const status = searchParams.get('status') || '';
    const publishedOnly = searchParams.get('published') === 'true';
    const stateFilter = searchParams.get('stateFilter') || '';
    const jobType = searchParams.get('jobType') || '';

    const where: any = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    
    if (stateFilter) {
      if (stateFilter === 'Central Government' || stateFilter === 'Central News') {
        where.AND.push({
          OR: [
            { title: { contains: 'UPSC', mode: 'insensitive' } },
            { title: { contains: 'SSC', mode: 'insensitive' } },
            { title: { contains: 'Railway', mode: 'insensitive' } },
            { title: { contains: 'RRB', mode: 'insensitive' } },
            { title: { contains: 'IBPS', mode: 'insensitive' } },
            { title: { contains: 'SBI', mode: 'insensitive' } },
            { title: { contains: 'LIC', mode: 'insensitive' } },
            { title: { contains: 'FCI', mode: 'insensitive' } },
            { title: { contains: 'NTA', mode: 'insensitive' } },
            { title: { contains: 'Army', mode: 'insensitive' } },
            { title: { contains: 'Navy', mode: 'insensitive' } },
            { title: { contains: 'Airforce', mode: 'insensitive' } },
            { title: { contains: 'Post Office', mode: 'insensitive' } },
            { title: { contains: 'CTET', mode: 'insensitive' } },
            { title: { contains: 'Central Govt', mode: 'insensitive' } }
          ]
        });
      } else {
        where.AND.push({
          OR: [
            { title: { contains: stateFilter, mode: 'insensitive' } },
            { content: { contains: stateFilter, mode: 'insensitive' } },
            // Specific central job identifiers that apply nationwide (Title only to prevent false positives)
            { title: { contains: 'UPSC', mode: 'insensitive' } },
            { title: { contains: 'SSC', mode: 'insensitive' } },
            { title: { contains: 'Railway', mode: 'insensitive' } },
            { title: { contains: 'RRB', mode: 'insensitive' } },
            { title: { contains: 'IBPS', mode: 'insensitive' } },
            { title: { contains: 'SBI', mode: 'insensitive' } },
            { title: { contains: 'LIC', mode: 'insensitive' } },
            { title: { contains: 'FCI', mode: 'insensitive' } },
            { title: { contains: 'NTA', mode: 'insensitive' } },
            { title: { contains: 'Army', mode: 'insensitive' } },
            { title: { contains: 'Navy', mode: 'insensitive' } },
            { title: { contains: 'Airforce', mode: 'insensitive' } },
            { title: { contains: 'Post Office', mode: 'insensitive' } },
            { title: { contains: 'CTET', mode: 'insensitive' } },
            { title: { contains: 'Central Govt', mode: 'insensitive' } }
          ]
        });
      }
    }

    if (publishedOnly) {
      where.AND.push({
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      });
      where.AND.push({ status: 'Published' });
      where.AND.push({ publishedAt: { lte: new Date() } });
    }

    if (status && status !== 'All') {
      where.AND.push({ status });
    }

    if (jobType) {
      if (jobType === 'active_upcoming' || jobType === 'active' || jobType === 'upcoming') {
        where.AND.push({
          NOT: [
            { title: { contains: 'Result', mode: 'insensitive' } },
            { title: { contains: 'परिणाम' } },
            { title: { contains: 'Admit Card', mode: 'insensitive' } },
            { title: { contains: 'प्रवेश पत्र' } },
            { title: { contains: 'Answer Key', mode: 'insensitive' } },
            { title: { contains: 'उत्तर कुंजी' } },
            { title: { contains: 'एक नज़र में' } },
            { title: { contains: 'Key Highlights' } },
            { title: { contains: 'Highlights', mode: 'insensitive' } },
            { title: { contains: 'Question Paper', mode: 'insensitive' } },
            { title: { contains: 'प्रश्न पत्र' } },
            { title: { contains: 'Syllabus', mode: 'insensitive' } },
            { title: { contains: 'सिलेबस' } },
            { title: { contains: 'Admission', mode: 'insensitive' } },
            { title: { contains: 'दाखिला' } },
            { title: { contains: 'प्रवेश' } }
          ]
        });
      } else if (jobType === 'result') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Results', 'Result', 'Answer Key', 'Syllabus', 'Cutoff', 'Merit List'] } } } } },
            { title: { contains: 'Result', mode: 'insensitive' } },
            { title: { contains: 'परिणाम' } },
            { title: { contains: 'Answer Key', mode: 'insensitive' } },
            { title: { contains: 'उत्तर कुंजी' } },
            { title: { contains: 'Syllabus', mode: 'insensitive' } },
            { title: { contains: 'सिलेबस' } },
            { title: { contains: 'Cutoff', mode: 'insensitive' } },
            { title: { contains: 'कटऑफ' } },
            { title: { contains: 'Merit List', mode: 'insensitive' } },
            { title: { contains: 'मेरिट लिस्ट' } }
          ]
        });
      } else if (jobType === 'admit_card') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Admit Card'] } } } } },
            { title: { contains: 'Admit Card', mode: 'insensitive' } },
            { title: { contains: 'प्रवेश पत्र' } },
            { title: { contains: 'Exam City', mode: 'insensitive' } }
          ]
        });
      } else if (jobType === 'scheme') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Scheme', 'Yojana', 'Government Scheme', 'PM Kisan', 'Sarkari Yojana'] } } } } },
            { title: { contains: 'Scheme', mode: 'insensitive' } },
            { title: { contains: 'Yojana', mode: 'insensitive' } },
            { title: { contains: 'योजना' } },
            { title: { contains: 'PM Kisan', mode: 'insensitive' } },
            { title: { contains: 'E-Shram', mode: 'insensitive' } }
          ]
        });
      } else if (jobType === 'university') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['University', 'IGNOU', 'College', 'Admission', 'Counselling', 'State University'] } } } } },
            { title: { contains: 'University', mode: 'insensitive' } },
            { title: { contains: 'विश्वविद्यालय' } },
            { title: { contains: 'College', mode: 'insensitive' } },
            { title: { contains: 'Admission', mode: 'insensitive' } },
            { title: { contains: 'IGNOU', mode: 'insensitive' } }
          ]
        });
      } else if (jobType === 'scholarship') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Scholarship', 'National Scholarship', 'Scholarships'] } } } } },
            { title: { contains: 'Scholarship', mode: 'insensitive' } },
            { title: { contains: 'छात्रवृत्ति' } }
          ]
        });
      } else if (jobType === 'news') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        where.AND.push({
          publishedAt: { gte: sevenDaysAgo }
        });
        where.AND.push({
          NOT: [
            { tags: { some: { tag: { name: { in: [
              'Job', 'Vacancy', 'Career', 'Education & Career', 'Upcoming', 'Upcoming Job', 'Agami',
              'Admit Card', 'Results', 'Result', 'Answer Key', 'Syllabus', 'Cutoff', 'Merit List',
              'Scheme', 'Yojana', 'Government Scheme', 'PM Kisan', 'Sarkari Yojana',
              'Scholarship', 'National Scholarship', 'Scholarships',
              'University', 'IGNOU', 'College', 'Admission', 'Counselling', 'State University',
              'Technology', 'Smartphone', 'Tech', 'Mobile', 'Gadget',
              'Finance', 'Banking', 'Bank', 'LIC', 'EPFO', 'Savings',
              'Earning', 'Online Earning', 'Course', 'Free Course',
              'School', 'Board Exam', 'CBSE', 'State Board'
            ] } } } } },
            { title: { contains: 'Job', mode: 'insensitive' } },
            { title: { contains: 'Admit Card', mode: 'insensitive' } },
            { title: { contains: 'Result', mode: 'insensitive' } },
            { title: { contains: 'Scheme', mode: 'insensitive' } },
            { title: { contains: 'Scholarship', mode: 'insensitive' } },
            { title: { contains: 'University', mode: 'insensitive' } }
          ]
        });
      }
    }

    if (tag) {
      if (tag === 'Technology') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Technology', 'Smartphone', 'Tech', 'Mobile', 'Gadget'] } } } } },
            { title: { contains: 'Tech', mode: 'insensitive' } },
            { title: { contains: 'Mobile', mode: 'insensitive' } },
            { title: { contains: 'Smartphone', mode: 'insensitive' } }
          ]
        });
        if (!jobType) {
          where.AND.push({
            NOT: [
              { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Scheme', 'Scholarship', 'University', 'Finance', 'Earning', 'School'] } } } } },
              { title: { contains: 'Job', mode: 'insensitive' } },
              { title: { contains: 'Result', mode: 'insensitive' } },
              { title: { contains: 'Scheme', mode: 'insensitive' } },
              { title: { contains: 'Admit Card', mode: 'insensitive' } }
            ]
          });
        }
      } else if (tag === 'Finance & Earning' || tag === 'Finance') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Finance', 'Banking', 'Bank', 'LIC', 'EPFO', 'Savings', 'Earning', 'Online Earning', 'Course', 'Free Course', 'Scheme', 'Yojana', 'Government Scheme', 'PM Kisan', 'Sarkari Yojana'] } } } } },
            { title: { contains: 'Finance', mode: 'insensitive' } },
            { title: { contains: 'Bank', mode: 'insensitive' } },
            { title: { contains: 'Earning', mode: 'insensitive' } },
            { title: { contains: 'Scheme', mode: 'insensitive' } },
            { title: { contains: 'योजना' } }
          ]
        });
        if (!jobType) {
          where.AND.push({
            NOT: [
              { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Admit Card', 'Result', 'University', 'Technology', 'Tech', 'Mobile', 'School'] } } } } },
              { title: { contains: 'Job', mode: 'insensitive' } },
              { title: { contains: 'भर्ती' } },
              { title: { contains: 'Admit Card', mode: 'insensitive' } },
              { title: { contains: 'Result', mode: 'insensitive' } }
            ]
          });
        }
      } else if (tag === 'Education & Career' || tag === 'Career') {
        where.AND.push({
          OR: [
            { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career', 'Education & Career', 'Admit Card', 'Result', 'Syllabus', 'Cutoff', 'Merit List', 'Scholarship', 'University', 'School', 'Board Exam', 'CBSE'] } } } } },
            { title: { contains: 'Job', mode: 'insensitive' } },
            { title: { contains: 'Admit Card', mode: 'insensitive' } },
            { title: { contains: 'Result', mode: 'insensitive' } },
            { title: { contains: 'Scholarship', mode: 'insensitive' } },
            { title: { contains: 'University', mode: 'insensitive' } },
            { title: { contains: 'School', mode: 'insensitive' } }
          ]
        });
        if (!jobType) {
          where.AND.push({
            NOT: [
              { tags: { some: { tag: { name: { in: ['Finance', 'Banking', 'Bank', 'Technology', 'Tech', 'Mobile', 'Smartphone', 'Earning', 'Online Earning', 'Scheme', 'Yojana'] } } } } }
            ]
          });
        }
      } else {
        where.AND.push({ tags: { some: { tag: { name: tag } } } });
      }
    }

    if (qualification) {
      let qualificationKeywords: string[] = [];
      if (qualification === '10th Pass') {
        qualificationKeywords = ['10th', '10वीं', 'matric', 'high school'];
      } else if (qualification === '12th Pass') {
        qualificationKeywords = ['12th', '12वीं', 'intermediate', 'higher secondary'];
      } else if (qualification === 'Graduate') {
        qualificationKeywords = ['graduate', 'graduation', 'degree', 'b.sc', 'b.a', 'b.com', 'bca', 'bba', 'स्नातक'];
      } else if (qualification === 'Post Graduate') {
        qualificationKeywords = ['post graduate', 'postgraduate', 'm.sc', 'm.a', 'm.com', 'mca', 'mba', 'post-graduation', 'परास्नातक'];
      } else if (qualification === 'B.Tech / BE') {
        qualificationKeywords = ['b.tech', 'btech', 'b.e', 'btech pass'];
      } else if (qualification === 'ITI / Diploma') {
        qualificationKeywords = ['iti', 'diploma', 'polytechnic'];
      }

      where.AND.push({
        OR: [
          { tags: { some: { tag: { name: qualification } } } },
          ...qualificationKeywords.map(keyword => ({
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { content: { contains: keyword, mode: 'insensitive' } }
            ]
          }))
        ]
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    let posts: any[] = [];
    let total = 0;
    const isCustomFilteringRequired = ['active', 'upcoming', 'active_upcoming', 'result', 'admit_card', 'scheme', 'university', 'scholarship'].includes(jobType || '');

    if (isCustomFilteringRequired) {
      // Fetch all matches to perform post-query memory filtering safely (for precise pagination)
      const allPosts = await prisma.blogPost.findMany({
        where,
        include: { author: { select: { name: true, email: true } }, tags: { include: { tag: true } } },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
      });

      // Filter in-memory by content structure
      const filteredPosts = allPosts.filter((post: any) => {
        if (!post.content) return false;
        const content = post.content.toLowerCase();
        
        if (jobType === 'active' || jobType === 'upcoming' || jobType === 'active_upcoming') {
          const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
          const hasApply = content.includes('apply') || content.includes('आवेदन');
          const hasLink = content.includes('<a ');
          
          const isApplyNotStarted = content.includes('link active on') || 
                                    content.includes('will be active') ||
                                    content.includes('जल्द सक्रिय होगा') ||
                                    content.includes('link will activate') ||
                                    content.includes('to be announced') ||
                                    content.includes('coming soon') ||
                                    content.includes('जल्द उपलब्ध');

          if (jobType === 'active') {
            return hasNotification && hasApply && hasLink && !isApplyNotStarted;
          } else if (jobType === 'upcoming') {
            return hasNotification && hasLink && (!hasApply || isApplyNotStarted);
          } else {
            // active_upcoming matches either
            const isActive = hasNotification && hasApply && hasLink && !isApplyNotStarted;
            const isUpcoming = hasNotification && hasLink && (!hasApply || isApplyNotStarted);
            return isActive || isUpcoming;
          }
        } else if (jobType === 'result') {
          const hasLink = content.includes('<a ');
          return hasLink;
        } else if (jobType === 'admit_card') {
          const hasNotificationOrOfficial = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('official') || content.includes('आधिकारिक');
          const hasAdmitCardOrCity = content.includes('admit card') || content.includes('प्रवेश पत्र') || content.includes('exam city') || content.includes('परीक्षा शहर');
          const hasLink = content.includes('<a ');
          return hasNotificationOrOfficial && hasAdmitCardOrCity && hasLink;
        } else if (jobType === 'scheme') {
          const hasOfficial = content.includes('official') || content.includes('आधिकारिक') || content.includes('website');
          const hasLink = content.includes('<a ');
          return hasOfficial && hasLink;
        } else if (jobType === 'university') {
          const hasOfficial = content.includes('official') || content.includes('आधिकारिक');
          const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
          const hasLink = content.includes('<a ');
          return hasOfficial && hasNotification && hasLink;
        } else if (jobType === 'scholarship') {
          const hasOfficial = content.includes('official') || content.includes('आधिकारिक') || content.includes('website');
          const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
          const hasLink = content.includes('<a ');
          return hasOfficial && hasNotification && hasLink;
        }
        return true;
      });

      total = filteredPosts.length;
      posts = filteredPosts.slice((page - 1) * limit, page * limit);
    } else {
      const [dbPosts, dbTotal] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          include: { author: { select: { name: true, email: true } }, tags: { include: { tag: true } } },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.blogPost.count({ where }),
      ]);
      posts = dbPosts;
      total = dbTotal;
    }

    // Format tags array
    const formattedPosts = posts.map((p: any) => ({
      ...p,
      tags: p.tags.map((t: any) => t.tag.name)
    }));

    const response = NextResponse.json({
      posts: formattedPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
    
    // Cache for 60 seconds on CDN (Edge), stale-while-revalidate for 5 min
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST: Create post
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, subtitle, slug, content, excerpt, featuredImage, status, seoTitle, seoDescription, seoKeywords, socialCaptions, socialHashtags, scheduledAt, autoGenerated, tags = [], doubleLinkFormat } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if slug exists
    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    const postData: any = {
      title,
      subtitle,
      slug: finalSlug,
      content,
      excerpt,
      featuredImage,
      status: status || 'Draft',
      seoTitle,
      seoDescription,
      seoKeywords,
      socialCaptions,
      socialHashtags,
      autoGenerated: !!autoGenerated,
      authorId: user.userId,
      translations: {
        metadata: {
          doubleLinkFormat: !!doubleLinkFormat
        }
      }
    };

    if (status === 'Published') {
      postData.publishedAt = new Date();
    } else if (status === 'Scheduled' && scheduledAt) {
      postData.scheduledAt = new Date(scheduledAt);
    }

    const newPost = await prisma.blogPost.create({ data: postData });

    // Handle tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug }
        });
        await prisma.postTag.create({
          data: { postId: newPost.id, tagId: tag.id }
        });
      }
    }

    // Social Media Auto-Poster Logic
    if (status === 'Published') {
      try {
        const savedKeys = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
        if (savedKeys) {
          const socialCaption = socialCaptions || `Check out our latest article: ${title}\n\nRead more here: https://www.knowora.in/blog/${newPost.slug}\n\n${socialHashtags || ''}`;
          const socialImageUrl = `https://www.knowora.in/api/og?title=${encodeURIComponent(title)}&bg=${encodeURIComponent(featuredImage)}`;

          // 1. WhatsApp
          if (savedKeys.whatsappToken && savedKeys.whatsappPhoneId && savedKeys.whatsappGroupId) {
            await postToWhatsApp(savedKeys.whatsappToken, savedKeys.whatsappPhoneId, savedKeys.whatsappGroupId, socialCaption, socialImageUrl);
          }

          // 2. Instagram
          if (savedKeys.instagramToken && savedKeys.instagramAccountId) {
            await postToInstagram(savedKeys.instagramToken, savedKeys.instagramAccountId, socialImageUrl, socialCaption);
          }

          // 3. Twitter
          if (savedKeys.twitter) {
            await postToTwitter(savedKeys.twitter, socialCaption);
          }

          // 4. Telegram
          if (savedKeys.telegramToken && savedKeys.telegramChatId) {
            await fetch(`https://api.telegram.org/bot${savedKeys.telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: savedKeys.telegramChatId,
                text: socialCaption,
                parse_mode: 'HTML'
              })
            }).catch(() => {});
          }

          // 5. OneSignal Push Notifications
          if (savedKeys.onesignalAppId && savedKeys.onesignalApiKey) {
            await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${savedKeys.onesignalApiKey}`
              },
              body: JSON.stringify({
                app_id: savedKeys.onesignalAppId,
                included_segments: ['Subscribed Users'],
                headings: { en: title },
                contents: { en: excerpt || 'Read our latest post!' },
                url: `https://www.knowora.in/blog/${newPost.slug}`,
                big_picture: socialImageUrl
              })
            }).catch(() => {});
          }

          // 6. Google Indexing API Submission (Instant indexation for manual posts)
          if (savedKeys.googleIndexingJson) {
            try {
              const { submitToGoogleIndexing } = require('@/lib/google-indexing');
              const postUrl = `https://knowora.in/blog/${newPost.slug}`;
              console.log("Submitting manually created post to Google Indexing API:", postUrl);
              await submitToGoogleIndexing(postUrl, 'URL_UPDATED', savedKeys.googleIndexingJson);
            } catch (e) {
              console.error("Google Indexing failed for manual post:", e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to trigger social media auto-post', err);
      }
    }

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// DELETE: Delete post
export async function DELETE(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // First delete associated tags to prevent foreign key constraints
    await prisma.postTag.deleteMany({ where: { postId: id } });
    // Then delete the post
    await prisma.blogPost.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
