import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "@/app/api/analyze/route";

const client = new Anthropic();

export type GeneratedCopy = {
  subjects: string[];
  previews: string[];
  body: string;
  brief: string;
};

export async function POST(req: NextRequest) {
  const {
    analysis,
    brief,
  }: { analysis: AnalysisResult; brief: string } = await req.json();

  if (!brief || brief.trim().length < 10) {
    return NextResponse.json(
      { error: "Descreva o email com pelo menos 10 caracteres" },
      { status: 400 }
    );
  }

  const hiddenSection =
    analysis.hiddenPatterns?.length > 0
      ? `\nPADRÕES OCULTOS IDENTIFICADOS (use esses para diferenciar o copy):\n${analysis.hiddenPatterns.map((p) => `• ${p}`).join("\n")}`
      : "";

  const performanceSection =
    analysis.performanceInsights?.length > 0
      ? `\nDADOS DE PERFORMANCE (calibre o copy com base nesses números):\n${analysis.performanceInsights.map((p) => `• ${p}`).join("\n")}`
      : "";

  const prompt = `Você é um copywriter especialista em email marketing para e-commerce masculino premium brasileiro. Sua missão é criar copies que performam tão bem quanto as melhores campanhas da Minimal Club.

PADRÕES IDENTIFICADOS NAS CAMPANHAS TOP PERFORMERS:

Subjects que funcionam:
${analysis.subjectPatterns.map((p) => `• ${p}`).join("\n")}

Previews que funcionam:
${analysis.previewPatterns.map((p) => `• ${p}`).join("\n")}

Padrões no conteúdo/estratégia:
${analysis.bodyPatterns.map((p) => `• ${p}`).join("\n")}

Principal insight: ${analysis.topInsight}
${hiddenSection}
${performanceSection}

---

BRIEFING DO NOVO EMAIL:
${brief}

---

Crie um email de marketing seguindo esses padrões. Responda APENAS com JSON válido, sem markdown:

{
  "subjects": [
    "subject opção 1",
    "subject opção 2",
    "subject opção 3"
  ],
  "previews": [
    "preview text opção 1",
    "preview text opção 2",
    "preview text opção 3"
  ],
  "body": "Corpo completo do email em texto simples (pode usar quebras de linha). Deve incluir: abertura impactante, apresentação do produto/oferta, benefícios claros, prova social ou urgência, e CTA forte. Máximo 300 palavras."
}

Seja direto, específico e adaptado ao público masculino da Minimal Club (25-40 anos, renda média-alta, interessa em moda e estilo de vida).`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Resposta inesperada");

    const cleanJson = content.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const generated: Omit<GeneratedCopy, "brief"> = JSON.parse(cleanJson);
    return NextResponse.json({ ...generated, brief });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro na geração: ${msg}` }, { status: 500 });
  }
}
