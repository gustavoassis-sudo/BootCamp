import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Campaign } from "@/lib/klaviyo";

const client = new Anthropic();

export type AnalysisResult = {
  subjectPatterns: string[];
  previewPatterns: string[];
  bodyPatterns: string[];
  topInsight: string;
  performanceInsights: string[];
  hiddenPatterns: string[];
  audienceInsights: string[];
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
- Segmento: ${c.audienceSegment || "não identificado"}
- Subject: ${c.subject || "(sem subject)"}
- Preview Text: ${c.previewText || "(sem preview)"}
- Horário de envio: ${c.sendTime ? new Date(c.sendTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
- Open Rate: ${(c.openRate * 100).toFixed(1)}%
- CTOR (Click-to-Open): ${(c.clickToOpenRate * 100).toFixed(1)}%
- Click Rate: ${(c.clickRate * 100).toFixed(1)}%
- Taxa de Conversão: ${(c.conversionRate * 100).toFixed(2)}%
- Receita Total: R$ ${c.conversionValue.toFixed(2)}
- Ticket Médio (AOV): R$ ${c.averageOrderValue.toFixed(2)}
- Receita por Destinatário: R$ ${c.revenuePerRecipient.toFixed(2)}
- Destinatários: ${c.recipients.toLocaleString("pt-BR")}
- Taxa de Descadastro: ${(c.unsubscribeRate * 100).toFixed(3)}%
- Taxa de Spam: ${(c.spamComplaintRate * 100).toFixed(4)}%`
    )
    .join("\n");

  const prompt = `Você é um especialista em email marketing e análise de dados para e-commerce masculino premium. Analise as seguintes campanhas da Minimal Club (marca de roupas masculinas D2C brasileira) com dados quantitativos completos.

${campaignList}

Sua análise deve ir ALÉM do óbvio. Encontre:
1. Padrões que humanos não percebem facilmente (correlações entre variáveis)
2. Anomalias reveladoras (ex: open rate alto + conversão zero = problema no corpo do email)
3. Diferenças de performance por segmento (A+ vs LEADS vs outros)
4. Padrão de horário que correlaciona com conversão ou CTOR
5. Qual tipo de subject/preview gera CTOR alto (não apenas abertura)

Dados quantitativos obrigatórios: use números reais das campanhas nos seus insights. Não diga "emails com urgência performam melhor" — diga "emails com urgência no subject tiveram CTOR médio de X% vs Y% dos demais".

Responda APENAS com JSON válido, sem markdown, sem texto adicional:

{
  "subjectPatterns": ["padrão específico 1 com dados", "padrão 2", "padrão 3"],
  "previewPatterns": ["padrão específico 1 com dados", "padrão 2", "padrão 3"],
  "bodyPatterns": ["padrão de estratégia/conteúdo 1", "padrão 2", "padrão 3"],
  "topInsight": "O insight mais surpreendente ou valioso — deve incluir número(s) real(is)",
  "performanceInsights": [
    "dado quantitativo 1 (ex: campanhas com AOV > R$X geraram Y% mais receita total)",
    "dado quantitativo 2",
    "dado quantitativo 3"
  ],
  "hiddenPatterns": [
    "correlação não óbvia 1 (ex: emails enviados entre X-Xh tiveram CTOR Y% maior)",
    "correlação não óbvia 2",
    "correlação não óbvia 3"
  ],
  "audienceInsights": [
    "diferença entre segmentos 1 (ex: CLIENTES A+ convertem X% vs LEADS Y%)",
    "padrão de segmento 2",
    "recomendação baseada em segmento 3"
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Resposta inesperada do Claude");
    }

    const cleanJson = content.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const analysis: AnalysisResult = JSON.parse(cleanJson);
    return NextResponse.json(analysis);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro na análise: ${msg}` }, { status: 500 });
  }
}
