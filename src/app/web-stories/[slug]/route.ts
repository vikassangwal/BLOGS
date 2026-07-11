import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const post = await prisma.blogPost.findUnique({
      where: { slug: params.slug },
      include: { author: true }
    });

    if (!post) {
      return new NextResponse('Story not found', { status: 404 });
    }

    const domain = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowora.in';
    const publisherLogo = `${domain}/logo.png`; // Ensure a logo.png exists in public folder
    const posterImage = post.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=720&h=1280&fit=crop';
    
    // Extract plain text paragraphs from HTML content
    const rawContent = post.content || '';
    const textOnly = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Split into sentences (supporting English punctuation and Hindi Purna Viram "।")
    const sentences = textOnly.split(/[.!?।\n]+/).map(s => s.trim()).filter(s => s.length > 10);
    
    // Create chunks of text for slides (approx 2 sentences per slide)
    const slidesData = [];
    let currentSlideText = '';
    
    for (let i = 0; i < sentences.length; i++) {
      currentSlideText += sentences[i] + ' ';
      // If we have 2 sentences or text is getting long, push to slide
      if ((i + 1) % 2 === 0 || currentSlideText.length > 150) {
        if (currentSlideText.trim().length > 20) {
          slidesData.push(currentSlideText.trim());
        }
        currentSlideText = '';
      }
      if (slidesData.length >= 4) break; // Max 4 text slides to keep it snappy
    }
    
    // Fallback if no sentences extracted
    if (slidesData.length === 0) {
      slidesData.push(post.excerpt || 'Discover the latest updates and insights on this topic.');
      slidesData.push('Read the complete detailed analysis on our platform.');
    }

    // Build the dynamic slides HTML
    let dynamicSlidesHtml = '';
    slidesData.forEach((text, index) => {
      dynamicSlidesHtml += `
      <amp-story-page id="slide-${index + 1}">
        <amp-story-grid-layer template="fill">
          <amp-img src="${posterImage}" width="720" height="1280" layout="responsive" alt="Background"></amp-img>
          <div class="overlay"></div>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical" class="center-content">
          <div class="glass-box" animate-in="fade-in" animate-in-delay="0.2s">
            <p>${text}</p>
          </div>
        </amp-story-grid-layer>
      </amp-story-page>
      `;
    });

    const ampStoryHtml = `<!doctype html>
<html amp lang="en">
  <head>
    <meta charset="utf-8">
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
    <title>${post.seoTitle || post.title} - Web Story</title>
    <link rel="canonical" href="${domain}/blog/${post.slug}">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
    <style amp-custom>
      amp-story { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      .overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)); }
      .center-content { align-content: center; padding: 24px; }
      .title-box { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(10px); padding: 32px 24px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.2); }
      h1 { font-weight: 800; font-size: 2.2em; line-height: 1.3; color: #ffffff; margin: 0; }
      .glass-box { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      p { font-size: 1.4em; color: #ffffff; line-height: 1.6; margin: 0; font-weight: 500; }
      .badge { display: inline-block; background: #3b82f6; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.9em; font-weight: bold; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
      
      /* CTA Page Styles */
      .cta-container { align-content: end; padding-bottom: 80px; text-align: center; }
      .cta-card { background: white; padding: 32px 24px; border-radius: 24px 24px 0 0; margin: 0 -24px -80px -24px; box-shadow: 0 -10px 40px rgba(0,0,0,0.2); }
      .cta-title { color: #111827; font-size: 1.6em; font-weight: 800; margin-bottom: 12px; }
      .cta-desc { color: #4b5563; font-size: 1.1em; margin-bottom: 24px; }
      .cta-btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 16px 32px; border-radius: 30px; font-weight: bold; font-size: 1.2em; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
    </style>
  </head>
  <body>
    <amp-story standalone
        title="${post.title}"
        publisher="${post.author?.name || 'Knowora'}"
        publisher-logo-src="${publisherLogo}"
        poster-portrait-src="${posterImage}">
      
      <!-- Page 1: Cover -->
      <amp-story-page id="cover">
        <amp-story-grid-layer template="fill">
          <amp-img src="${posterImage}" width="720" height="1280" layout="responsive" alt="Cover Image"></amp-img>
          <div class="overlay"></div>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical" class="center-content">
          <div class="title-box" animate-in="fly-in-bottom">
            <span class="badge">Latest News</span>
            <h1>${post.title}</h1>
          </div>
        </amp-story-grid-layer>
      </amp-story-page>

      <!-- Dynamic Content Pages -->
      ${dynamicSlidesHtml}

      <!-- Final Page: Swipe Up / CTA -->
      <amp-story-page id="cta-page">
        <amp-story-grid-layer template="fill">
          <amp-img src="${posterImage}" width="720" height="1280" layout="responsive" alt="Background"></amp-img>
          <div class="overlay" style="background: rgba(0,0,0,0.6);"></div>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical" class="cta-container">
          <div class="cta-card" animate-in="slide-in-bottom">
            <div class="cta-title">Want the full story?</div>
            <div class="cta-desc">Read the complete article, see all the details, and join the discussion on our website.</div>
            <a href="${domain}/blog/${post.slug}" class="cta-btn">Read Full Article</a>
          </div>
        </amp-story-grid-layer>
        
        <!-- Standard Google Web Stories Outlink -->
        <amp-story-page-outlink layout="nodisplay">
          <a href="${domain}/blog/${post.slug}">Read Full Article</a>
        </amp-story-page-outlink>
      </amp-story-page>

    </amp-story>
  </body>
</html>`;

    return new NextResponse(ampStoryHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' // Edge cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error generating web story:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
