import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Knowora Premium Knowledge Base';
    const bgUrl = searchParams.get('bg'); 

    // Hardcoded heights for the audio waveform
    const heights = [15, 25, 40, 20, 50, 35, 25, 45, 15, 30, 45, 20, 35, 15, 25, 40, 20];

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#F8F9FA', // Very light grey/white like Google
            fontFamily: 'sans-serif',
            padding: '60px',
            position: 'relative'
          }}
        >
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: 45, height: 45, background: '#1A73E8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 22, height: 22, border: '4px solid white', borderRadius: '50%' }}></div>
              </div>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#3c4043', letterSpacing: '-0.5px' }}>
                Knowora<span style={{ color: '#1A73E8' }}>LM</span>
              </span>
            </div>
            
            <div style={{
              background: '#E8F0FE',
              color: '#1A73E8',
              padding: '12px 28px',
              borderRadius: '50px',
              fontSize: 22,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              AI Overview
            </div>
          </div>

          {/* Main Card (Notebook Style) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              marginTop: '40px',
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid #EAECC6', // subtle border
              boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Subtle background image watermark */}
            {bgUrl && (
               <img src={bgUrl} alt="bg" style={{ position: 'absolute', right: -50, top: -50, width: 400, height: 400, objectFit: 'cover', borderRadius: '50%', opacity: 0.08 }} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', padding: '60px', flex: 1, justifyContent: 'center', zIndex: 10 }}>
              <div
                style={{
                  fontSize: title.length > 70 ? 55 : 68,
                  fontWeight: 800,
                  color: '#202124',
                  lineHeight: 1.2,
                  letterSpacing: '-1.5px',
                  marginBottom: '50px',
                  maxWidth: '90%'
                }}
              >
                {title}
              </div>

              {/* Audio / Podcast Player UI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginTop: 'auto' }}>
                {/* Play Button */}
                <div style={{
                  width: 80, height: 80, background: '#1A73E8', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(26, 115, 232, 0.35)'
                }}>
                  {/* Triangle for play */}
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '16px solid transparent',
                    borderBottom: '16px solid transparent',
                    borderLeft: '26px solid white',
                    marginLeft: '8px'
                  }}></div>
                </div>

                {/* Waveform Fake UI */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '60px' }}>
                  {heights.map((h, i) => (
                    <div key={i} style={{ width: 8, height: `${h}px`, background: i < 6 ? '#1A73E8' : '#D2E3FC', borderRadius: '4px' }}></div>
                  ))}
                </div>

                <div style={{ marginLeft: '10px', fontSize: 26, fontWeight: 600, color: '#5F6368' }}>
                  Listen to Summary
                </div>
              </div>
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
