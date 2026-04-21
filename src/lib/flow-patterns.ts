import type { Campaign } from "./klaviyo";

export type FlowType = "welcome" | "abandoned_cart" | "reengagement" | "custom";

export type EmailObjective =
  | "welcome"
  | "product"
  | "social_proof"
  | "urgency"
  | "reminder"
  | "reconnect"
  | "custom";

export type EmailBrief = {
  position: number;
  objective: EmailObjective;
  delay: number;
  customObjective?: string;
};

export type FlowBrief = {
  type: FlowType;
  name: string;
  triggerListId: string;
  triggerListName: string;
  segment: string;
  objective: string;
  emails: EmailBrief[];
};

export type CopyScore = {
  estimatedOpen: number;
  estimatedCtor: number;
  estimatedConv: number;
  confidence: "alta" | "média" | "baixa";
  similarCampaigns: number;
};

export type GeneratedEmail = {
  position: number;
  subject: string;
  previewText: string;
  body: string;
  score: CopyScore;
  rationale: string;
};

export type FlowPattern = {
  subjectStyle: string[];
  previewStyle: string[];
  bodyStructure: string[];
  idealDelays: number[];
  bestHour: number;
  topInsight: string;
  basedOn: number;
};

export const FLOW_TEMPLATES: Record<FlowType, EmailBrief[]> = {
  welcome: [
    { position: 1, delay: 0, objective: "welcome" },
    { position: 2, delay: 2, objective: "product" },
    { position: 3, delay: 5, objective: "social_proof" },
    { position: 4, delay: 7, objective: "urgency" },
  ],
  abandoned_cart: [
    { position: 1, delay: 0, objective: "reminder" },
    { position: 2, delay: 1, objective: "social_proof" },
    { position: 3, delay: 3, objective: "urgency" },
  ],
  reengagement: [
    { position: 1, delay: 0, objective: "reconnect" },
    { position: 2, delay: 3, objective: "product" },
    { position: 3, delay: 7, objective: "urgency" },
  ],
  custom: [],
};

export const OBJECTIVE_LABELS: Record<EmailObjective, string> = {
  welcome: "Boas-vindas",
  product: "Produto destaque",
  social_proof: "Prova social",
  urgency: "Urgência / Oferta final",
  reminder: "Lembrete",
  reconnect: "Reconexão",
  custom: "Personalizado",
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function analyzeFlowPatterns(
  campaigns: Campaign[],
  segment: string
): FlowPattern {
  const segmentCampaigns =
    segment && segment !== "all"
      ? campaigns.filter((c) => c.audienceSegment.includes(segment))
      : campaigns;

  const target = segmentCampaigns.length >= 3 ? segmentCampaigns : campaigns;

  const topByConv = [...target]
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);

  const topByOpen = [...target]
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 10);

  const hourMap = new Map<number, number[]>();
  for (const c of target) {
    if (!c.sendTime) continue;
    const h = new Date(c.sendTime).getHours();
    if (!hourMap.has(h)) hourMap.set(h, []);
    hourMap.get(h)!.push(c.openRate);
  }
  const hourEntries = Array.from(hourMap.entries()).map(([h, rates]) => ({
    hour: h,
    avgOpen: avg(rates),
  }));
  const bestHour =
    hourEntries.length > 0
      ? hourEntries.reduce((best, h) => (h.avgOpen > best.avgOpen ? h : best))
          .hour
      : 10;

  return {
    subjectStyle: topByOpen.slice(0, 5).map((c) => c.subject).filter(Boolean),
    previewStyle: topByOpen.slice(0, 5).map((c) => c.previewText).filter(Boolean),
    bodyStructure: topByConv.slice(0, 3).map((c) => c.name).filter(Boolean),
    idealDelays: [0, 2, 5, 7],
    bestHour,
    topInsight: `Baseado em ${target.length} campanhas ${segment && segment !== "all" ? `do segmento ${segment}` : "da base"}, com open médio ${(avg(target.map((c) => c.openRate)) * 100).toFixed(1)}%`,
    basedOn: target.length,
  };
}

export function estimateScore(
  pattern: FlowPattern,
  campaigns: Campaign[],
  segment: string
): CopyScore {
  const base =
    segment && segment !== "all"
      ? campaigns.filter((c) => c.audienceSegment.includes(segment))
      : campaigns;

  const sample = base.length >= 3 ? base : campaigns;
  const estimatedOpen = avg(sample.map((c) => c.openRate));
  const estimatedCtor = avg(sample.map((c) => c.clickToOpenRate));
  const estimatedConv = avg(sample.map((c) => c.conversionRate));

  return {
    estimatedOpen,
    estimatedCtor,
    estimatedConv,
    confidence: sample.length >= 10 ? "alta" : sample.length >= 5 ? "média" : "baixa",
    similarCampaigns: sample.length,
  };
}
