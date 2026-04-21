"use client";

import { useState, useMemo } from "react";
import type { Campaign } from "@/lib/klaviyo";
import { hasEmoji, hasNumber, hasUrgency, subjectCategory } from "@/lib/analytics";

function pct(n: number, d = 1) {
  return (n * 100).toFixed(d) + "%";
}

function deltaPct(value: number, baseline: number): string {
  if (baseline === 0) return "—";
  const delta = ((value - baseline) / baseline) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}

function deltaColor(value: number, baseline: number, higherIsBetter = true): string {
  if (baseline === 0) return "text-neutral-500";
  const delta = value - baseline;
  const positive = higherIsBetter ? delta > 0 : delta < 0;
  if (Math.abs(delta / baseline) < 0.05) return "text-neutral-500";
  return positive ? "text-emerald-400" : "text-red-400";
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function KpiCell({
  label,
  value,
  baseline,
  format,
  higherIsBetter = true,
}: {
  label: string;
  value: number;
  baseline: number;
  format: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{format(value)}</p>
      <p className={`text-xs mt-1 ${deltaColor(value, baseline, higherIsBetter)}`}>
        {deltaPct(value, baseline)} vs média ({format(baseline)})
      </p>
    </div>
  );
}

function CompareBar({
  label,
  campaignValue,
  avgValue,
  format,
  max,
}: {
  label: string;
  campaignValue: number;
  avgValue: number;
  format: (n: number) => string;
  max: number;
}) {
  const campPct = max > 0 ? (campaignValue / max) * 100 : 0;
  const avgPctVal = max > 0 ? (avgValue / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-medium">{format(campaignValue)}</span>
      </div>
      <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-violet-500 rounded-full"
          style={{ width: `${campPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-neutral-400"
          style={{ left: `${avgPctVal}%` }}
          title={`Média: ${format(avgValue)}`}
        />
      </div>
      <div className="text-[10px] text-neutral-600">
        Média base: {format(avgValue)}
      </div>
    </div>
  );
}

function rankPosition(value: number, all: number[]): { rank: number; total: number; percentile: number } {
  const sorted = [...all].sort((a, b) => b - a);
  const rank = sorted.indexOf(value) + 1;
  const percentile = ((all.length - rank + 1) / all.length) * 100;
  return { rank, total: all.length, percentile };
}

export default function PerCampaignDashboard({ campaigns }: { campaigns: Campaign[] }) {
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? "");

  const campaign = campaigns.find((c) => c.id === selectedId) ?? campaigns[0];

  const averages = useMemo(
    () => ({
      open: avg(campaigns.map((c) => c.openRate)),
      ctor: avg(campaigns.map((c) => c.clickToOpenRate)),
      click: avg(campaigns.map((c) => c.clickRate)),
      conv: avg(campaigns.map((c) => c.conversionRate)),
      revPerRec: avg(campaigns.map((c) => c.revenuePerRecipient)),
      recipients: avg(campaigns.map((c) => c.recipients)),
      unsub: avg(campaigns.map((c) => c.unsubscribeRate)),
      aov: avg(campaigns.filter((c) => c.averageOrderValue > 0).map((c) => c.averageOrderValue)),
    }),
    [campaigns]
  );

  const ranks = useMemo(() => {
    if (!campaign) return null;
    return {
      open: rankPosition(campaign.openRate, campaigns.map((c) => c.openRate)),
      ctor: rankPosition(campaign.clickToOpenRate, campaigns.map((c) => c.clickToOpenRate)),
      conv: rankPosition(campaign.conversionRate, campaigns.map((c) => c.conversionRate)),
      revenue: rankPosition(campaign.conversionValue, campaigns.map((c) => c.conversionValue)),
    };
  }, [campaign, campaigns]);

  const maxes = useMemo(
    () => ({
      open: Math.max(...campaigns.map((c) => c.openRate)),
      ctor: Math.max(...campaigns.map((c) => c.clickToOpenRate)),
      click: Math.max(...campaigns.map((c) => c.clickRate)),
      conv: Math.max(...campaigns.map((c) => c.conversionRate)),
      revPerRec: Math.max(...campaigns.map((c) => c.revenuePerRecipient)),
    }),
    [campaigns]
  );

  const bestHour = useMemo(() => {
    const hourMap = new Map<number, number[]>();
    for (const c of campaigns) {
      if (!c.sendTime) continue;
      const h = new Date(c.sendTime).getHours();
      if (!hourMap.has(h)) hourMap.set(h, []);
      hourMap.get(h)!.push(c.openRate);
    }
    let best = { hour: 10, avgOpen: 0 };
    for (const [h, rates] of hourMap) {
      const a = avg(rates);
      if (a > best.avgOpen) best = { hour: h, avgOpen: a };
    }
    return best;
  }, [campaigns]);

  if (!campaign || !ranks) return null;

  const sendDate = campaign.sendTime
    ? new Date(campaign.sendTime).toLocaleDateString("pt-BR")
    : "—";
  const sendHour = campaign.sendTime
    ? new Date(campaign.sendTime).getHours()
    : null;

  const anomalies: string[] = [];
  if (campaign.openRate > averages.open * 1.3 && campaign.conversionRate === 0) {
    anomalies.push("Open rate alto mas conversão zero — problema provável no body/CTA");
  }
  if (campaign.clickToOpenRate > averages.ctor * 1.5) {
    anomalies.push("CTOR excepcionalmente alto — copy do body está convertendo muito bem");
  }
  if (campaign.unsubscribeRate > 0.005) {
    anomalies.push("Unsub acima do saudável — revisar frequência ou relevância para segmento");
  }
  if (sendHour !== null && Math.abs(sendHour - bestHour.hour) >= 3) {
    anomalies.push(`Enviada às ${sendHour}h — melhor horário histórico é ${bestHour.hour}h`);
  }

  const subjectProps = {
    emoji: hasEmoji(campaign.subject),
    number: hasNumber(campaign.subject),
    urgency: hasUrgency(campaign.subject),
    category: subjectCategory(campaign.subject),
    length: campaign.subject.length,
  };

  return (
    <div className="space-y-6">
      {/* Seletor */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">
          Campanha analisada
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · open {pct(c.openRate)}
            </option>
          ))}
        </select>
      </div>

      {/* Header da campanha */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">
              {campaign.audienceSegment || "Sem segmento identificado"} · {sendDate} {sendHour !== null && `· ${sendHour}h`}
            </p>
            <h2 className="text-xl font-bold text-white mb-2">{campaign.name}</h2>
            {campaign.subject && (
              <p className="text-base text-neutral-200 mb-1">
                <span className="text-neutral-500 text-xs uppercase mr-2">subject:</span>
                {campaign.subject}
              </p>
            )}
            {campaign.previewText && (
              <p className="text-sm text-neutral-400">
                <span className="text-neutral-600 text-xs uppercase mr-2">preview:</span>
                {campaign.previewText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs com delta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCell label="Open Rate" value={campaign.openRate} baseline={averages.open} format={(n) => pct(n)} />
        <KpiCell label="CTOR" value={campaign.clickToOpenRate} baseline={averages.ctor} format={(n) => pct(n)} />
        <KpiCell label="Click Rate" value={campaign.clickRate} baseline={averages.click} format={(n) => pct(n)} />
        <KpiCell label="Conv%" value={campaign.conversionRate} baseline={averages.conv} format={(n) => pct(n, 3)} />
        <KpiCell label="Rev / Rec" value={campaign.revenuePerRecipient} baseline={averages.revPerRec} format={(n) => `R$ ${n.toFixed(3)}`} />
        <KpiCell label="Unsub" value={campaign.unsubscribeRate} baseline={averages.unsub} format={(n) => pct(n, 2)} higherIsBetter={false} />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open Rate", rank: ranks.open },
          { label: "CTOR", rank: ranks.ctor },
          { label: "Conv%", rank: ranks.conv },
          { label: "Receita", rank: ranks.revenue },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-2">
              Ranking · {item.label}
            </p>
            <p className="text-2xl font-bold text-white">
              #{item.rank.rank}
              <span className="text-sm text-neutral-500 font-normal"> de {item.rank.total}</span>
            </p>
            <p className="text-xs text-violet-400 mt-1">
              Top {(100 - item.rank.percentile).toFixed(0)}%
            </p>
          </div>
        ))}
      </div>

      {/* Anomalias e insights */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/10 p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Observações sobre esta campanha
          </p>
          {anomalies.map((a, i) => (
            <div key={i} className="flex gap-2 text-sm text-neutral-300">
              <span className="text-amber-500 shrink-0">›</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comparação visual */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
          Comparação com a base (linha branca = média)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CompareBar label="Open Rate" campaignValue={campaign.openRate} avgValue={averages.open} format={pct} max={maxes.open} />
          <CompareBar label="CTOR" campaignValue={campaign.clickToOpenRate} avgValue={averages.ctor} format={pct} max={maxes.ctor} />
          <CompareBar label="Click Rate" campaignValue={campaign.clickRate} avgValue={averages.click} format={pct} max={maxes.click} />
          <CompareBar label="Conversão" campaignValue={campaign.conversionRate} avgValue={averages.conv} format={(n) => pct(n, 3)} max={maxes.conv} />
          <CompareBar label="Rev por destinatário" campaignValue={campaign.revenuePerRecipient} avgValue={averages.revPerRec} format={(n) => `R$ ${n.toFixed(3)}`} max={maxes.revPerRec} />
        </div>
      </div>

      {/* Subject breakdown + Horário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Propriedades do Subject
          </p>
          <div className="space-y-2">
            {[
              { label: "Emoji", value: subjectProps.emoji ? "Sim" : "Não" },
              { label: "Número", value: subjectProps.number ? "Sim" : "Não" },
              { label: "Urgência", value: subjectProps.urgency ? "Sim" : "Não" },
              {
                label: "Comprimento",
                value: `${subjectProps.length} chars (${
                  subjectProps.category === "short" ? "curto" : subjectProps.category === "medium" ? "médio" : "longo"
                })`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2"
              >
                <span className="text-xs text-neutral-400">{item.label}</span>
                <span className="text-xs font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Contexto de envio
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-xs text-neutral-400">Data de envio</span>
              <span className="text-xs font-semibold text-white">{sendDate}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-xs text-neutral-400">Horário desta campanha</span>
              <span className="text-xs font-semibold text-white">
                {sendHour !== null ? `${sendHour}h` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-xs text-neutral-400">Melhor horário histórico</span>
              <span className="text-xs font-semibold text-violet-400">
                {bestHour.hour}h ({pct(bestHour.avgOpen)} open)
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-xs text-neutral-400">Destinatários</span>
              <span className="text-xs font-semibold text-white">
                {campaign.recipients.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2">
              <span className="text-xs text-neutral-400">Receita total</span>
              <span className="text-xs font-semibold text-white">
                R$ {campaign.conversionValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
