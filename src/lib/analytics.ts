import type { Campaign } from "./klaviyo";

export type KpiSummary = {
  totalCampaigns: number;
  totalRecipients: number;
  avgOpenRate: number;
  avgCtor: number;
  avgConvRate: number;
  avgRevPerRecipient: number;
  totalRevenue: number;
};

export type SubjectInsight = {
  label: string;
  count: number;
  avgOpen: number;
  avgCtor: number;
  avgConv: number;
};

export type SubjectIntelligence = {
  emoji: { yes: SubjectInsight; no: SubjectInsight };
  number: { yes: SubjectInsight; no: SubjectInsight };
  length: { short: SubjectInsight; medium: SubjectInsight; long: SubjectInsight };
  urgency: { yes: SubjectInsight; no: SubjectInsight };
};

export type SegmentStats = {
  segment: string;
  count: number;
  avgOpen: number;
  avgCtor: number;
  avgConv: number;
  avgRevPerRecipient: number;
  totalRevenue: number;
};

export type HourStats = {
  hour: number;
  count: number;
  avgOpen: number;
  avgCtor: number;
  avgConv: number;
};

export type TopPerformer = {
  campaign: Campaign;
  value: number;
  label: string;
};

const URGENCY_WORDS = ["urgente", "última", "últimas", "agora", "hoje", "limitado", "exclusivo", "off", "desconto", "acaba", "encerra", "restam", "apenas", "só", "atenção", "nota", "importante"];

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function toInsight(label: string, campaigns: Campaign[]): SubjectInsight {
  return {
    label,
    count: campaigns.length,
    avgOpen: avg(campaigns.map((c) => c.openRate)),
    avgCtor: avg(campaigns.map((c) => c.clickToOpenRate)),
    avgConv: avg(campaigns.map((c) => c.conversionRate)),
  };
}

export function hasEmoji(text: string): boolean {
  return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(text);
}

export function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

export function hasUrgency(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENCY_WORDS.some((w) => lower.includes(w));
}

export function subjectCategory(subject: string): "short" | "medium" | "long" {
  if (subject.length < 40) return "short";
  if (subject.length <= 60) return "medium";
  return "long";
}

export function computeKpis(campaigns: Campaign[]): KpiSummary {
  return {
    totalCampaigns: campaigns.length,
    totalRecipients: campaigns.reduce((s, c) => s + c.recipients, 0),
    avgOpenRate: avg(campaigns.map((c) => c.openRate)),
    avgCtor: avg(campaigns.map((c) => c.clickToOpenRate)),
    avgConvRate: avg(campaigns.map((c) => c.conversionRate)),
    avgRevPerRecipient: avg(campaigns.map((c) => c.revenuePerRecipient)),
    totalRevenue: campaigns.reduce((s, c) => s + c.conversionValue, 0),
  };
}

export function computeSubjectIntelligence(campaigns: Campaign[]): SubjectIntelligence {
  const withSubject = campaigns.filter((c) => c.subject);

  const emojiYes = withSubject.filter((c) => hasEmoji(c.subject));
  const emojiNo = withSubject.filter((c) => !hasEmoji(c.subject));
  const numYes = withSubject.filter((c) => hasNumber(c.subject));
  const numNo = withSubject.filter((c) => !hasNumber(c.subject));
  const urgYes = withSubject.filter((c) => hasUrgency(c.subject));
  const urgNo = withSubject.filter((c) => !hasUrgency(c.subject));
  const short = withSubject.filter((c) => subjectCategory(c.subject) === "short");
  const medium = withSubject.filter((c) => subjectCategory(c.subject) === "medium");
  const long = withSubject.filter((c) => subjectCategory(c.subject) === "long");

  return {
    emoji: { yes: toInsight("Com emoji", emojiYes), no: toInsight("Sem emoji", emojiNo) },
    number: { yes: toInsight("Com número", numYes), no: toInsight("Sem número", numNo) },
    length: {
      short: toInsight("Curto (<40)", short),
      medium: toInsight("Médio (40-60)", medium),
      long: toInsight("Longo (>60)", long),
    },
    urgency: { yes: toInsight("Com urgência", urgYes), no: toInsight("Sem urgência", urgNo) },
  };
}

export function computeSegmentStats(campaigns: Campaign[]): SegmentStats[] {
  const map = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    const seg = c.audienceSegment || "Outros";
    if (!map.has(seg)) map.set(seg, []);
    map.get(seg)!.push(c);
  }

  return Array.from(map.entries())
    .map(([segment, cps]) => ({
      segment,
      count: cps.length,
      avgOpen: avg(cps.map((c) => c.openRate)),
      avgCtor: avg(cps.map((c) => c.clickToOpenRate)),
      avgConv: avg(cps.map((c) => c.conversionRate)),
      avgRevPerRecipient: avg(cps.map((c) => c.revenuePerRecipient)),
      totalRevenue: cps.reduce((s, c) => s + c.conversionValue, 0),
    }))
    .sort((a, b) => b.avgOpen - a.avgOpen);
}

export function computeHourStats(campaigns: Campaign[]): HourStats[] {
  const map = new Map<number, Campaign[]>();
  for (const c of campaigns) {
    if (!c.sendTime) continue;
    const hour = new Date(c.sendTime).getHours();
    if (!map.has(hour)) map.set(hour, []);
    map.get(hour)!.push(c);
  }

  return Array.from(map.entries())
    .map(([hour, cps]) => ({
      hour,
      count: cps.length,
      avgOpen: avg(cps.map((c) => c.openRate)),
      avgCtor: avg(cps.map((c) => c.clickToOpenRate)),
      avgConv: avg(cps.map((c) => c.conversionRate)),
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function computeTopPerformers(campaigns: Campaign[]): {
  byOpen: TopPerformer[];
  byCtor: TopPerformer[];
  byConv: TopPerformer[];
  byRevenue: TopPerformer[];
} {
  const top = (key: keyof Campaign, label: string) =>
    [...campaigns]
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .slice(0, 3)
      .map((c) => ({ campaign: c, value: c[key] as number, label }));

  return {
    byOpen: top("openRate", "Open Rate"),
    byCtor: top("clickToOpenRate", "CTOR"),
    byConv: top("conversionRate", "Conv%"),
    byRevenue: top("conversionValue", "Receita Total"),
  };
}
