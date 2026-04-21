# Flow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema que analisa padrões históricos, gera copies de sequências de email com score estimado e cria o flow automaticamente no Klaviyo após aprovação.

**Architecture:** Página `/flow-builder` como client component com 3 etapas (config → review → deploy). Server-side: adapter Klaviyo para criação de flows via API + análise de padrões por tipo de sequência. Claude gera todos os copies do flow de uma vez mantendo consistência narrativa.

**Tech Stack:** Next.js 14, TypeScript, Tailwind 4, Klaviyo API v2026-04-15, Anthropic SDK (claude-sonnet-4-6)

---

## File Map

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/flow-patterns.ts` | Tipos + análise de padrões históricos por tipo de flow |
| `src/lib/klaviyo-flows.ts` | Adapter Klaviyo: criar flows, actions, messages |
| `src/lib/klaviyo.ts` | (Modify) Adicionar `getLists()` para listar segmentos |
| `src/app/api/flow-copy/route.ts` | POST — gera copies de todos os emails do flow |
| `src/app/api/create-klaviyo-flow/route.ts` | POST — cria flow no Klaviyo |
| `src/components/FlowConfig.tsx` | Etapa 1: tipo + trigger + estrutura |
| `src/components/EmailEditor.tsx` | Etapa 2: revisão de cada email |
| `src/components/DeployPanel.tsx` | Etapa 3: status de criação no Klaviyo |
| `src/components/FlowBuilder.tsx` | Client orquestrador — estado global |
| `src/app/flow-builder/page.tsx` | Página server — carrega listas + padrões |
| `src/app/page.tsx` | (Modify) Nav novo item "Flow Builder" |
| `src/app/historico/page.tsx` | (Modify) Nav novo item "Flow Builder" |

---

## Task 1: Tipos + análise de padrões históricos

**Files:**
- Create: `src/lib/flow-patterns.ts`

- [ ] **Step 1: Criar tipos base**

Criar `src/lib/flow-patterns.ts`:

```typescript
import type { Campaign } from "./klaviyo";

export type FlowType = "welcome" | "abandoned_cart" | "reengagement" | "custom";

export type EmailObjective =
  | "welcome"
  | "product"
  | "social_proof"
  | "urgency"
  | "reminder"
  | "reconnect"
  | "custom";

export type EmailBrief = {
  position: number;
  objective: EmailObjective;
  delay: number; // dias após email anterior (0 = imediato)
  customObjective?: string;
};

export type FlowBrief = {
  type: FlowType;
  name: string;
  triggerListId: string;
  triggerListName: string;
  segment: string;
  objective: string;
  emails: EmailBrief[];
};

export type CopyScore = {
  estimatedOpen: number;
  estimatedCtor: number;
  estimatedConv: number;
  confidence: "alta" | "média" | "baixa";
  similarCampaigns: number;
};

export type GeneratedEmail = {
  position: number;
  subject: string;
  previewText: string;
  body: string;
  score: CopyScore;
  rationale: string;
};

export type FlowPattern = {
  subjectStyle: string[];
  previewStyle: string[];
  bodyStructure: string[];
  idealDelays: number[];
  bestHour: number;
  topInsight: string;
  basedOn: number;
};

export const FLOW_TEMPLATES: Record<FlowType, EmailBrief[]> = {
  welcome: [
    { position: 1, delay: 0, objective: "welcome" },
    { position: 2, delay: 2, objective: "product" },
    { position: 3, delay: 5, objective: "social_proof" },
    { position: 4, delay: 7, objective: "urgency" },
  ],
  abandoned_cart: [
    { position: 1, delay: 0, objective: "reminder" },
    { position: 2, delay: 1, objective: "social_proof" },
    { position: 3, delay: 3, objective: "urgency" },
  ],
  reengagement: [
    { position: 1, delay: 0, objective: "reconnect" },
    { position: 2, delay: 3, objective: "product" },
    { position: 3, delay: 7, objective: "urgency" },
  ],
  custom: [],
};

export const OBJECTIVE_LABELS: Record<EmailObjective, string> = {
  welcome: "Boas-vindas",
  product: "Produto destaque",
  social_proof: "Prova social",
  urgency: "Urgência / Oferta final",
  reminder: "Lembrete",
  reconnect: "Reconexão",
  custom: "Personalizado",
};
```

- [ ] **Step 2: Adicionar função de análise de padrões**

Adicionar ao final de `src/lib/flow-patterns.ts`:

```typescript
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function analyzeFlowPatterns(
  campaigns: Campaign[],
  segment: string
): FlowPattern {
  const segmentCampaigns =
    segment && segment !== "all"
      ? campaigns.filter((c) => c.audienceSegment.includes(segment))
      : campaigns;

  const target = segmentCampaigns.length >= 3 ? segmentCampaigns : campaigns;

  const topByConv = [...target]
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);

  const topByOpen = [...target]
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 10);

  const hourMap = new Map<number, number[]>();
  for (const c of target) {
    if (!c.sendTime) continue;
    const h = new Date(c.sendTime).getHours();
    if (!hourMap.has(h)) hourMap.set(h, []);
    hourMap.get(h)!.push(c.openRate);
  }
  const hourEntries = Array.from(hourMap.entries()).map(([h, rates]) => ({
    hour: h,
    avgOpen: avg(rates),
  }));
  const bestHour =
    hourEntries.length > 0
      ? hourEntries.reduce((best, h) => (h.avgOpen > best.avgOpen ? h : best))
          .hour
      : 10;

  return {
    subjectStyle: topByOpen.slice(0, 5).map((c) => c.subject).filter(Boolean),
    previewStyle: topByOpen.slice(0, 5).map((c) => c.previewText).filter(Boolean),
    bodyStructure: topByConv.slice(0, 3).map((c) => c.name).filter(Boolean),
    idealDelays: [0, 2, 5, 7],
    bestHour,
    topInsight: `Baseado em ${target.length} campanhas ${segment && segment !== "all" ? `do segmento ${segment}` : "da base"}, com open médio ${(avg(target.map((c) => c.openRate)) * 100).toFixed(1)}%`,
    basedOn: target.length,
  };
}

export function estimateScore(
  pattern: FlowPattern,
  campaigns: Campaign[],
  segment: string
): CopyScore {
  const base =
    segment && segment !== "all"
      ? campaigns.filter((c) => c.audienceSegment.includes(segment))
      : campaigns;

  const sample = base.length >= 3 ? base : campaigns;
  const estimatedOpen = avg(sample.map((c) => c.openRate));
  const estimatedCtor = avg(sample.map((c) => c.clickToOpenRate));
  const estimatedConv = avg(sample.map((c) => c.conversionRate));

  return {
    estimatedOpen,
    estimatedCtor,
    estimatedConv,
    confidence: sample.length >= 10 ? "alta" : sample.length >= 5 ? "média" : "baixa",
    similarCampaigns: sample.length,
  };
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -10
```

Esperado: build passa limpo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/flow-patterns.ts
git commit -m "feat: tipos e análise de padrões para flow builder"
```

---

## Task 2: Adapter Klaviyo — listar listas de trigger

**Files:**
- Modify: `src/lib/klaviyo.ts`

- [ ] **Step 1: Adicionar função `getLists()` ao final do arquivo**

Adicionar ao final de `src/lib/klaviyo.ts`:

```typescript
export type KlaviyoList = {
  id: string;
  name: string;
  created: string;
};

export async function getLists(): Promise<KlaviyoList[]> {
  try {
    const data = await klaviyoFetch(
      `/lists/?fields[list]=name,created&sort=-created`
    );
    return (data.data ?? []).map((l: { id: string; attributes: { name: string; created: string } }) => ({
      id: l.id,
      name: l.attributes.name,
      created: l.attributes.created,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Testar localmente**

```bash
node --input-type=module << 'EOF'
process.loadEnvFile('.env');
const BASE_URL = "https://a.klaviyo.com/api";
const KEY = process.env.KLAVIYO_API_KEY;
const h = { Authorization: `Klaviyo-API-Key ${KEY}`, revision: "2026-04-15", accept: "application/json" };

const r = await fetch(`${BASE_URL}/lists/?fields[list]=name,created&sort=-created`, { headers: h });
const data = await r.json();
console.log("Listas:", data.data?.length);
data.data?.slice(0, 5).forEach(l => console.log(`  ${l.id}: ${l.attributes.name}`));
EOF
```

Esperado: retornar algumas listas com nome.

- [ ] **Step 3: Commit**

```bash
git add src/lib/klaviyo.ts
git commit -m "feat: klaviyo adapter — getLists() para trigger de flow"
```

---

## Task 3: Adapter Klaviyo — criação de flows

**Files:**
- Create: `src/lib/klaviyo-flows.ts`

- [ ] **Step 1: Criar arquivo com chamadas para criar flow**

Criar `src/lib/klaviyo-flows.ts`:

```typescript
import type { FlowBrief, GeneratedEmail } from "./flow-patterns";

const BASE_URL = "https://a.klaviyo.com/api";
const REVISION = "2026-04-15";
const FROM_EMAIL = "jbento@minimalclub.com.br";
const FROM_LABEL = "Minimal Club";

async function klaviyoPost(path: string, body: object): Promise<{ data: { id: string; type: string; attributes?: Record<string, unknown> } }> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) throw new Error("KLAVIYO_API_KEY não configurada");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: REVISION,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo POST ${path} ${res.status}: ${text}`);
  }

  return res.json();
}

export type FlowCreationProgress = {
  step: string;
  status: "pending" | "doing" | "done" | "error";
};

export type FlowCreationResult = {
  flowId: string;
  flowUrl: string;
  progress: FlowCreationProgress[];
};

export async function createKlaviyoFlow(
  brief: FlowBrief,
  emails: GeneratedEmail[]
): Promise<FlowCreationResult> {
  const progress: FlowCreationProgress[] = [
    { step: "Criando flow", status: "doing" },
    ...emails.map((e) => ({
      step: `Email ${e.position}: ${e.subject}`,
      status: "pending" as const,
    })),
  ];

  // 1. Criar o flow
  const flowRes = await klaviyoPost("/flows/", {
    data: {
      type: "flow",
      attributes: {
        name: `[ECI] ${brief.name}`,
        status: "draft",
      },
    },
  });

  const flowId = flowRes.data.id;
  progress[0].status = "done";

  // 2. Para cada email, criar action + message
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    progress[i + 1].status = "doing";

    try {
      const actionRes = await klaviyoPost(`/flow-actions/`, {
        data: {
          type: "flow-action",
          attributes: {
            action_type: "send-email",
            settings: {
              delay: {
                unit: "days",
                value: email.position === 1 ? 0 : emails[i].position > 1 ? email.position : 0,
              },
            },
          },
          relationships: {
            flow: { data: { type: "flow", id: flowId } },
          },
        },
      });

      await klaviyoPost("/flow-messages/", {
        data: {
          type: "flow-message",
          attributes: {
            name: `Email ${email.position}`,
            channel: "email",
            content: {
              subject: email.subject,
              preview_text: email.previewText,
              from_email: FROM_EMAIL,
              from_label: FROM_LABEL,
              reply_to_email: FROM_EMAIL,
            },
          },
          relationships: {
            "flow-action": { data: { type: "flow-action", id: actionRes.data.id } },
          },
        },
      });

      progress[i + 1].status = "done";
    } catch (e) {
      progress[i + 1].status = "error";
      throw e;
    }
  }

  return {
    flowId,
    flowUrl: `https://www.klaviyo.com/flow/${flowId}`,
    progress,
  };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/klaviyo-flows.ts
git commit -m "feat: adapter klaviyo-flows para criar flow + actions + messages"
```

---

## Task 4: API route — geração de copies do flow

**Files:**
- Create: `src/app/api/flow-copy/route.ts`

- [ ] **Step 1: Criar route handler**

Criar `src/app/api/flow-copy/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Campaign } from "@/lib/klaviyo";
import {
  FlowBrief,
  GeneratedEmail,
  FlowPattern,
  OBJECTIVE_LABELS,
  estimateScore,
  analyzeFlowPatterns,
} from "@/lib/flow-patterns";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const {
    brief,
    campaigns,
  }: { brief: FlowBrief; campaigns: Campaign[] } = await req.json();

  if (!brief || !brief.emails || brief.emails.length === 0) {
    return NextResponse.json({ error: "Brief incompleto" }, { status: 400 });
  }

  const pattern: FlowPattern = analyzeFlowPatterns(campaigns, brief.segment);

  const emailsList = brief.emails
    .map(
      (e) =>
        `Email ${e.position} (delay: ${e.delay}d, objetivo: ${e.customObjective ?? OBJECTIVE_LABELS[e.objective]})`
    )
    .join("\n");

  const prompt = `Você é um copywriter especialista em email marketing para e-commerce masculino premium brasileiro (Minimal Club).

Gere os copies de uma sequência de email (flow) do tipo "${brief.type}" para o segmento "${brief.segment}".

BRIEF GERAL:
- Nome do flow: ${brief.name}
- Objetivo geral: ${brief.objective}
- Segmento: ${brief.segment}

ESTRUTURA DOS EMAILS (gere UM copy para cada):
${emailsList}

PADRÕES HISTÓRICOS DA CONTA (use como referência):
- Subjects que performaram: ${pattern.subjectStyle.slice(0, 5).join(" | ")}
- Previews que performaram: ${pattern.previewStyle.slice(0, 5).join(" | ")}
- Insight: ${pattern.topInsight}
- Baseado em ${pattern.basedOn} campanhas históricas

REGRAS:
1. Cada email deve fazer sentido na sequência — não repita argumentos, progrida a narrativa
2. Email 1 abre o assunto, os seguintes aprofundam, o último fecha com urgência
3. Subjects devem seguir o tom dos históricos (conciso, direto, com número ou urgência real)
4. Body deve ser texto simples (com quebras de linha), máximo 300 palavras
5. Rationale deve justificar as escolhas com base nos padrões históricos

Responda APENAS com JSON válido, sem markdown:

{
  "emails": [
    {
      "position": 1,
      "subject": "...",
      "previewText": "...",
      "body": "...",
      "rationale": "por que essas escolhas, citando padrão histórico específico"
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Resposta inesperada");

    const parsed = JSON.parse(content.text) as {
      emails: Array<{
        position: number;
        subject: string;
        previewText: string;
        body: string;
        rationale: string;
      }>;
    };

    const baseScore = estimateScore(pattern, campaigns, brief.segment);

    const emails: GeneratedEmail[] = parsed.emails.map((e) => ({
      position: e.position,
      subject: e.subject,
      previewText: e.previewText,
      body: e.body,
      rationale: e.rationale,
      score: baseScore,
    }));

    return NextResponse.json({ emails });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro na geração: ${msg}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/flow-copy/route.ts
git commit -m "feat: api /flow-copy — gera copies de todos os emails do flow"
```

---

## Task 5: API route — criar flow no Klaviyo

**Files:**
- Create: `src/app/api/create-klaviyo-flow/route.ts`

- [ ] **Step 1: Criar route handler**

Criar `src/app/api/create-klaviyo-flow/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createKlaviyoFlow } from "@/lib/klaviyo-flows";
import type { FlowBrief, GeneratedEmail } from "@/lib/flow-patterns";

export async function POST(req: NextRequest) {
  const {
    brief,
    emails,
  }: { brief: FlowBrief; emails: GeneratedEmail[] } = await req.json();

  if (!brief || !emails || emails.length === 0) {
    return NextResponse.json(
      { error: "Brief ou emails ausentes" },
      { status: 400 }
    );
  }

  try {
    const result = await createKlaviyoFlow(brief, emails);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro ao criar flow: ${msg}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build 2>&1 | tail -10 && git add src/app/api/create-klaviyo-flow/route.ts && git commit -m "feat: api /create-klaviyo-flow — cria flow completo no Klaviyo"
```

---

## Task 6: Componente FlowConfig — etapa 1 do builder

**Files:**
- Create: `src/components/FlowConfig.tsx`

- [ ] **Step 1: Criar componente**

Criar `src/components/FlowConfig.tsx`:

```typescript
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
    setEmails(FLOW_TEMPLATES[t].length > 0 ? FLOW_TEMPLATES[t] : [{ position: 1, delay: 0, objective: "custom" }]);
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
    const next = emails.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, position: idx + 1 }));
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
      {/* Tipo de flow */}
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

      {/* Nome */}
      <div>
        <label className="text-sm font-medium text-neutral-300 mb-2 block">Nome do flow</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Welcome Series — CLIENTES A+ Abril 2026"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Trigger + Segmento */}
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

      {/* Objetivo */}
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

      {/* Estrutura de emails */}
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
                  onChange={(e) => updateEmail(i, "delay", parseInt(e.target.value, 10))}
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

      {/* CTA */}
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
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build 2>&1 | tail -10 && git add src/components/FlowConfig.tsx && git commit -m "feat: componente FlowConfig — etapa 1 do flow builder"
```

---

## Task 7: Componente EmailEditor — etapa 2 do builder

**Files:**
- Create: `src/components/EmailEditor.tsx`

- [ ] **Step 1: Criar componente**

Criar `src/components/EmailEditor.tsx`:

```typescript
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
  const [statuses, setStatuses] = useState<EmailStatus[]>(initialEmails.map(() => "pending"));
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
              {/* Header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-violet-400 shrink-0">#{email.position}</span>
                  <span className="text-sm font-medium text-white truncate">{email.subject}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {status === "approved" && <span className="text-xs text-emerald-400">✓ aprovado</span>}
                  <span className="text-xs text-neutral-500">{isExpanded ? "−" : "+"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 py-4 border-t border-neutral-800 space-y-4">
                  {/* Score */}
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

                  {/* Campos editáveis */}
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

                  {/* Rationale */}
                  <div className="rounded-lg border border-violet-800/40 bg-violet-950/10 p-3">
                    <p className="text-[10px] font-semibold text-violet-300 uppercase mb-1">Justificativa</p>
                    <p className="text-xs text-neutral-300">{email.rationale}</p>
                  </div>

                  {/* Actions */}
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

      {/* Deploy CTA */}
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
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build 2>&1 | tail -10 && git add src/components/EmailEditor.tsx && git commit -m "feat: componente EmailEditor — revisão e aprovação de emails do flow"
```

---

## Task 8: Componente DeployPanel — etapa 3 do builder

**Files:**
- Create: `src/components/DeployPanel.tsx`

- [ ] **Step 1: Criar componente**

Criar `src/components/DeployPanel.tsx`:

```typescript
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
                {p.status === "doing" && <span className="text-violet-400 animate-pulse">→</span>}
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
          <p className="text-sm text-red-300">{error}</p>
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
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build 2>&1 | tail -10 && git add src/components/DeployPanel.tsx && git commit -m "feat: componente DeployPanel — status de criação no Klaviyo"
```

---

## Task 9: FlowBuilder — orquestrador principal

**Files:**
- Create: `src/components/FlowBuilder.tsx`

- [ ] **Step 1: Criar componente orquestrador**

Criar `src/components/FlowBuilder.tsx`:

```typescript
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
      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-2 ${stage === "config" ? "text-violet-400" : "text-neutral-500"}`}>
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">1</span>
          <span>Configurar</span>
        </div>
        <div className="h-px flex-1 bg-neutral-800" />
        <div className={`flex items-center gap-2 ${stage === "review" || stage === "generating" ? "text-violet-400" : "text-neutral-500"}`}>
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">2</span>
          <span>Revisar</span>
        </div>
        <div className="h-px flex-1 bg-neutral-800" />
        <div className={`flex items-center gap-2 ${stage === "deploying" || stage === "done" ? "text-violet-400" : "text-neutral-500"}`}>
          <span className="h-5 w-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold">3</span>
          <span>Publicar</span>
        </div>
      </div>

      {error && stage === "config" && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {stage === "config" && (
        <FlowConfig lists={lists} segments={segments} onSubmit={handleConfigSubmit} />
      )}

      {stage === "generating" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-12 text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium text-neutral-200">Gerando copies com Claude...</p>
          <p className="text-xs text-neutral-500 mt-1">Pode levar alguns segundos</p>
        </div>
      )}

      {stage === "review" && (
        <EmailEditor emails={emails} onAllApproved={handleApproved} />
      )}

      {(stage === "deploying" || stage === "done" || stage === "error") && (
        <>
          <DeployPanel
            status={stage === "deploying" ? "deploying" : stage === "done" ? "done" : "error"}
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
```

- [ ] **Step 2: Build check + commit**

```bash
npm run build 2>&1 | tail -10 && git add src/components/FlowBuilder.tsx && git commit -m "feat: FlowBuilder — orquestrador com 3 etapas (config, review, deploy)"
```

---

## Task 10: Página `/flow-builder`

**Files:**
- Create: `src/app/flow-builder/page.tsx`

- [ ] **Step 1: Criar página server component**

Criar `src/app/flow-builder/page.tsx`:

```typescript
import { getCampaigns, getLists } from "@/lib/klaviyo";
import FlowBuilder from "@/components/FlowBuilder";

export const dynamic = "force-dynamic";

export default async function FlowBuilderPage() {
  let error: string | null = null;

  const [campaigns, lists] = await Promise.all([
    getCampaigns(30).catch((e) => {
      error = e instanceof Error ? e.message : "Erro ao carregar campanhas";
      return [];
    }),
    getLists().catch(() => []),
  ]);

  const segments = Array.from(
    new Set(campaigns.map((c) => c.audienceSegment).filter(Boolean))
  ).sort();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              Minimal Club · Flow Builder
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Flow no Klaviyo</h1>
          <p className="mt-2 text-neutral-400">
            Monte a sequência, a IA gera os copies baseados nos padrões históricos,
            e o flow é criado automaticamente no Klaviyo após aprovação.
          </p>
        </div>

        {/* Nav */}
        <div className="flex gap-1">
          <a href="/" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            Dashboard
          </a>
          <a href="/flow-builder" className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white">
            Flow Builder
          </a>
          <a href="/historico" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            Histórico
          </a>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-red-300">
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        ) : lists.length === 0 ? (
          <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-6 text-yellow-300">
            <p className="font-medium">Nenhuma lista encontrada no Klaviyo</p>
            <p className="text-sm mt-1 text-yellow-400">
              Crie uma lista no Klaviyo para usá-la como trigger do flow.
            </p>
          </div>
        ) : (
          <FlowBuilder lists={lists} segments={segments} campaigns={campaigns} />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -15
```

Esperado: build passa, rota `/flow-builder` aparece como Dynamic.

- [ ] **Step 3: Commit**

```bash
git add src/app/flow-builder/page.tsx
git commit -m "feat: página /flow-builder — server component carrega listas + campanhas"
```

---

## Task 11: Adicionar Flow Builder ao nav das outras páginas

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/historico/page.tsx`

- [ ] **Step 1: Atualizar nav em `src/app/page.tsx`**

Localizar o bloco `{/* Nav */}` e substituir o conteúdo do `<div className="flex gap-1">`:

```typescript
        <div className="flex gap-1">
          <a href="/" className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white">
            Dashboard
          </a>
          <a href="/flow-builder" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            Flow Builder
          </a>
          <a href="/historico" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            Histórico de Copies
          </a>
        </div>
```

- [ ] **Step 2: Atualizar nav em `src/app/historico/page.tsx`**

Localizar o bloco `{/* Nav */}` e substituir:

```typescript
        <div className="flex gap-1 mb-8">
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/flow-builder"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Flow Builder
          </a>
          <a
            href="/historico"
            className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white"
          >
            Histórico de Copies
          </a>
        </div>
```

- [ ] **Step 3: Build + commit + push**

```bash
npm run build 2>&1 | tail -10 && git add src/app/page.tsx src/app/historico/page.tsx && git commit -m "feat: adiciona Flow Builder à navegação de todas as páginas" && git push
```

---

## Smoke Test Final

Após deploy automático na Vercel (~1 min):

- [ ] Acessar `/flow-builder` na Vercel carrega página sem erro
- [ ] Lista de listas do Klaviyo aparece no dropdown de trigger
- [ ] Selecionar "Welcome Series" preenche 4 emails automaticamente
- [ ] Preencher nome + objetivo + clicar "Gerar copies" chama Claude e retorna 4 emails
- [ ] Cada email mostra subject, preview, body, score estimado e rationale
- [ ] Aprovar todos → botão "Criar flow no Klaviyo" fica habilitado
- [ ] Clicar "Criar flow" → status em tempo real aparece
- [ ] Flow aparece criado em draft no Klaviyo
- [ ] Link direto para o Klaviyo funciona

---

## Tratamento de falhas conhecidas

Se a API do Klaviyo retornar erro no endpoint `/flows/` (schema pode variar), o erro será exibido no DeployPanel com a mensagem da API. Nesse caso:

1. Verificar o erro exato no console de Runtime Logs da Vercel
2. Ajustar o payload em `src/lib/klaviyo-flows.ts` conforme retorno da API
3. Redeployar

O adapter está isolado em `src/lib/klaviyo-flows.ts` — toda a lógica de payload está em um único arquivo, facilitando ajustes.
