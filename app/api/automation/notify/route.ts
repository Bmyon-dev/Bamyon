import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      // Not configured — fail quietly from the caller's point of view.
      // Sale logging must never break because automation isn't set up yet.
      return NextResponse.json({ ok: false, reason: "not_configured" });
    }

    const body = await req.json();
    const { businessName, customerName, customerPhone, googleReviewLink, saleTotal } = body as {
      businessName: string;
      customerName?: string;
      customerPhone: string;
      googleReviewLink: string;
      saleTotal: number;
    };

    if (!customerPhone || !googleReviewLink) {
      return NextResponse.json({ error: "Missing customerPhone or googleReviewLink" }, { status: 400 });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        customerName: customerName || "Customer",
        customerPhone,
        googleReviewLink,
        saleTotal,
        triggeredAt: Date.now(),
      }),
    });

    return NextResponse.json({ ok: res.ok });
  } catch (err: any) {
    // Same principle: never let an automation hiccup surface as a failed
    // sale. Log it server-side and return a soft failure.
    console.error("automation/notify failed:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
