import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ownerEmail, businessName, buyerName, buyerEmail, buyerPhone, items, total } = await req.json();

    if (!ownerEmail) {
      return NextResponse.json({ ok: false, reason: "no_owner_email" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromAddress) {
      // Same principle as everywhere else: a missing integration should
      // never break the customer's checkout flow — just skip the email.
      return NextResponse.json({ ok: false, reason: "email_not_configured" });
    }

    const itemsList = (items || [])
      .map((i: any) => `${i.qty}x ${i.name} - ${i.price}`)
      .join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: ownerEmail,
        subject: `New order claim on ${businessName} — please confirm`,
        text:
          `You have a new order claiming to be paid online.\n\n` +
          `Buyer: ${buyerName}\nEmail: ${buyerEmail}\nPhone: ${buyerPhone}\n\n` +
          `Items:\n${itemsList}\n\nTotal: ${total}\n\n` +
          `Log into your Bamyon dashboard to confirm this order under Orders.`,
      }),
    });

    return NextResponse.json({ ok: res.ok });
  } catch (err: any) {
    console.error("orders/notify-owner failed:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
