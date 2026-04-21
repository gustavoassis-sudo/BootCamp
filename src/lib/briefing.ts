import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import type { Campaign } from "./klaviyo";
import type { KpiSummary, SegmentStats, HourStats } from "./analytics";

const client = new Anthropic();

export type ExecutiveBriefing = {
  situation: string;
  highlight: { title: string; detail: string };
  anomaly: { title: string; detail: string } | null;
  risk: { title: string; detail: string } | null;
  nextEmail: string;
};

async function _generateBriefing(
  campaigns: Campaign[],
  kpis: KpiSummary,
  segments: SegmentStats[],
  hours: HourStats[]
): Promise<ExecutiveBriefing> {
  const bestHour = hours.length > 0
    ? hours.reduce((best, h) => (h.avgOpen > best.avgOpen ? h : best), hours[0])
    : null;

  const topCampaign = campaigns[0];
  const avgOpen = kpis.avgOpenRate;

  const anomalies = campaigns.filter(
    (c) => c.openRate > avgOpen * 1.3 && c.conversionRate === 0
  );

  const riskSegments = segments.filter((s) => s.avgRevPerRecipient === 0 && s.count >= 3);

  const prompt = `Você é um CMO com 10 anos de experiência em e-commerce D2C brasileiro. Analise esses dados de email marketing da Minimal Club e escreva um briefing executivo direto e acionável.

DADOS GERAIS (últimos 90 dias):
- Campanhas analisadas: ${kpis.totalCampaigns}
- Open rate médio: ${(kpis.avgOpenRate * 100).toFixed(1)}%
- CTOR médio: ${(kpis.avgCtor * 100).toFixed(1)}%
- Conv% média: ${(kpis.avgConvRate * 100).toFixed(3)}%
- Rev/rec médio: R$ ${kpis.avgRevPerRecipient.toFixed(3)}
- Receita total: R$ ${kpis.totalRevenue.toFixed(2)}
- Total destinatários: ${kpis.totalRecipients.toLocaleString("pt-BR")}

TOP CAMPANHA:
- Nome: ${topCampaign?.name}
- Subject: ${topCampaign?.subject}
- Open: ${((topCampaign?.openRate ?? 0) * 100).toFixed(1)}% (${(((topCampaign?.openRate ?? 0) / avgOpen - 1) * 100).toFixed(0)}% acima da média)
- CTOR: ${((topCampaign?.clickToOpenRate ?? 0) * 100).toFixed(1)}%
- Conv: ${((topCampaign?.conversionRate ?? 0) * 100).toFixed(3)}%
- Segmento: ${topCampaign?.audienceSegment || "não identificado"}

PERFORMANCE POR SEGMENTO:
${segments.map((s) => `- ${s.segment}: ${s.count} camps · open ${(s.avgOpen * 100).toFixed(1)}% · ctor ${(s.avgCtor * 100).toFixed(1)}% · rev/rec R$${s.avgRevPerRecipient.toFixed(3)}`).join("\n")}

MELHOR HORÁRIO:
${bestHour ? `${bestHour.hour}h — open médio ${(bestHour.avgOpen * 100).toFixed(1)}%, ${bestHour.count} campanhas` : "sem dados suficientes"}

ANOMALIAS (open alto + conv zero):
${anomalies.length > 0 ? anomalies.map((c) => `- ${c.name}: open ${(c.openRate * 100).toFixed(1)}% mas conv 0%`).join("\n") : "nenhuma"}

SEGMENTOS SEM ROI:
${riskSegments.length > 0 ? riskSegments.map((s) => `- ${s.segment}: ${s.count} camps sem receita`).join("\n") : "nenhum"}

Escreva um briefing executivo. Seja específico, use os números reais, seja direto como um CMO experiente. Sem enrolação.

Responda APENAS com JSON válido:
{
  "situation": "1-2 frases resumindo o estado atual com números reais",
  "highlight": {
    "title": "nome ou subject da campanha destaque",
    "detail": "por que performou bem e o que copiar — com dados"
  },
  "anomaly": {
    "title": "título da anomalia identificada",
    "detail": "o que está acontecendo e o que fazer — com dados"
  },
  "risk": {
    "title": "título do risco identificado",
    "detail": "o risco e a ação recomendada — com dados"
  },
  "nextEmail": "recomendação concreta para o próximo email: segmento, horário, tipo de subject, o que evitar"
}

Se não houver anomalia ou risco real nos dados, retorne null para esses campos.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Resposta inesperada");

  const cleanJson = content.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(cleanJson) as ExecutiveBriefing;
}

export const generateBriefing = unstable_cache(
  _generateBriefing,
  ["executive-briefing"],
  { revalidate: 300 }
);
