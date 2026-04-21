import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { GeneratedCopy } from "@/app/api/generate/route";

export async function POST(req: NextRequest) {
  const copy: GeneratedCopy = await req.json();

  const { data, error } = await getSupabaseAdmin()
    .from("copies")
    .insert({
      brief: copy.brief,
      subject_variants: copy.subjects,
      preview_variants: copy.previews,
      body: copy.body,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("copies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
