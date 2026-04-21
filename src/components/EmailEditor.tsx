"use client";

import { useState } from "react";
import type { GeneratedEmail } from "@/lib/flow-patterns";

type EmailStatus = "pending" | "approved" | "editing";

function pct(n: number, d = 1) {
  return (n * 100).toFixed(d) + "%";
}

export default function EmailEditor({
  emails: initialEmails,
  onAllApproved,
}: {
  emails: GeneratedEmail[];
  onAllApproved: (emails: GeneratedEmail[]) => void;
}) {
  const [emails, setEmails] = useState<GeneratedEmail[]>(initialEmails);
  const [statuses, setStatuses] = useState<EmailStatus[]>(
    initialEmails.map(() => "pending")
  );
  const [expanded, setExpanded] = useState<number | null>(0);

  function updateStatus(i: number, status: EmailStatus) {
    const next = [...statuses];
    next[i] = status;
    setStatuses(next);
  }

  function updateEmail(i: number, field: keyof GeneratedEmail, value: string) {
    const next = [...emails];
    (next[i] as Record<string, unknown>)[field] = value;
    setEmails(next);
  }

  const allApproved = statuses.every((s) => s === "approved");

  function handleDeploy() {
    if (allApproved) onAllApproved(emails);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
          Revisão dos Copies ({statuses.filter((s) => s === "approved").length}/{emails.length} aprovados)
        </h2>
      </div>

      <div className="space-y-3">
        {emails.map((email, i) => {
          const status = statuses[i];
          const isExpanded = expanded === i;

          return (
            <div
              key={i}
              className={`rounded-xl border overflow-hidden ${
                status === "approved"
                  ? "border-emerald-800/50 bg-emerald-950/10"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-violet-400 shrink-0">
                    #{email.position}
                  </span>
                  <span className="text-sm font-medium text-white truncate">
                    {email.subject}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {status === "approved" && (
                    <span className="text-xs text-emerald-400">✓ aprovado</span>
                  )}
                  <span className="text-xs text-neutral-500">
                    {isExpanded ? "−" : "+"}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 py-4 border-t border-neutral-800 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-neutral-800/60 p-3">
                      <p className="text-[10px] text-neutral-500 uppercase">Open estimado</p>
                      <p className="text-sm font-bold text-white">{pct(email.score.estimatedOpen)}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 p-3">
                      <p className="text-[10px] text-neutral-500 uppercase">CTOR estimado</p>
                      <p className="text-sm font-bold text-white">{pct(email.score.estimatedCtor)}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 p-3">
                      <p className="text-[10px] text-neutral-500 uppercase">Conv estimada</p>
                      <p className="text-sm font-bold text-white">{pct(email.score.estimatedConv, 3)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Confiança: <span className="text-white">{email.score.confidence}</span> ·
                    baseado em {email.score.similarCampaigns} campanhas similares
                  </p>

                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase">Subject</label>
                    <input
                      value={email.subject}
                      onChange={(e) => updateEmail(i, "subject", e.target.value)}
                      className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase">Preview Text</label>
                    <input
                      value={email.previewText}
                      onChange={(e) => updateEmail(i, "previewText", e.target.value)}
                      className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase">Body</label>
                    <textarea
                      value={email.body}
                      onChange={(e) => updateEmail(i, "body", e.target.value)}
                      rows={10}
                      className="w-full mt-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 whitespace-pre-wrap"
                    />
                  </div>

                  <div className="rounded-lg border border-violet-800/40 bg-violet-950/10 p-3">
                    <p className="text-[10px] font-semibold text-violet-300 uppercase mb-1">
                      Justificativa
                    </p>
                    <p className="text-xs text-neutral-300">{email.rationale}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {status !== "approved" ? (
                      <button
                        onClick={() => updateStatus(i, "approved")}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                      >
                        Aprovar email
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(i, "pending")}
                        className="flex-1 rounded-lg bg-neutral-800 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition-colors"
                      >
                        Cancelar aprovação
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleDeploy}
        disabled={!allApproved}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {allApproved
          ? "Criar flow no Klaviyo →"
          : `Aprove todos os emails (${statuses.filter((s) => s === "approved").length}/${emails.length})`}
      </button>
    </div>
  );
}
