"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/app/api/analyze/route";
import type { GeneratedCopy } from "@/app/api/generate/route";

function CopyCard({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  const [copied, setCopied] = useState<number | null>(null);

  function copy(text: string, i: number) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-800/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
        {label}
      </p>
      {options.map((option, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-lg bg-neutral-900 px-4 py-3"
        >
          <p className="text-sm text-neutral-200 flex-1">{option}</p>
          <button
            onClick={() => copy(option, i)}
            className="shrink-0 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            {copied === i ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function GeneratePanel({
  analysis,
  onClose,
}: {
  analysis: AnalysisResult;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [copy, setCopy] = useState<GeneratedCopy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysis, brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na geração");
      setCopy(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function saveCopy() {
    if (!copy) return;
    setSaving(true);
    try {
      const res = await fetch("/api/copies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(copy),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold">Gerar Novo Copy</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              Baseado nos padrões dos top performers
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
          {/* Brief input */}
          {!copy && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-300">
                Sobre o que é esse email?
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Ex: Lançamento da calça chino bege premium, preço R$299, público clientes A+, foco em versatilidade e caimento perfeito para o trabalho e happy hour"
                rows={4}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:border-violet-500 focus:outline-none resize-none"
              />
              <button
                onClick={generate}
                disabled={loading || brief.trim().length < 10}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Gerando com Claude...
                  </>
                ) : (
                  "Gerar 3 subjects + 3 previews + body →"
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Resultado */}
          {copy && (
            <div className="space-y-4">
              <CopyCard label="3 Opções de Subject" options={copy.subjects} />
              <CopyCard label="3 Opções de Preview Text" options={copy.previews} />

              {/* Body */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-800/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                  Body do Email
                </p>
                <div className="rounded-lg bg-neutral-900 px-4 py-3">
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {copy.body}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCopy(null);
                    setSaved(false);
                    setBrief("");
                  }}
                  className="flex-1 rounded-xl border border-neutral-700 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  Gerar outro
                </button>
                <button
                  onClick={saveCopy}
                  disabled={saving || saved}
                  className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors"
                >
                  {saved ? "✓ Salvo no histórico" : saving ? "Salvando..." : "Salvar no histórico"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
