import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// Ensure these environment variables are set in .env
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image data (base64) is required' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
       return NextResponse.json({ error: 'Cloudinary credentials are not configured on the server. Please add them to .env' }, { status: 500 });
    }

    // Upload the image to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'knowora_uploads', // Keeps uploads organized
    });

    return NextResponse.json({ success: true, url: uploadResponse.secure_url });
  } catch (error: any) {
    console.error("[Upload API] Error uploading to Cloudinary:", error);
    return NextResponse.json({ success: false, error: error.message || 'Image upload failed' }, { status: 500 });
  }
}
