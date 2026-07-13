import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    return secret;
}

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

        // Timing-safe comparison to avoid leaking the signature via response timing.
        const expectedBuf = Buffer.from(expectedSignature, 'utf8');
        const providedBuf = Buffer.from(String(razorpay_signature || ''), 'utf8');
        const signatureValid =
            expectedBuf.length === providedBuf.length &&
            crypto.timingSafeEqual(expectedBuf, providedBuf);

        if (signatureValid) {
            // Payment is verified. Issue a SIGNED, tamper-proof premium token
            // instead of a plain "true" cookie the user could set themselves.
            const premiumToken = jwt.sign(
                { premium: true, orderId: razorpay_order_id, postId: postId ?? null },
                getJwtSecret(),
                { expiresIn: '30d' }
            );

            const response = NextResponse.json({ success: true, message: 'Payment verified successfully' });

            response.cookies.set({
                name: 'premium_unlocked',
                value: premiumToken,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
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
