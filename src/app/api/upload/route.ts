import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/requireAuth';

// Configure Cloudinary
// Ensure these environment variables are set in .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Only allow common web image formats.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
// Max decoded image size: 5 MB.
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated user — uploading is not a public action.
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image data (base64) is required' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
       return NextResponse.json({ error: 'Cloudinary credentials are not configured on the server. Please add them to .env' }, { status: 500 });
    }

    // Validate the data URL: must be a base64-encoded allowed image type.
    const match = image.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image data. Expected a base64 data URL.' }, { status: 400 });
    }

    const mime = match[1].toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 400 });
    }

    // Estimate decoded byte size from the base64 payload without allocating a full buffer.
    const base64Data = match[2];
    const approxBytes = Math.floor((base64Data.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 5 MB.' }, { status: 413 });
    }

    // Upload the image to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'knowora_uploads', // Keeps uploads organized
      resource_type: 'image',
    });

    return NextResponse.json({ success: true, url: uploadResponse.secure_url });
  } catch (error: any) {
    console.error("[Upload API] Error uploading to Cloudinary:", error);
    return NextResponse.json({ success: false, error: error.message || 'Image upload failed' }, { status: 500 });
  }
}
