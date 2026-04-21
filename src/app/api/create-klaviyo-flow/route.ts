import { NextRequest, NextResponse } from "next/server";
import { createKlaviyoFlow } from "@/lib/klaviyo-flows";
import type { FlowBrief, GeneratedEmail } from "@/lib/flow-patterns";

export async function POST(req: NextRequest) {
  const {
    brief,
    emails,
  }: { brief: FlowBrief; emails: GeneratedEmail[] } = await req.json();

  if (!brief || !emails || emails.length === 0) {
    return NextResponse.json(
      { error: "Brief ou emails ausentes" },
      { status: 400 }
    );
  }

  try {
    const result = await createKlaviyoFlow(brief, emails);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro ao criar flow: ${msg}` },
      { status: 500 }
    );
  }
}
