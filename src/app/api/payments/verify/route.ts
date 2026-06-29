import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, postId } = await request.json();

        const settings = await prisma.siteSettings.findFirst();
        if (!settings || !settings.aiApiKey) {
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        const keys = JSON.parse(settings.aiApiKey);
        if (!keys.razorpaySecret) {
            return NextResponse.json({ error: 'Razorpay secret missing' }, { status: 500 });
        }

        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', keys.razorpaySecret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is verified
            // In a real advanced app, we would store this transaction in the DB against the user ID.
            // For now, we set an HttpOnly cookie to unlock premium content for this session.
            const response = NextResponse.json({ success: true, message: 'Payment verified successfully' });
            
            // Set cookie for unlocking premium content (in a real app, sign this with JWT)
            response.cookies.set({
                name: 'premium_unlocked',
                value: 'true',
                httpOnly: true,
                path: '/',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            
            return response;
        } else {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Verify Error:', error);
        return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
    }
}
