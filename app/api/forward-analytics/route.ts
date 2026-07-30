import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload || !payload.path) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
    }

    const webhook = process.env.ADMIN_ANALYTICS_WEBHOOK
    const secret = process.env.ADMIN_ANALYTICS_WEBHOOK_SECRET

    if (webhook) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (secret) headers['Authorization'] = `Bearer ${secret}`

      // Forward to configured admin webhook
      await fetch(webhook, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((e) => {
        console.error('Failed to forward analytics payload', e)
      })
    } else {
      // No webhook configured — write a server-side log so it appears in Vercel logs
      console.log('Analytics payload received (no webhook configured):', payload.path)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
