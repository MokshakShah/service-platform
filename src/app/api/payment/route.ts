import { NextResponse, NextRequest } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.STRIPE_SECRET) {
      return NextResponse.json(
        { error: 'Stripe configuration is missing' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET, {
      typescript: true,
      apiVersion: '2023-10-16',
    })

    const products = await stripe.prices.list({
      limit: 3,
    })

    return NextResponse.json(products.data)
  } catch (error: any) {
    console.error('Payment GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.STRIPE_SECRET) {
      return NextResponse.json(
        { error: 'Stripe configuration is missing' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET, {
      typescript: true,
      apiVersion: '2023-10-16',
    })
    
    const data = await req.json()
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: data.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url:
        'https://localhost:3000/billing?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://localhost:3000/billing',
    })
    return NextResponse.json(session.url)
  } catch (error: any) {
    console.error('Payment POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
