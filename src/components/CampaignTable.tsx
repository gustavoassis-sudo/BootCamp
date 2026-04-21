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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  }

  const selectedCampaigns = campaigns.filter((c) => selected.has(c.id));

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          {campaigns.length} campanhas · ordenadas por Open Rate
        </p>
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
              <th className="px-4 py-3 text-left font-medium text-neutral-400">
                Campanha
              </th>
              <th className="px-4 py-3 text-left font-medium text-neutral-400 hidden md:table-cell">
                Subject
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400">
                Open
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400">
                Click
              </th>
              <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden lg:table-cell">
                Rev/Rec
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {campaigns.map((c, i) => {
              const isSelected = selected.has(c.id);
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
                        <svg
                          viewBox="0 0 16 16"
                          className="fill-white"
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-600 w-5 shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-medium text-neutral-100 line-clamp-1">
                          {c.name}
                        </div>
                        {c.sendTime && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {new Date(c.sendTime).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-neutral-300 line-clamp-1">
                      {c.subject || (
                        <span className="text-neutral-600 italic">
                          sem subject
                        </span>
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
                  <td className="px-4 py-3">
                    <MetricBadge value={pct(c.clickRate)} label="click" />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <MetricBadge
                      value={currency(c.revenuePerRecipient)}
                      label="rev/rec"
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
