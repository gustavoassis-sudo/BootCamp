"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/klaviyo";
import type { AnalysisResult } from "@/app/api/analyze/route";
import GeneratePanel from "./GeneratePanel";

export default function AnalyzePanel({
  campaigns,
  onClose,
}: {
  campaigns: Campaign[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaigns }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na análise");
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold">Análise de Padrões</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""} selecionada{campaigns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Campanhas selecionadas */}
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium text-neutral-200 line-clamp-1">
                    {c.subject || c.name}
                  </div>
                  {c.previewText && (
                    <div className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                      {c.previewText}
                    </div>
                  )}
                </div>
                <div className="text-xs text-emerald-400 font-medium shrink-0 ml-4">
                  {(c.openRate * 100).toFixed(1)}% open
                </div>
              </div>
            ))}
          </div>

          {/* CTA analisar */}
          {!analysis && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analisando com Claude...
                </>
              ) : (
                "Analisar padrões com Claude →"
              )}
            </button>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Resultado da análise */}
          {analysis && (
            <div className="space-y-5">
              <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
                <p className="text-sm font-semibold text-violet-300 mb-1">
                  Principal Insight
                </p>
                <p className="text-neutral-200">{analysis.topInsight}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: "Padrões em Subject", items: analysis.subjectPatterns },
                  { label: "Padrões em Preview", items: analysis.previewPatterns },
                  { label: "Padrões no Body", items: analysis.bodyPatterns },
                ].map(({ label, items }) => (
                  <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-800/30 p-4">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                      {label}
                    </p>
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-neutral-300">
                          <span className="text-violet-500 shrink-0">›</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setGenerating(true)}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Gerar novo copy com esses padrões →
              </button>
            </div>
          )}
        </div>
      </div>

      {generating && analysis && (
        <GeneratePanel
          analysis={analysis}
          onClose={() => setGenerating(false)}
        />
      )}
    </div>
  );
}
