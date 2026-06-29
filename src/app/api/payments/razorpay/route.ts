import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { postId, amount = 99 } = await request.json();

        // Get Razorpay keys from settings
        const settings = await prisma.siteSettings.findFirst();
        if (!settings || !settings.aiApiKey) {
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        const keys = JSON.parse(settings.aiApiKey);
        if (!keys.razorpayKey || !keys.razorpaySecret) {
            return NextResponse.json({ error: 'Razorpay keys missing' }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id: keys.razorpayKey,
            key_secret: keys.razorpaySecret,
        });

        // Create an order
        const options = {
            amount: amount * 100, // amount in smallest currency unit (paise)
            currency: 'INR',
            receipt: `receipt_order_${postId}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            keyId: keys.razorpayKey // Send key to frontend to initialize checkout
        });

    } catch (error: any) {
        console.error('Razorpay Error:', error);
        return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
    }
}
