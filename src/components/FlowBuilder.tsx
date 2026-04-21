"use client";

import { useState } from "react";
import type { Campaign, KlaviyoList } from "@/lib/klaviyo";
import type { FlowBrief, GeneratedEmail } from "@/lib/flow-patterns";
import type { FlowCreationResult } from "@/lib/klaviyo-flows";
import FlowConfig from "./FlowConfig";
import EmailEditor from "./EmailEditor";
import DeployPanel from "./DeployPanel";

type Stage = "config" | "generating" | "review" | "deploying" | "done" | "error";

export default function FlowBuilder({
  lists,
  segments,
  campaigns,
}: {
  lists: KlaviyoList[];
  segments: string[];
  campaigns: Campaign[];
}) {
  const [stage, setStage] = useState<Stage>("config");
  const [brief, setBrief] = useState<FlowBrief | null>(null);
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [result, setResult] = useState<FlowCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfigSubmit(newBrief: FlowBrief) {
    setBrief(newBrief);
    setStage("generating");
    setError(null);

    try {
      const res = await fetch("/api/flow-copy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: newBrief, campaigns }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");

      setEmails(data.emails);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na geração");
      setStage("config");
    }
  }

  async function handleApproved(approvedEmails: GeneratedEmail[]) {
    if (!brief) return;
    setStage("deploying");
    setError(null);

    try {
      const res = await fetch("/api/create-klaviyo-flow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief, emails: approvedEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");

      setResult(data);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar flow");
      setStage("error");
    }
  }

  function reset() {
    setStage("config");
    setBrief(null);
    setEmails([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs">
        <div
          className={`flex items-center gap-2 ${
            stage === "config" ? "text-violet-400" : "text-neutral-500"
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">
            1
          </span>
          <span>Configurar</span>
        </div>
        <div className="h-px flex-1 bg-neutral-800" />
        <div
          className={`flex items-center gap-2 ${
            stage === "review" || stage === "generating"
              ? "text-violet-400"
              : "text-neutral-500"
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">
            2
          </span>
          <span>Revisar</span>
        </div>
        <div className="h-px flex-1 bg-neutral-800" />
        <div
          className={`flex items-center gap-2 ${
            stage === "deploying" || stage === "done"
              ? "text-violet-400"
              : "text-neutral-500"
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">
            3
          </span>
          <span>Publicar</span>
        </div>
      </div>

      {error && stage === "config" && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {stage === "config" && (
        <FlowConfig
          lists={lists}
          segments={segments}
          onSubmit={handleConfigSubmit}
        />
      )}

      {stage === "generating" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-12 text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium text-neutral-200">
            Gerando copies com Claude...
          </p>
          <p className="text-xs text-neutral-500 mt-1">Pode levar alguns segundos</p>
        </div>
      )}

      {stage === "review" && (
        <EmailEditor emails={emails} onAllApproved={handleApproved} />
      )}

      {(stage === "deploying" || stage === "done" || stage === "error") && (
        <>
          <DeployPanel
            status={
              stage === "deploying"
                ? "deploying"
                : stage === "done"
                ? "done"
                : "error"
            }
            result={result}
            error={error}
          />
          {(stage === "done" || stage === "error") && (
            <button
              onClick={reset}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Criar outro flow
            </button>
          )}
        </>
      )}
    </div>
  );
}
