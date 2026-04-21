import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Campaign } from "@/lib/klaviyo";

const client = new Anthropic();

export type AnalysisResult = {
  subjectPatterns: string[];
  previewPatterns: string[];
  bodyPatterns: string[];
  topInsight: string;
};

export async function POST(req: NextRequest) {
  const { campaigns }: { campaigns: Campaign[] } = await req.json();

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ error: "Nenhuma campanha fornecida" }, { status: 400 });
  }

  const campaignList = campaigns
    .map(
      (c, i) => `
Campanha ${i + 1}: ${c.name}
- Subject: ${c.subject || "(sem subject)"}
- Preview Text: ${c.previewText || "(sem preview)"}
- Open Rate: ${(c.openRate * 100).toFixed(1)}%
- Click Rate: ${(c.clickRate * 100).toFixed(1)}%
- Receita por Destinatário: R$ ${c.revenuePerRecipient.toFixed(2)}`
    )
    .join("\n");

  const prompt = `Você é um especialista em email marketing para e-commerce masculino premium. Analise as seguintes campanhas de email da Minimal Club (marca de roupas masculinas D2C brasileira) que tiveram as melhores taxas de abertura:

${campaignList}

Identifique os padrões que fazem esses emails performar bem. Responda APENAS com um JSON válido no seguinte formato, sem markdown, sem texto adicional:

{
  "subjectPatterns": ["padrão 1 em subject", "padrão 2 em subject", "padrão 3 em subject"],
  "previewPatterns": ["padrão 1 em preview", "padrão 2 em preview", "padrão 3 em preview"],
  "bodyPatterns": ["padrão 1 em corpo/estratégia", "padrão 2", "padrão 3"],
  "topInsight": "O principal insight sobre o que faz esses emails funcionarem bem para o público da Minimal Club"
}

Seja específico e acionável. Foque em padrões reais observados, não generalidades.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Resposta inesperada do Claude");
    }

    const analysis: AnalysisResult = JSON.parse(content.text);
    return NextResponse.json(analysis);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro na análise: ${msg}` }, { status: 500 });
  }
}
