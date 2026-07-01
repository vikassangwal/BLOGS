import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get('title') || 'Knowora Premium Knowledge Base';
    const bgUrl = searchParams.get('bg') || '';

    // Verify if background is passed, else use a cool fallback gradient
    const backgroundStyles = bgUrl ? {
      backgroundImage: `url(${bgUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } : {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    };

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            ...backgroundStyles,
          }}
        >
          {/* Dark overlay for text readability */}
          {bgUrl && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
              }}
            />
          )}
          
          {/* Content Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 80px',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              background: 'rgba(0, 0, 0, 0.5)',
              maxWidth: '85%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Tag/Badge */}
            <div
              style={{
                background: 'linear-gradient(90deg, #00C6FF 0%, #0072FF 100%)',
                color: 'white',
                padding: '10px 30px',
                borderRadius: '50px',
                fontSize: 24,
                fontWeight: 800,
                marginBottom: 30,
                letterSpacing: 2,
                textTransform: 'uppercase',
                boxShadow: '0 4px 15px rgba(0,114,255,0.4)'
              }}
            >
              KNOWORA EXCLUSIVE
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: title.length > 60 ? 50 : 65,
                fontStyle: 'normal',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.2,
                whiteSpace: 'pre-wrap',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                marginBottom: 50,
              }}
            >
              {title}
            </div>

            {/* Read More Button */}
            <div
              style={{
                display: 'flex',
                background: 'white',
                color: '#0f172a',
                padding: '16px 50px',
                borderRadius: '50px',
                fontSize: 30,
                fontWeight: 900,
                boxShadow: '0 10px 30px rgba(255,255,255,0.3)',
              }}
            >
              READ ARTICLE ↗
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
