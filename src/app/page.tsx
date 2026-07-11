import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import BlogChatbot from '@/components/BlogChatbot';
import SocialJoinStrip from '@/components/SocialJoinStrip';
export const revalidate = 60; // Revalidate the page every 60 seconds for performance

async function getPostsByTag(tag: string) {
  try {
    return await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: {
          some: {
            tag: {
              name: tag
            }
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        createdAt: true
      }
    });
  } catch (err) {
    console.error('Failed to fetch', tag, err);
    return [];
  }
}

async function getPostsByTagsAndKeywords(tags: string[], keywords: string[] = [], limit: number = 8) {
  try {
    const whereClause: any = {
      status: 'Published',
      OR: [
        { tags: { some: { tag: { name: { in: tags } } } } }
      ]
    };
    if (keywords.length > 0) {
      const keywordConditions = keywords.map(kw => ({
        title: { contains: kw, mode: 'insensitive' as const }
      }));
      whereClause.OR.push({
        AND: [
          { tags: { some: { tag: { name: { in: ['Education & Career', 'News', 'Finance & Earning'] } } } } },
          { OR: keywordConditions }
        ]
      });
    }
    
    return await prisma.blogPost.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true
      }
    });
  } catch (err) {
    console.error('Failed to fetch posts for tags/keywords:', tags, keywords, err);
    return [];
  }
}

async function getActiveJobs(limit: number = 8) {
  const now = new Date();
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career', 'Education & Career'] } } } },
        NOT: [
          { tags: { some: { tag: { name: { in: ['Upcoming', 'Upcoming Job', 'Agami'] } } } } },
          { title: { contains: 'संभावित' } },
          { title: { contains: 'Upcoming' } },
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
        ],
        OR: [
          { expiryDate: { gte: now } },
          { expiryDate: null }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3, // Fetch extra to filter in memory
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true,
        content: true
      }
    });

    // Filter to ensure both Apply and Notification links/text exist and application has started
    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      // Must have notification and apply text, plus an HTML link
      const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
      const hasApply = content.includes('apply') || content.includes('आवेदन');
      const hasLink = content.includes('<a ');
      
      // Exclude if it mentions the link will be active in the future
      const isApplyNotStarted = content.includes('link active on') || 
                                content.includes('will be active') ||
                                content.includes('जल्द सक्रिय होगा') ||
                                content.includes('link will activate') ||
                                content.includes('to be announced') ||
                                content.includes('coming soon') ||
                                content.includes('जल्द उपलब्ध');

      return hasNotification && hasApply && hasLink && !isApplyNotStarted;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch active jobs:', err);
    return [];
  }
}

async function getUpcomingJobs(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career', 'Education & Career'] } } } },
        OR: [
          { tags: { some: { tag: { name: { in: ['Upcoming', 'Upcoming Job', 'Agami'] } } } } },
          { title: { contains: 'संभावित' } },
          { title: { contains: 'Upcoming', mode: 'insensitive' } },
          { title: { contains: 'Expected', mode: 'insensitive' } },
          { title: { contains: 'आगामी' } }
        ],
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
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3, // Fetch extra for memory filtering
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true,
        content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
      const hasLink = content.includes('<a ');
      const hasApply = content.includes('apply') || content.includes('आवेदन');
      
      const isApplyNotStarted = content.includes('link active on') || 
                                content.includes('will be active') ||
                                content.includes('जल्द सक्रिय होगा') ||
                                content.includes('link will activate') ||
                                content.includes('to be announced') ||
                                content.includes('coming soon') ||
                                content.includes('जल्द उपलब्ध');

      // Keep in upcoming if there is a notification link, BUT apply link has not started or is missing
      return hasNotification && hasLink && (!hasApply || isApplyNotStarted);
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch upcoming jobs:', err);
    return [];
  }
}

async function getAdmitCards(limit: number = 8) {
  const now = new Date();
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { expiryDate: { gte: now } },
          { expiryDate: null }
        ],
        AND: [
          {
            OR: [
              { tags: { some: { tag: { name: { in: ['Admit Card'] } } } } },
              { title: { contains: 'Admit Card', mode: 'insensitive' } },
              { title: { contains: 'प्रवेश पत्र' } },
              { title: { contains: 'Exam City', mode: 'insensitive' } }
            ]
          }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true,
        content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasNotificationOrOfficial = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('official') || content.includes('आधिकारिक');
      const hasAdmitCardOrCity = content.includes('admit card') || content.includes('प्रवेश पत्र') || content.includes('exam city') || content.includes('परीक्षा शहर');
      const hasLink = content.includes('<a ');

      return hasNotificationOrOfficial && hasAdmitCardOrCity && hasLink;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch admit cards:', err);
    return [];
  }
}

async function getResultsAndSyllabus(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
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
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true,
        content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasLink = content.includes('<a ');
      // We assume if it has the keyword in title/tag, it's relevant, but we enforce it must have a link to download/check
      return hasLink;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch results and syllabus:', err);
    return [];
  }
}

async function getUniversityUpdates(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['University', 'IGNOU', 'College', 'Admission', 'Counselling', 'State University'] } } } } },
          { title: { contains: 'University', mode: 'insensitive' } },
          { title: { contains: 'विश्वविद्यालय' } },
          { title: { contains: 'College', mode: 'insensitive' } },
          { title: { contains: 'Admission', mode: 'insensitive' } },
          { title: { contains: 'IGNOU', mode: 'insensitive' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true, content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasOfficial = content.includes('official') || content.includes('आधिकारिक');
      const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
      const hasLink = content.includes('<a ');

      return hasOfficial && hasNotification && hasLink;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch university updates:', err);
    return [];
  }
}

async function getSchemes(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['Scheme', 'Yojana', 'Government Scheme', 'PM Kisan', 'Sarkari Yojana'] } } } } },
          { title: { contains: 'Scheme', mode: 'insensitive' } },
          { title: { contains: 'Yojana', mode: 'insensitive' } },
          { title: { contains: 'योजना' } },
          { title: { contains: 'PM Kisan', mode: 'insensitive' } },
          { title: { contains: 'E-Shram', mode: 'insensitive' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 2,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true, content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasOfficial = content.includes('official') || content.includes('आधिकारिक') || content.includes('website');
      const hasLink = content.includes('<a ');

      return hasOfficial && hasLink;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch schemes:', err);
    return [];
  }
}

async function getScholarships(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['Scholarship', 'National Scholarship', 'Scholarships'] } } } } },
          { title: { contains: 'Scholarship', mode: 'insensitive' } },
          { title: { contains: 'छात्रवृत्ति' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 3,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true, content: true
      }
    });

    const filteredPosts = posts.filter(post => {
      if (!post.content) return false;
      const content = post.content.toLowerCase();
      
      const hasOfficial = content.includes('official') || content.includes('आधिकारिक') || content.includes('website');
      const hasNotification = content.includes('notification') || content.includes('विज्ञप्ति') || content.includes('अधिसूचना');
      const hasLink = content.includes('<a ');

      return hasOfficial && hasNotification && hasLink;
    });

    return filteredPosts.slice(0, limit).map(({ content, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to fetch scholarships:', err);
    return [];
  }
}

async function getTechNews(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['Technology', 'Smartphone', 'Tech', 'Mobile', 'Gadget'] } } } } },
          { title: { contains: 'Technology', mode: 'insensitive' } },
          { title: { contains: 'Tech', mode: 'insensitive' } },
          { title: { contains: 'Mobile', mode: 'insensitive' } },
          { title: { contains: 'Smartphone', mode: 'insensitive' } },
          { title: { contains: 'लॉन्च' } },
          { title: { contains: '5G' } }
        ],
        NOT: [
          { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Scheme', 'Scholarship', 'Admit Card', 'Result', 'University', 'Finance', 'Banking', 'Earning'] } } } } },
          { title: { contains: 'Job', mode: 'insensitive' } },
          { title: { contains: 'Vacancy', mode: 'insensitive' } },
          { title: { contains: 'भर्ती' } },
          { title: { contains: 'Admit Card', mode: 'insensitive' } },
          { title: { contains: 'Scheme', mode: 'insensitive' } },
          { title: { contains: 'योजना' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true
      }
    });
    return posts;
  } catch (err) {
    console.error('Failed to fetch tech news:', err);
    return [];
  }
}

async function getFinanceNews(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['Finance', 'Banking', 'Bank', 'LIC', 'EPFO', 'Savings'] } } } } },
          { title: { contains: 'Finance', mode: 'insensitive' } },
          { title: { contains: 'Bank', mode: 'insensitive' } },
          { title: { contains: 'LIC', mode: 'insensitive' } },
          { title: { contains: 'EPFO', mode: 'insensitive' } },
          { title: { contains: 'Budget', mode: 'insensitive' } },
          { title: { contains: 'बजट' } },
          { title: { contains: 'सोना' } },
          { title: { contains: 'Gold', mode: 'insensitive' } },
          { title: { contains: 'RBI' } }
        ],
        NOT: [
          { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Scheme', 'Scholarship', 'Admit Card', 'Result', 'University', 'Technology', 'Tech', 'Mobile', 'Smartphone', 'Earning', 'Course'] } } } } },
          { title: { contains: 'Job', mode: 'insensitive' } },
          { title: { contains: 'भर्ती' } },
          { title: { contains: 'Scheme', mode: 'insensitive' } },
          { title: { contains: 'योजना' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true
      }
    });
    return posts;
  } catch (err) {
    console.error('Failed to fetch finance news:', err);
    return [];
  }
}

async function getEarningCourses(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['Earning', 'Online Earning', 'Course', 'Free Course'] } } } } },
          { title: { contains: 'Earning', mode: 'insensitive' } },
          { title: { contains: 'Course', mode: 'insensitive' } },
          { title: { contains: 'कमाई' } },
          { title: { contains: 'Skill', mode: 'insensitive' } }
        ],
        NOT: [
          { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Scheme', 'Scholarship', 'Admit Card', 'Result', 'University', 'Technology', 'Finance', 'Bank'] } } } } },
          { title: { contains: 'Job', mode: 'insensitive' } },
          { title: { contains: 'भर्ती' } },
          { title: { contains: 'Scheme', mode: 'insensitive' } },
          { title: { contains: 'योजना' } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true
      }
    });
    return posts;
  } catch (err) {
    console.error('Failed to fetch earning courses:', err);
    return [];
  }
}

async function getSchoolNews(limit: number = 8) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        OR: [
          { tags: { some: { tag: { name: { in: ['School', 'Board Exam', 'CBSE', 'State Board'] } } } } },
          { title: { contains: 'School', mode: 'insensitive' } },
          { title: { contains: 'स्कूल' } },
          { title: { contains: 'Board', mode: 'insensitive' } },
          { title: { contains: 'बोर्ड' } },
          { title: { contains: 'Class 10', mode: 'insensitive' } },
          { title: { contains: 'Class 12', mode: 'insensitive' } }
        ],
        NOT: [
          { tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Scheme', 'Scholarship', 'University', 'Finance', 'Earning'] } } } } }
        ]
      },
      orderBy: { publishedAt: 'desc' },
      take: limit * 2,
      select: { id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true, content: true }
    });
    
    const filtered = posts.filter(post => {
      if (!post.content) return false;
      const c = post.content.toLowerCase();
      const hasOfficial = c.includes('official') || c.includes('आधिकारिक');
      const hasLink = c.includes('<a ');
      return hasOfficial && hasLink;
    });
    return filtered.slice(0, limit).map(({content, ...rest}) => rest);
  } catch(e) { return []; }
}

async function getOtherNews(limit: number = 8) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        publishedAt: { gte: sevenDaysAgo },
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
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, slug: true, publishedAt: true, createdAt: true, expiryDate: true }
    });
    return posts;
  } catch(e) { return []; }
}

export default async function HomePage() {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all categories in parallel on the server
  const [
    allPosts, guidelinesPosts, rulesRightsPosts, whatsappLinks, siteSettings,
    latestJobs, admitCards, examResults,
    universityUpdates, govtSchemes, scholarships,
    techMobile, financeBanking, earningCourses, schoolNews, otherNews,
    closingSoonJobs, liveUpdates,
    activeJobsCount, recentResultsCount, recentAdmitCardsCount, activeSchemesCount,
    upcomingJobs, upcomingJobsCount, otherNewsCount
  ] = await Promise.all([
    prisma.blogPost.findMany({ where: { status: 'Published' }, orderBy: { publishedAt: 'desc' }, take: 10, select: { id: true, title: true, slug: true, publishedAt: true, featuredImage: true } }),
    getPostsByTag('Guidelines'),
    getPostsByTag('Rules & Rights'),
    prisma.socialLink.findMany({ where: { platform: 'whatsapp', isActive: true } }),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    getActiveJobs(8),
    getAdmitCards(8),
    getResultsAndSyllabus(8),
    getUniversityUpdates(8),
    getSchemes(8),
    getScholarships(8),
    getTechNews(8),
    getFinanceNews(8),
    getEarningCourses(8),
    getSchoolNews(8),
    getOtherNews(8),
    prisma.blogPost.findMany({
      where: {
        status: 'Published',
        expiryDate: { gte: now }
      },
      orderBy: { expiryDate: 'asc' },
      take: 4,
      select: { id: true, title: true, slug: true, expiryDate: true }
    }),
    prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      select: { id: true, title: true, slug: true, publishedAt: true, createdAt: true }
    }),
    getActiveJobs(100).then(posts => posts.length),
    getResultsAndSyllabus(100).then(posts => posts.filter(post => post.publishedAt && new Date(post.publishedAt) >= sevenDaysAgo).length),
    getAdmitCards(100).then(posts => posts.filter(post => post.publishedAt && new Date(post.publishedAt) >= sevenDaysAgo).length),
    getSchemes(100).then(posts => posts.length),
    getUpcomingJobs(8),
    getUpcomingJobs(100).then(posts => posts.length),
    getOtherNews(100).then(posts => posts.length)
  ]);

  let apiKeys: any = {};
  try {
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      apiKeys = JSON.parse(siteSettings.aiApiKey);
    }
  } catch (e) {}
  
  const isChatbotActive = apiKeys.chatbotActive !== false;

  function getRelativeTime(date: Date) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const CategorySection = ({ title, posts, tag }: { title: string, posts: any[], tag: string }) => {
    if (posts.length === 0) return null;
    return (
      <div className="w-full animate-slide-up">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">{title}</h2>
          <Link href={`/blog?tag=${encodeURIComponent(tag)}`} className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors shrink-0 whitespace-nowrap ml-4">
            View All →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className="block group">
              <div className="premium-card flex flex-row items-center overflow-hidden p-3 gap-4 hover:bg-white/5 transition-colors border border-white/5 rounded-xl">
                {post.featuredImage && (
                  <div className="w-20 h-20 sm:w-28 sm:h-20 relative bg-gray-900 overflow-hidden rounded-lg flex-shrink-0">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 80px, 112px" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {tag}
                    </span>
                    <p className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors truncate">
                    {post.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center px-3 sm:px-4 pt-4 pb-10">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center animate-slide-up mt-2 sm:mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-blue-400 mb-4 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          AI-Powered Content Generation is Live
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight text-white">
          Next-Generation <br className="hidden sm:block" />
          <span className="premium-gradient-text">Blogging Platform</span>
        </h1>
        
        <p className="text-xs sm:text-sm text-gray-400 mb-5 max-w-xl mx-auto font-light leading-relaxed px-4">
          Discover expertly curated and AI-assisted insights in Technology, Education & Career, and Finance & Earning. High-quality knowledge for the modern world.
        </p>
        
        <div className="flex gap-4 justify-center items-center">
          <Link href="/blog" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            Read Our Articles
          </Link>
        </div>

        {/* Quick Category Links */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href="/blog?tag=Technology" className="px-4 py-2 glass-panel hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-full text-xs font-semibold transition-all text-gray-300 hover:text-white">
            💻 Technology
          </Link>
          <Link href="/blog?tag=Education%20%26%20Career" className="px-4 py-2 glass-panel hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-full text-xs font-semibold transition-all text-gray-300 hover:text-white">
            🎓 Education & Career
          </Link>
          <Link href="/blog?tag=Finance%20%26%20Earning" className="px-4 py-2 glass-panel hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-full text-xs font-semibold transition-all text-gray-300 hover:text-white">
            💰 Finance & Earning
          </Link>
          <Link href="/blog?tag=News" className="px-4 py-2 glass-panel hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-full text-xs font-semibold transition-all text-gray-300 hover:text-white">
            📰 News
          </Link>
          <Link href="/blog" className="px-4 py-2 glass-panel hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-full text-xs font-semibold transition-all text-gray-300 hover:text-white">
            ✨ View All
          </Link>
        </div>
      </div>

      {/* 🚀 Dashboard Squares (डैशबोर्ड बॉक्स) */}
      <div className="max-w-6xl w-full mx-auto mt-8 px-4 animate-slide-up">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Square 1: Active Jobs - links to Education & Career with filter panel open */}
          <Link href="/blog?tag=Education%20%26%20Career&jobType=active_upcoming" className="block group">
            <div className="glass-panel border border-emerald-500/10 hover:border-emerald-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(16,185,129,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">🔥</div>
              <div className="text-lg sm:text-2xl font-black text-emerald-400">{activeJobsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">सक्रिय भर्ती</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Active Jobs</div>
            </div>
          </Link>

          {/* Square 2: Upcoming Jobs - links with filter panel open */}
          <Link href="/blog?tag=Education%20%26%20Career&jobType=active_upcoming" className="block group">
            <div className="glass-panel border border-cyan-500/10 hover:border-cyan-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(34,211,238,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">🚀</div>
              <div className="text-lg sm:text-2xl font-black text-cyan-400">{upcomingJobsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">आगामी भर्ती</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Upcoming Jobs</div>
            </div>
          </Link>
          
          {/* Square 3: Recent Results */}
          <Link href="/blog?tag=Education%20%26%20Career" className="block group">
            <div className="glass-panel border border-amber-500/10 hover:border-amber-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(245,158,11,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">🏆</div>
              <div className="text-lg sm:text-2xl font-black text-amber-400">{recentResultsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">परीक्षा परिणाम (7d)</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Exam Results</div>
            </div>
          </Link>

          {/* Square 4: Admit Cards */}
          <Link href="/blog?tag=Education%20%26%20Career" className="block group">
            <div className="glass-panel border border-blue-500/10 hover:border-blue-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(59,130,246,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">🎟️</div>
              <div className="text-lg sm:text-2xl font-black text-blue-400">{recentAdmitCardsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">प्रवेश पत्र (7d)</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Admit Cards</div>
            </div>
          </Link>

          {/* Square 5: Govt Schemes */}
          <Link href="/blog?tag=Finance%20%26%20Earning" className="block group">
            <div className="glass-panel border border-purple-500/10 hover:border-purple-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(168,85,247,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">📜</div>
              <div className="text-lg sm:text-2xl font-black text-purple-400">{activeSchemesCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">सरकारी योजनाएं</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Govt Schemes</div>
            </div>
          </Link>

          {/* Square 6: Other Updates */}
          <Link href="/blog?tag=News" className="block group">
            <div className="glass-panel border border-pink-500/10 hover:border-pink-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center bg-white/5 transition-all hover:-translate-y-1 shadow-[0_4px_30px_rgba(236,72,153,0.05)]">
              <div className="text-xl sm:text-2xl mb-1">📌</div>
              <div className="text-lg sm:text-2xl font-black text-pink-400">{otherNewsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-300 font-semibold mt-1">अन्य सूचनाएं (7d)</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Other Updates</div>
            </div>
          </Link>
        </div>
      </div>

        {/* Today LIVE Updates Ticker */}
        {liveUpdates.length > 0 && (
          <div className="max-w-4xl w-full mx-auto mt-12 px-4 animate-slide-up">
            <div className="glass-panel border border-red-500/20 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(239,68,68,0.05)] bg-white/5 backdrop-blur-md">
              <div className="bg-red-600/10 border-b border-red-500/10 px-5 py-3 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h3 className="text-sm font-bold text-red-400 tracking-wide uppercase flex items-center gap-1.5">
                  🔴 Today LIVE Updates (आज के मुख्य समाचार)
                </h3>
              </div>
              <div className="p-4 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                {liveUpdates.slice(0, 3).map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <Link href={`/blog/${post.slug}`} className="text-xs sm:text-sm font-medium text-gray-200 hover:text-red-400 transition-colors line-clamp-1">
                      {post.title}
                    </Link>
                    <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                      ⚡ {getRelativeTime(post.publishedAt || post.createdAt)}
                    </span>
                  </div>
                ))}
                {liveUpdates.length > 3 && (
                  <div className="text-center pt-2 mt-1 border-t border-white/5">
                    <Link href="/blog" className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                      Read More (और पढ़ें) →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Closing Soon / Deadlines Alert Box */}
        {closingSoonJobs.length > 0 && (
          <div className="max-w-6xl w-full mx-auto mt-12 px-4 animate-slide-up">
            <div className="glass-panel border border-blue-500/10 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(59,130,246,0.05)] bg-white/5">
              <div className="bg-blue-600/20 border-b border-blue-500/20 px-5 py-3.5 flex items-center gap-2">
                <span className="text-blue-400 text-lg">⏳</span>
                <h3 className="text-sm font-bold text-blue-300 tracking-wide uppercase">
                  Closing Soon (अंतिम तिथि नज़दीक है!)
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {closingSoonJobs.map((post) => {
                  const diff = new Date(post.expiryDate!).getTime() - new Date().getTime();
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  let daysText = `${days} DAYS LEFT`;
                  let colorClass = "bg-orange-500/20 text-orange-400 border border-orange-500/20";
                  if (days <= 2) {
                    daysText = days <= 0 ? "TODAY LAST DAY" : "1 DAY LEFT";
                    colorClass = "bg-red-500/20 text-red-400 border border-red-500/20 animate-pulse";
                  } else if (days > 5) {
                    colorClass = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20";
                  }

                  return (
                    <Link href={`/blog/${post.slug}`} key={post.id} className="block group">
                      <div className="glass-panel hover:bg-white/5 transition-all p-4 rounded-xl border border-white/5 flex flex-col h-full justify-between gap-3">
                        <div className={`text-center py-1.5 px-3 rounded-lg text-xs font-bold ${colorClass}`}>
                          {daysText}
                        </div>
                        <h4 className="text-xs font-semibold text-gray-300 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Jobs by Education / Filter Button Grid */}
        <div className="max-w-6xl w-full mx-auto mt-12 px-4 animate-slide-up">
          <div className="glass-panel border border-blue-500/10 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)] bg-white/5 backdrop-blur-md">
            <div className="bg-blue-600/30 border-b border-blue-500/20 px-6 py-4 text-center">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                🎓 Jobs by Education (योग्यता अनुसार सरकारी नौकरियां)
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {[
                { label: "8TH Pass", query: "8th" },
                { label: "10TH Pass", query: "10th" },
                { label: "12TH Pass", query: "12th" },
                { label: "ITI Pass", query: "iti" },
                { label: "Diploma Pass", query: "diploma" },
                { label: "B.Tech/B.E", query: "btech" },
                { label: "B.Com", query: "bcom" },
                { label: "Graduate", query: "graduate" },
                { label: "Post Graduate", query: "post graduate" },
                { label: "Any Graduate", query: "graduate" }
              ].map((item, idx) => (
                <Link
                  href={`/blog?search=${encodeURIComponent(item.query)}&jobType=active_upcoming`}
                  key={idx}
                  className="px-4 py-3 glass-panel text-center hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-xl text-xs font-bold transition-all text-gray-300 hover:text-white hover:-translate-y-0.5 shadow-sm"
                >
                  🔵 {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

      {/* Sarkari Job Central Grid (सरकारी जॉब ग्रिड) */}
      <div className="max-w-6xl w-full mx-auto mt-16 px-4">
        {/* Social Join Option above Grid */}
        <SocialJoinStrip title="सरकारी भर्ती ग्रुप्स से जुड़ें (Join Job Groups):" />

        <div className="text-center mb-10 mt-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            🎯 Job & Info Portal Grid (सरकारी जॉब एवं जानकारी ग्रिड)
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            लेटेस्ट सरकारी भर्ती, एडमिट कार्ड, परीक्षा परिणाम, विश्वविद्यालय अपडेट्स, और सरकारी योजनाओं की जानकारी एक नज़र में।
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {/* Box 1: Latest Jobs */}
          <div className="glass-panel border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-emerald-600/20 border-b border-emerald-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-emerald-400 flex items-center gap-1 sm:gap-2">
                🔥 नवीनतम नौकरियां (Jobs)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {latestJobs.length > 0 ? (
                latestJobs.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      {post.expiryDate && (
                        <p className="text-[8px] sm:text-[9px] text-red-400/80 mt-0.5 sm:mt-1 font-medium">
                          ⏰ Last Date: {new Date(post.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No active job listings.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Vacancy" className="text-[10px] sm:text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                View All Jobs →
              </Link>
            </div>
          </div>

          {/* Box 2: Upcoming Jobs */}
          <div className="glass-panel border border-sky-500/10 hover:border-sky-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-sky-600/20 border-b border-sky-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-sky-400 flex items-center gap-1 sm:gap-2">
                🚀 आगामी भर्ती (Upcoming)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-sky-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {upcomingJobs.length > 0 ? (
                upcomingJobs.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No upcoming job listings.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Upcoming" className="text-[10px] sm:text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
                View All Upcoming →
              </Link>
            </div>
          </div>

          {/* Box 3: Admit Cards */}
          <div className="glass-panel border border-blue-500/10 hover:border-blue-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-blue-600/20 border-b border-blue-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-blue-400 flex items-center gap-1 sm:gap-2">
                🎟️ एडमिट कार्ड (Admit Cards)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {admitCards.length > 0 ? (
                admitCards.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent admit cards.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Admit%20Card" className="text-[10px] sm:text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                View Admit Cards →
              </Link>
            </div>
          </div>

          {/* Box 4: Results & Syllabus */}
          <div className="glass-panel border border-purple-500/10 hover:border-purple-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-purple-600/20 border-b border-purple-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-purple-400 flex items-center gap-1 sm:gap-2">
                🏆 परिणाम & सिलेबस (Results)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {examResults.length > 0 ? (
                examResults.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent exam results.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Results" className="text-[10px] sm:text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                View All Results →
              </Link>
            </div>
          </div>

          {/* Box 5: University Updates */}
          <div className="glass-panel border border-cyan-500/10 hover:border-cyan-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-cyan-600/20 border-b border-cyan-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-cyan-400 flex items-center gap-1 sm:gap-2">
                🎓 विश्वविद्यालय (University)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {universityUpdates.length > 0 ? (
                universityUpdates.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent university updates.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=University" className="text-[10px] sm:text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                View University →
              </Link>
            </div>
          </div>

          {/* Box 6: Government Schemes */}
          <div className="glass-panel border border-orange-500/10 hover:border-orange-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-orange-600/20 border-b border-orange-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-orange-400 flex items-center gap-1 sm:gap-2">
                🎁 सरकारी योजनाएं (Schemes)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {govtSchemes.length > 0 ? (
                govtSchemes.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No active government schemes.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Scheme" className="text-[10px] sm:text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                View All Schemes →
              </Link>
            </div>
          </div>

          {/* Box 7: Scholarships */}
          <div className="glass-panel border border-yellow-500/10 hover:border-yellow-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-yellow-600/20 border-b border-yellow-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-yellow-400 flex items-center gap-1 sm:gap-2">
                🎓 छात्रवृत्ति अलर्ट (Scholarship)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {scholarships.length > 0 ? (
                scholarships.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-yellow-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No active scholarships.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Scholarship" className="text-[10px] sm:text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors">
                View Scholarship →
              </Link>
            </div>
          </div>

          {/* Box 8: Tech & Mobile */}
          <div className="glass-panel border border-red-500/10 hover:border-red-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-red-600/20 border-b border-red-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-red-400 flex items-center gap-1 sm:gap-2">
                📱 टेक समाचार (Tech News)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {techMobile.length > 0 ? (
                techMobile.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent tech articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Technology" className="text-[10px] sm:text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">
                View Tech News →
              </Link>
            </div>
          </div>

          {/* Box 9: Finance & Banking */}
          <div className="glass-panel border border-indigo-500/10 hover:border-indigo-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-indigo-600/20 border-b border-indigo-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-indigo-400 flex items-center gap-1 sm:gap-2">
                📊 फाइनेंस & बैंक (Finance)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {financeBanking.length > 0 ? (
                financeBanking.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent finance articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Finance%20%26%20Earning" className="text-[10px] sm:text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                View Finance →
              </Link>
            </div>
          </div>

          {/* Box 10: Earning & Free Courses */}
          <div className="glass-panel border border-pink-500/10 hover:border-pink-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-pink-600/20 border-b border-pink-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-pink-400 flex items-center gap-1 sm:gap-2">
                💸 कमाई & कोर्सेज (Earning)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {earningCourses.length > 0 ? (
                earningCourses.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-pink-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent learning/earning articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Earning" className="text-[10px] sm:text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors">
                View Earning →
              </Link>
            </div>
          </div>

          {/* Box 11: School News */}
          <div className="glass-panel border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-emerald-600/20 border-b border-emerald-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-emerald-400 flex items-center gap-1 sm:gap-2">
                🏫 स्कूल अपडेट्स (School News)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {schoolNews.length > 0 ? (
                schoolNews.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No recent school news.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=School" className="text-[10px] sm:text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                View School News →
              </Link>
            </div>
          </div>

          {/* Box 12: Other Updates */}
          <div className="glass-panel border border-gray-500/10 hover:border-gray-500/30 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[380px] sm:h-[480px]">
            <div className="bg-gray-600/20 border-b border-gray-500/20 px-3 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-base font-bold text-gray-300 flex items-center gap-1 sm:gap-2">
                📌 अन्य सूचनाएं (Other Updates)
              </h3>
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-2.5 sm:p-4 flex-grow overflow-y-auto flex flex-col gap-2.5 sm:gap-3.5 scrollbar-thin">
              {otherNews.length > 0 ? (
                otherNews.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2 sm:pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`} className="text-[10px] sm:text-xs font-semibold text-gray-200 group-hover:text-gray-100 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[7px] sm:text-[8px] font-bold text-black bg-yellow-400 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 sm:mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[10px] sm:text-xs text-center py-10">No other recent updates.</p>
              )}
            </div>
            <div className="bg-white/2 py-2 sm:py-2.5 px-3 sm:px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=News" className="text-[10px] sm:text-xs font-semibold text-gray-300 hover:text-white transition-colors">
                View All News →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Latest & Guidelines/Rules Sections */}
      <div className="max-w-6xl w-full mx-auto mt-20 pb-10">
        {(guidelinesPosts.length > 0 || rulesRightsPosts.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <CategorySection title="📖 महत्वपूर्ण गाइडलाइंस (Guidelines)" posts={guidelinesPosts} tag="Guidelines" />
            <CategorySection title="⚖️ नियम और अधिकार (Rules & Rights)" posts={rulesRightsPosts} tag="Rules & Rights" />
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-20 p-10 glass-panel rounded-2xl animate-fade-in">
            <p>More guidelines & rules articles coming soon!</p>
          </div>
        )}
      </div>

      {/* Marquee Ticker Section (ptti k rup me) */}
      {allPosts.length > 0 && (
        <div className="w-full mt-10 mb-20 overflow-hidden bg-blue-900/20 py-4 border-y border-blue-500/20 backdrop-blur-md relative flex items-center">
          <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent z-10 pointer-events-none"></div>
          <div className="whitespace-nowrap flex gap-8 items-center" style={{ animation: 'marquee 30s linear infinite' }}>
            {/* Double the array for infinite scroll effect */}
            {[...allPosts, ...allPosts].map((post, i) => (
              <Link href={`/blog/${post.slug}`} key={`${post.id}-${i}`} className="inline-flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-full transition-colors shrink-0">
                <span className="text-blue-400">⚡</span>
                <span className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">{post.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
      
      {/* Global AI Chatbot */}
      {isChatbotActive && <BlogChatbot whatsappLinks={whatsappLinks} />}
    </div>
  );
}
