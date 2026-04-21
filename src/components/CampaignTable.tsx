"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/klaviyo";
import AnalyzePanel from "./AnalyzePanel";

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

function currency(n: number) {
  return n > 0 ? `R$ ${n.toFixed(2)}` : "—";
}

function fmtRecipients(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

function getOutlierBadges(c: Campaign, campaigns: Campaign[]): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  const avgCtor = campaigns.reduce((s, x) => s + x.clickToOpenRate, 0) / campaigns.length;
  const maxConvValue = Math.max(...campaigns.map((x) => x.conversionValue));

  if (c.clickToOpenRate > avgCtor * 1.5) badges.push({ label: "CTOR alto", color: "text-orange-400 bg-orange-950/40 border-orange-800/50" });
  if (c.unsubscribeRate > 0.005) badges.push({ label: "Unsub alto", color: "text-yellow-400 bg-yellow-950/40 border-yellow-800/50" });
  if (c.openRate > 0.5 && c.conversionRate === 0) badges.push({ label: "Sem conv", color: "text-red-400 bg-red-950/40 border-red-800/50" });
  if (c.conversionValue > 0 && c.conversionValue === maxConvValue) badges.push({ label: "Top ROI", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" });
  return badges;
}

type FilterType = "all" | "conversion" | "ctor" | "unsub";

function MetricBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

export default function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  }

  const selectedCampaigns = campaigns.filter((c) => selected.has(c.id));

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === "conversion") return c.conversionRate > 0;
    if (filter === "ctor") {
      const avg = campaigns.reduce((s, x) => s + x.clickToOpenRate, 0) / campaigns.length;
      return c.clickToOpenRate > avg;
    }
    if (filter === "unsub") return c.unsubscribeRate > 0.005;
    return true;
  });

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 p-12 text-center text-neutral-500">
        Nenhuma campanha enviada encontrada nos últimos 90 dias.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "conversion", "ctor", "unsub"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {f === "all" && "Todos"}
              {f === "conversion" && "Alta Conversão"}
              {f === "ctor" && "Alto CTOR"}
              {f === "unsub" && "Risco Unsub"}
            </button>
          ))}
          <span className="text-xs text-neutral-500">
            {filteredCampaigns.length} campanhas · ordenadas por Open Rate
          </span>
        </div>
        <button
          onClick={() => setAnalyzing(true)}
          disabled={selected.size === 0}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>Analisar selecionadas</span>
          {selected.size > 0 && (
            <span className="rounded-full bg-violet-500 px-2 py-0.5 text-xs">
              {selected.size}
            </span>
          )}
        </button>
      </div>

      {/* Hint */}
      {selected.size === 0 && (
        <p className="text-xs text-neutral-600">
          Selecione até 10 campanhas para analisar padrões com Claude →
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 text-left font-medium text-neutral-400">Campanha</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400 hidden md:table-cell">Subject</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400">Open</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden sm:table-cell">CTOR</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden lg:table-cell">Conv%</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden lg:table-cell">Rev/Rec</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden xl:table-cell">Recips</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden xl:table-cell">Unsub%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredCampaigns.map((c, i) => {
              const isSelected = selected.has(c.id);
              const badges = getOutlierBadges(c, campaigns);
              const sendHour = c.sendTime
                ? new Date(c.sendTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : null;
              return (
                <tr
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-violet-950/30 hover:bg-violet-950/40"
                      : "hover:bg-neutral-900/60"
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <div
                      className={`h-4 w-4 rounded border mx-auto transition-colors ${
                        isSelected
                          ? "border-violet-500 bg-violet-600"
                          : "border-neutral-700"
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" className="fill-white">
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-neutral-600 w-5 shrink-0 mt-0.5">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-neutral-100 line-clamp-1">{c.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.sendTime && (
                            <span className="text-xs text-neutral-500">
                              {new Date(c.sendTime).toLocaleDateString("pt-BR")} {sendHour}
                            </span>
                          )}
                          {c.audienceSegment && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                              {c.audienceSegment}
                            </span>
                          )}
                          {badges.map((b) => (
                            <span
                              key={b.label}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${b.color}`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-neutral-300 line-clamp-1">
                      {c.subject || (
                        <span className="text-neutral-600 italic">sem subject</span>
                      )}
                    </div>
                    {c.previewText && (
                      <div className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                        {c.previewText}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MetricBadge value={pct(c.openRate)} label="open" />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <MetricBadge value={pct(c.clickToOpenRate)} label="ctor" />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <MetricBadge
                      value={c.conversionRate > 0 ? pct(c.conversionRate) : "—"}
                      label="conv%"
                    />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <MetricBadge
                      value={c.revenuePerRecipient > 0 ? `R$${c.revenuePerRecipient.toFixed(2)}` : "—"}
                      label="rev/rec"
                    />
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <MetricBadge
                      value={c.recipients > 0 ? fmtRecipients(c.recipients) : "—"}
                      label="recips"
                    />
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <MetricBadge
                      value={c.unsubscribeRate > 0 ? pct(c.unsubscribeRate) : "—"}
                      label="unsub%"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Analyze panel */}
      {analyzing && (
        <AnalyzePanel
          campaigns={selectedCampaigns}
          onClose={() => setAnalyzing(false)}
        />
      )}
    </div>
  );
}
