"use client";

import { useState } from "react";
import type { KlaviyoList } from "@/lib/klaviyo";
import {
  FlowBrief,
  FlowType,
  EmailBrief,
  EmailObjective,
  FLOW_TEMPLATES,
  OBJECTIVE_LABELS,
} from "@/lib/flow-patterns";

const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  welcome: "Welcome Series",
  abandoned_cart: "Carrinho Abandonado",
  reengagement: "Reengajamento",
  custom: "Personalizado",
};

export default function FlowConfig({
  lists,
  segments,
  onSubmit,
}: {
  lists: KlaviyoList[];
  segments: string[];
  onSubmit: (brief: FlowBrief) => void;
}) {
  const [type, setType] = useState<FlowType>("welcome");
  const [name, setName] = useState("");
  const [triggerListId, setTriggerListId] = useState(lists[0]?.id ?? "");
  const [segment, setSegment] = useState(segments[0] ?? "all");
  const [objective, setObjective] = useState("");
  const [emails, setEmails] = useState<EmailBrief[]>(FLOW_TEMPLATES.welcome);

  function handleTypeChange(t: FlowType) {
    setType(t);
    setEmails(
      FLOW_TEMPLATES[t].length > 0
        ? FLOW_TEMPLATES[t]
        : [{ position: 1, delay: 0, objective: "custom" }]
    );
  }

  function updateEmail(i: number, field: keyof EmailBrief, value: unknown) {
    const next = [...emails];
    (next[i] as Record<string, unknown>)[field] = value;
    setEmails(next);
  }

  function addEmail() {
    setEmails([
      ...emails,
      { position: emails.length + 1, delay: 2, objective: "custom" },
    ]);
  }

  function removeEmail(i: number) {
    const next = emails
      .filter((_, idx) => idx !== i)
      .map((e, idx) => ({ ...e, position: idx + 1 }));
    setEmails(next);
  }

  function handleSubmit() {
    const list = lists.find((l) => l.id === triggerListId);
    if (!list || !name || !objective || emails.length === 0) return;

    onSubmit({
      type,
      name,
      triggerListId,
      triggerListName: list.name,
      segment,
      objective,
      emails,
    });
  }

  const canSubmit = name && triggerListId && objective && emails.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-300 mb-2 block">Tipo de flow</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(FLOW_TYPE_LABELS) as FlowType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                type === t
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {FLOW_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-300 mb-2 block">Nome do flow</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Welcome Series — CLIENTES A+ Abril 2026"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-300 mb-2 block">Trigger (lista no Klaviyo)</label>
          <select
            value={triggerListId}
            onChange={(e) => setTriggerListId(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-300 mb-2 block">Segmento de referência</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="all">Toda a base</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-300 mb-2 block">Objetivo geral do flow</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Ex: Apresentar a marca e gerar primeira compra em até 7 dias para novos inscritos CLIENTES A+"
          rows={2}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-neutral-300">Sequência de emails</label>
          <button
            onClick={addEmail}
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            + Adicionar email
          </button>
        </div>
        <div className="space-y-2">
          {emails.map((email, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-neutral-800/60 border border-neutral-700 p-3"
            >
              <span className="text-xs font-bold text-violet-400 w-10 shrink-0">#{email.position}</span>
              <select
                value={email.objective}
                onChange={(e) =>
                  updateEmail(i, "objective", e.target.value as EmailObjective)
                }
                className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                {(Object.keys(OBJECTIVE_LABELS) as EmailObjective[]).map((o) => (
                  <option key={o} value={o}>
                    {OBJECTIVE_LABELS[o]}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={email.delay}
                  min={0}
                  max={30}
                  onChange={(e) =>
                    updateEmail(i, "delay", parseInt(e.target.value, 10))
                  }
                  className="w-16 rounded bg-neutral-900 border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-neutral-500">dias</span>
              </div>
              {emails.length > 1 && (
                <button
                  onClick={() => removeEmail(i)}
                  className="text-neutral-600 hover:text-red-400 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Gerar copies com Claude →
      </button>
    </div>
  );
}
