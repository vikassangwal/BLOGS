import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'week'; // mint, hour, week, month, 6mont, year, 2year

    const now = new Date();
    let startDate = new Date();
    let groupBy: 'minute' | 'hour' | 'day' | 'month' = 'day';
    let dataPoints = 7;

    switch (filter) {
      case 'mint':
        startDate.setHours(now.getHours() - 1);
        groupBy = 'minute';
        dataPoints = 60;
        break;
      case 'hour':
        startDate.setHours(now.getHours() - 24);
        groupBy = 'hour';
        dataPoints = 24;
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        dataPoints = 7;
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        groupBy = 'day';
        dataPoints = 30;
        break;
      case '6mont':
        startDate.setMonth(now.getMonth() - 6);
        groupBy = 'month';
        dataPoints = 6;
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = 'month';
        dataPoints = 12;
        break;
      case '2year':
        startDate.setFullYear(now.getFullYear() - 2);
        groupBy = 'month';
        dataPoints = 24;
        break;
      case 'lifetime':
        startDate = new Date(0); // Beginning of time
        groupBy = 'month';
        dataPoints = 60; // Up to 5 years back
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        dataPoints = 7;
    }

    // 1. Fetch real data from DB
    const [pageviews, leads, posts] = await Promise.all([
      prisma.pageview.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      }),
      prisma.blogPost.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      })
    ]);

    // 2. Aggregate data into buckets
    const chartDataMap = new Map<string, { views: number, leads: number, posts: number, name: string }>();

    const getBucketKey = (date: Date) => {
      const d = new Date(date);
      if (groupBy === 'minute') return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (groupBy === 'hour') return `${d.getHours()}:00`;
      if (groupBy === 'day') return `${d.getDate()}/${d.getMonth() + 1}`;
      if (groupBy === 'month') return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      return d.toISOString();
    };

    // Initialize buckets with 0 to ensure continuous timeline
    for (let i = dataPoints - 1; i >= 0; i--) {
      const d = new Date(now);
      if (groupBy === 'minute') d.setMinutes(d.getMinutes() - i);
      if (groupBy === 'hour') d.setHours(d.getHours() - i);
      if (groupBy === 'day') d.setDate(d.getDate() - i);
      if (groupBy === 'month') d.setMonth(d.getMonth() - i);
      
      const key = getBucketKey(d);
      chartDataMap.set(key, { name: key, views: 0, leads: 0, posts: 0 });
    }

    // Populate actual counts
    pageviews.forEach(pv => {
      const key = getBucketKey(pv.createdAt);
      if (chartDataMap.has(key)) chartDataMap.get(key)!.views++;
    });
    leads.forEach(ld => {
      const key = getBucketKey(ld.createdAt);
      if (chartDataMap.has(key)) chartDataMap.get(key)!.leads++;
    });
    posts.forEach(pt => {
      const key = getBucketKey(pt.createdAt);
      if (chartDataMap.has(key)) chartDataMap.get(key)!.posts++;
    });

    const chartData = Array.from(chartDataMap.values());

    return NextResponse.json({
      success: true,
      filter,
      chartData,
      totals: {
        views: pageviews.length,
        leads: leads.length,
        posts: posts.length
      }
    });

  } catch (error) {
    console.error('Admin Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
