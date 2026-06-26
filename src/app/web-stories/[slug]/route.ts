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

    const publisherLogo = 'https://ui-avatars.com/api/?name=AG&background=0D8ABC&color=fff'; // Placeholder logo
    const posterImage = post.featuredImage || 'https://source.unsplash.com/1200x1920/?business,technology';

    // A basic 3-page Web Story template
    const ampStoryHtml = `<!doctype html>
<html amp lang="en">
  <head>
    <meta charset="utf-8">
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
    <title>${post.seoTitle || post.title}</title>
    <link rel="canonical" href="https://antigravity.com/blog/${post.slug}">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
    <style amp-custom>
      amp-story { font-family: 'Inter', sans-serif; }
      amp-story-page { background-color: #000; }
      h1 { font-weight: bold; font-size: 2.5em; line-height: 1.2; color: #fff; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 10px; }
      p { font-size: 1.5em; color: #fff; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 10px; line-height: 1.4; }
      .bottom-link { position: absolute; bottom: 50px; left: 0; right: 0; text-align: center; }
      .bottom-link a { background: #3b82f6; color: white; padding: 15px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 1.2em; display: inline-block; }
    </style>
  </head>
  <body>
    <amp-story standalone
        title="${post.title}"
        publisher="Anti Gravity"
        publisher-logo-src="${publisherLogo}"
        poster-portrait-src="${posterImage}">
      
      <!-- Page 1: Cover -->
      <amp-story-page id="cover">
        <amp-story-grid-layer template="fill">
          <amp-img src="${posterImage}" width="720" height="1280" layout="responsive" alt="cover"></amp-img>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical" class="center">
          <h1>${post.title}</h1>
        </amp-story-grid-layer>
      </amp-story-page>

      <!-- Page 2: Summary -->
      <amp-story-page id="summary">
        <amp-story-grid-layer template="fill">
          <div style="background: linear-gradient(135deg, #1e3a8a, #4c1d95); width: 100%; height: 100%;"></div>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical" class="center">
          <p>${post.excerpt || 'Read the full story to discover more insights and details.'}</p>
        </amp-story-grid-layer>
      </amp-story-page>

      <!-- Page 3: Call to Action -->
      <amp-story-page id="cta">
        <amp-story-grid-layer template="fill">
          <amp-img src="${posterImage}" width="720" height="1280" layout="responsive" alt="bg"></amp-img>
        </amp-story-grid-layer>
        <amp-story-grid-layer template="vertical">
          <div class="bottom-link">
            <a href="https://antigravity.com/blog/${post.slug}">Read Full Article</a>
          </div>
        </amp-story-grid-layer>
      </amp-story-page>
    </amp-story>
  </body>
</html>`;

    const response = new NextResponse(ampStoryHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

    return response;
  } catch (error) {
    console.error('Error generating web story:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
