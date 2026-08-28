import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function cleanString(str: string): string {
  if (!str) return str;
  return str
    .replace(/बंपर\s*भर्ती/gi, 'भर्ती')
    .replace(/बंपर\s*मौका/gi, 'अवसर')
    .replace(/बंपर\s*दाखिले\s*का\s*मौका/gi, 'दाखिले का अवसर')
    .replace(/बंपर\s*प्रवेश\s*का\s*सुनहरा\s*मौका/gi, 'प्रवेश प्रक्रिया')
    .replace(/बंपर\s*सर्टिफिकेट\s*कोर्स\s*का\s*मौका/gi, 'सर्टिफिकेट कोर्स')
    .replace(/बंपर\s*बदलाव/gi, 'महत्वपूर्ण बदलाव')
    .replace(/अभी-अभी\s*जारी\s*हुआ\s*नोटिफिकेशन!?/gi, 'अधिसूचना जारी')
    .replace(/अभी-अभी\s*जारी\s*नोटिफिकेशन!?/gi, 'अधिसूचना जारी')
    .replace(/अभी-अभी\s*जारी\s*हुई\s*बड़ी\s*खबर!?/gi, 'नवीनतम अपडेट')
    .replace(/अभी-अभी\s*जारी\s*हुई!?/gi, 'जारी हुई')
    .replace(/अभी-अभी\s*जारी!?/gi, 'जारी')
    .replace(/यहाँ\s*से\s*डायरेक्ट\s*करें\s*आवेदन!?/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ\s*से\s*करें\s*डायरेक्ट\s*आवेदन!?/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ\s*से\s*करें\s*Direct\s*Apply!?/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ\s*से\s*Direct\s*करें\s*आवेदन!?/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ\s*से\s*डायरेक्ट\s*देखें\s*अपना\s*नाम!?/gi, 'लिस्ट देखें')
    .replace(/यहाँ\s*से\s*डायरेक्ट\s*चेक\s*करें\s*स्कोरकार्ड!?/gi, 'स्कोरकार्ड देखें')
    .replace(/यहाँ\s*से\s*करें\s*डायरेक्ट\s*चेक!?/gi, 'जांचें विवरण')
    .replace(/यहाँ\s*से\s*Direct\s*Download!?/gi, 'डाउनलोड करें')
    .replace(/मचाएगा\s*धूम!?/gi, 'लॉन्च व फीचर्स')
    .replace(/मचाएगा\s*तहलका!?/gi, 'फुल स्पेसिफिकेशन्स')
    .replace(/धमाका!?/gi, 'अपडेट')
    .replace(/सुनहरा\s*मौका!?/gi, 'महत्वपूर्ण विवरण')
    .replace(/BREAKING:\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        seoTitle: true,
        excerpt: true,
        content: true,
      }
    });

    let updatedCount = 0;
    const modifiedTitles: { old: string; new: string }[] = [];

    for (const post of posts) {
      const cleanTitle = cleanString(post.title);
      const cleanSeo = post.seoTitle ? cleanString(post.seoTitle) : cleanTitle;
      const cleanExc = post.excerpt ? cleanString(post.excerpt) : null;
      const cleanCont = cleanString(post.content);

      if (cleanTitle !== post.title || cleanSeo !== post.seoTitle || cleanExc !== post.excerpt || cleanCont !== post.content) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            title: cleanTitle,
            seoTitle: cleanSeo,
            excerpt: cleanExc,
            content: cleanCont,
          }
        }).catch(() => {});
        updatedCount++;
        if (cleanTitle !== post.title) {
          modifiedTitles.push({ old: post.title, new: cleanTitle });
        }
      }
    }

    try {
      revalidatePath('/');
      revalidatePath('/blog');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${updatedCount} आर्टिकल्स के शीर्षकों और कंटेंट से क्लिकबेट साफ किया गया!`,
      totalPosts: posts.length,
      updatedCount,
      sampleModified: modifiedTitles.slice(0, 10)
    });
  } catch (error: any) {
    console.error('Error cleaning titles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
