import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/verifyIdToken";
import { firestoreGetDoc } from "@/lib/firestoreRest";
import { planUnlocks } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const idToken = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!idToken) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const { uid } = await verifyFirebaseIdToken(idToken);

    // Reads below run as this exact user against your normal Firestore
    // rules — no elevated access is used anywhere in this route.
    const userDoc = await firestoreGetDoc(`users/${uid}`, idToken);
    if (!userDoc || userDoc.role !== "owner" || !userDoc.businessId) {
      return NextResponse.json({ error: "Only the business owner can send campaigns" }, { status: 403 });
    }

    const business = await firestoreGetDoc(`businesses/${userDoc.businessId}`, idToken);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    if (!planUnlocks(business as any, "premium_pro")) {
      return NextResponse.json({ error: "Email campaigns require the Premium Pro plan" }, { status: 403 });
    }

    const { message, recipients } = (await req.json()) as {
      message: string;
      recipients: { email: string; name: string }[];
    };
    const validRecipients = (recipients || []).filter((r) => r.email);
    if (!message?.trim() || validRecipients.length === 0) {
      return NextResponse.json({ error: "A message and at least one recipient are required" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromAddress) {
      return NextResponse.json(
        { error: "Email sending isn't configured yet — add RESEND_API_KEY and RESEND_FROM_EMAIL to your environment variables." },
        { status: 500 }
      );
    }

    let sent = 0;
    for (const r of validRecipients) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromAddress,
            to: r.email,
            subject: `A message from ${business.name}`,
            text: `Hi ${r.name || "there"},\n\n${message}\n\n— ${business.name}`,
          }),
        });
        if (res.ok) sent += 1;
      } catch {
        // keep going for the rest of the list even if one send fails
      }
    }

    return NextResponse.json({ ok: true, sent, total: validRecipients.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send campaign" }, { status: 500 });
  }
}
