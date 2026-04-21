"use client";

import type { FlowCreationResult } from "@/lib/klaviyo-flows";

export default function DeployPanel({
  status,
  result,
  error,
}: {
  status: "idle" | "deploying" | "done" | "error";
  result: FlowCreationResult | null;
  error: string | null;
}) {
  if (status === "idle") return null;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            status === "deploying"
              ? "bg-violet-400 animate-pulse"
              : status === "done"
              ? "bg-emerald-400"
              : "bg-red-400"
          }`}
        />
        <p className="text-sm font-semibold text-neutral-200">
          {status === "deploying" && "Criando flow no Klaviyo..."}
          {status === "done" && "Flow criado com sucesso!"}
          {status === "error" && "Erro ao criar flow"}
        </p>
      </div>

      {result && result.progress && (
        <div className="space-y-2">
          {result.progress.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-neutral-800/40 px-3 py-2"
            >
              <span className="w-4 shrink-0 text-center">
                {p.status === "done" && <span className="text-emerald-400">✓</span>}
                {p.status === "doing" && (
                  <span className="text-violet-400 animate-pulse">→</span>
                )}
                {p.status === "pending" && <span className="text-neutral-600">·</span>}
                {p.status === "error" && <span className="text-red-400">×</span>}
              </span>
              <span
                className={`text-xs ${
                  p.status === "done"
                    ? "text-emerald-300"
                    : p.status === "doing"
                    ? "text-violet-300"
                    : "text-neutral-400"
                }`}
              >
                {p.step}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
          <p className="text-sm text-red-300 whitespace-pre-wrap break-words">{error}</p>
        </div>
      )}

      {status === "done" && result && (
        <a
          href={result.flowUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Abrir no Klaviyo →
        </a>
      )}
    </div>
  );
}
