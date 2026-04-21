# Email Copy Intelligence v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriquecer o pipeline completo (dados → dashboard → análise Claude → geração) com todas as métricas disponíveis da Klaviyo, entregando insights quantitativos e correlações ocultas.

**Architecture:** Expande o tipo `Campaign` com 8 novos campos, atualiza a query de métricas em uma única chamada, enriquece o dashboard com colunas/badges/filtros e aprofunda o prompt do Claude com dados quantitativos e instruções para encontrar correlações não óbvias.

**Tech Stack:** Next.js 14, TypeScript, Tailwind 4, Klaviyo API v2026-04-15, Anthropic SDK (claude-sonnet-4-6), Vitest

---

## File Map

| Arquivo | Mudança |
|---------|---------|
| `src/lib/klaviyo.ts` | Tipo Campaign + 8 campos, query de métricas expandida |
| `src/lib/klaviyo.test.ts` | Testes atualizados para novos campos |
| `src/components/CampaignTable.tsx` | Colunas, badges outlier, filtros, segmento |
| `src/app/api/analyze/route.ts` | Tipo AnalysisResult + 3 seções, prompt enriquecido |
| `src/components/AnalyzePanel.tsx` | 3 novas seções visuais na análise |
| `src/app/api/generate/route.ts` | Prompt enriquecido com hiddenPatterns |

---

## Task 1: Expandir tipo Campaign e query de métricas

**Files:**
- Modify: `src/lib/klaviyo.ts`
- Modify: `src/lib/klaviyo.test.ts`

- [ ] **Step 1: Atualizar o tipo Campaign**

Em `src/lib/klaviyo.ts`, substituir o tipo `Campaign` existente:

```typescript
export type Campaign = {
  id: string;
  name: string;
  status: string;
  sendTime: string;
  subject: string;
  previewText: string;
  audienceSegment: string;
  // métricas básicas
  openRate: number;
  clickRate: number;
  revenuePerRecipient: number;
  recipients: number;
  // métricas de engajamento
  clickToOpenRate: number;
  // métricas de conversão
  conversionRate: number;
  conversionValue: number;
  averageOrderValue: number;
  // métricas de saúde
  unsubscribeRate: number;
  spamComplaintRate: number;
};
```

- [ ] **Step 2: Atualizar o tipo MetricsMap**

Substituir `MetricsMap` em `src/lib/klaviyo.ts`:

```typescript
type MetricsMap = Record<
  string,
  {
    openRate: number;
    clickRate: number;
    revenuePerRecipient: number;
    recipients: number;
    clickToOpenRate: number;
    conversionRate: number;
    conversionValue: number;
    averageOrderValue: number;
    unsubscribeRate: number;
    spamComplaintRate: number;
  }
>;
```

- [ ] **Step 3: Atualizar a query de métricas**

Substituir o body do `klaviyoFetch` em `getCampaignMetrics`:

```typescript
body: JSON.stringify({
  data: {
    type: "campaign-values-report",
    attributes: {
      timeframe: { key: "last_90_days" },
      conversion_metric_id: CONVERSION_METRIC_ID,
      statistics: [
        "open_rate",
        "click_rate",
        "revenue_per_recipient",
        "recipients",
        "click_to_open_rate",
        "conversion_rate",
        "conversion_value",
        "average_order_value",
        "unsubscribe_rate",
        "spam_complaint_rate",
      ],
    },
  },
}),
```

- [ ] **Step 4: Atualizar o mapeamento de métricas**

Substituir o loop `for` dentro de `getCampaignMetrics`:

```typescript
const map: MetricsMap = {};
for (const result of data.data.attributes.results ?? []) {
  const id = result.groupings.campaign_id;
  map[id] = {
    openRate: result.statistics.open_rate ?? 0,
    clickRate: result.statistics.click_rate ?? 0,
    revenuePerRecipient: result.statistics.revenue_per_recipient ?? 0,
    recipients: result.statistics.recipients ?? 0,
    clickToOpenRate: result.statistics.click_to_open_rate ?? 0,
    conversionRate: result.statistics.conversion_rate ?? 0,
    conversionValue: result.statistics.conversion_value ?? 0,
    averageOrderValue: result.statistics.average_order_value ?? 0,
    unsubscribeRate: result.statistics.unsubscribe_rate ?? 0,
    spamComplaintRate: result.statistics.spam_complaint_rate ?? 0,
  };
}
```

- [ ] **Step 5: Adicionar helper para extrair segmento do nome**

Adicionar após as declarações de constantes no topo de `src/lib/klaviyo.ts`:

```typescript
function extractSegment(name: string): string {
  const match = name.match(/\[([^\]]+)\]/g);
  if (!match || match.length < 2) return "";
  // segundo colchete é o segmento (ex: [CLIENTES A+], [LEADS A])
  return match[1].replace(/[\[\]]/g, "").trim();
}
```

- [ ] **Step 6: Atualizar o mapeamento final de campanhas**

Substituir o `return withMetrics.map(...)` em `getCampaigns`:

```typescript
return withMetrics.map(
  (c: {
    id: string;
    attributes: { name: string; status: string; send_time: string; audiences?: { included: string[] } };
  }) => {
    const m = metrics[c.id];
    const content = contents[c.id] ?? { subject: "", previewText: "" };
    return {
      id: c.id,
      name: c.attributes.name,
      status: c.attributes.status,
      sendTime: c.attributes.send_time ?? "",
      subject: content.subject,
      previewText: content.previewText,
      audienceSegment: extractSegment(c.attributes.name),
      openRate: m.openRate,
      clickRate: m.clickRate,
      revenuePerRecipient: m.revenuePerRecipient,
      recipients: m.recipients,
      clickToOpenRate: m.clickToOpenRate,
      conversionRate: m.conversionRate,
      conversionValue: m.conversionValue,
      averageOrderValue: m.averageOrderValue,
      unsubscribeRate: m.unsubscribeRate,
      spamComplaintRate: m.spamComplaintRate,
    };
  }
);
```

- [ ] **Step 7: Atualizar os testes em `src/lib/klaviyo.test.ts`**

Substituir o conteúdo completo do arquivo:

```typescript
import { describe, it, expect } from "vitest";

describe("Klaviyo metrics parser", () => {
  it("mapeia todos os campos de métricas corretamente", () => {
    const results = [
      {
        groupings: { campaign_id: "camp1", campaign_message_id: "msg1" },
        statistics: {
          open_rate: 0.35, click_rate: 0.05, revenue_per_recipient: 2.5,
          recipients: 1000, click_to_open_rate: 0.14, conversion_rate: 0.03,
          conversion_value: 450.0, average_order_value: 150.0,
          unsubscribe_rate: 0.002, spam_complaint_rate: 0.0001,
        },
      },
    ];

    const map: Record<string, Record<string, number>> = {};
    for (const r of results) {
      map[r.groupings.campaign_id] = {
        openRate: r.statistics.open_rate ?? 0,
        clickRate: r.statistics.click_rate ?? 0,
        revenuePerRecipient: r.statistics.revenue_per_recipient ?? 0,
        recipients: r.statistics.recipients ?? 0,
        clickToOpenRate: r.statistics.click_to_open_rate ?? 0,
        conversionRate: r.statistics.conversion_rate ?? 0,
        conversionValue: r.statistics.conversion_value ?? 0,
        averageOrderValue: r.statistics.average_order_value ?? 0,
        unsubscribeRate: r.statistics.unsubscribe_rate ?? 0,
        spamComplaintRate: r.statistics.spam_complaint_rate ?? 0,
      };
    }

    expect(map["camp1"].openRate).toBe(0.35);
    expect(map["camp1"].recipients).toBe(1000);
    expect(map["camp1"].clickToOpenRate).toBe(0.14);
    expect(map["camp1"].conversionRate).toBe(0.03);
    expect(map["camp1"].averageOrderValue).toBe(150.0);
    expect(map["camp1"].unsubscribeRate).toBe(0.002);
  });

  it("ordena campanhas por open rate decrescente", () => {
    const base = {
      status: "", sendTime: "", subject: "", previewText: "", audienceSegment: "",
      clickRate: 0, revenuePerRecipient: 0, recipients: 0, clickToOpenRate: 0,
      conversionRate: 0, conversionValue: 0, averageOrderValue: 0,
      unsubscribeRate: 0, spamComplaintRate: 0,
    };
    const campaigns = [
      { id: "a", name: "", openRate: 0.21, ...base },
      { id: "b", name: "", openRate: 0.35, ...base },
      { id: "c", name: "", openRate: 0.28, ...base },
    ];

    const sorted = [...campaigns].sort((a, b) => b.openRate - a.openRate);

    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("c");
    expect(sorted[2].id).toBe("a");
  });

  it("usa valores default 0 quando estatística está ausente", () => {
    const stat = {
      open_rate: undefined, click_rate: 0.03, revenue_per_recipient: null,
      recipients: undefined, click_to_open_rate: undefined,
      conversion_rate: undefined, conversion_value: undefined,
      average_order_value: undefined, unsubscribe_rate: undefined,
      spam_complaint_rate: undefined,
    };
    const result = {
      openRate: (stat.open_rate as number | undefined) ?? 0,
      clickRate: stat.click_rate ?? 0,
      revenuePerRecipient: (stat.revenue_per_recipient as number | null) ?? 0,
      recipients: (stat.recipients as number | undefined) ?? 0,
      clickToOpenRate: (stat.click_to_open_rate as number | undefined) ?? 0,
    };

    expect(result.openRate).toBe(0);
    expect(result.recipients).toBe(0);
    expect(result.clickToOpenRate).toBe(0);
  });

  it("extrai segmento do nome da campanha corretamente", () => {
    function extractSegment(name: string): string {
      const match = name.match(/\[([^\]]+)\]/g);
      if (!match || match.length < 2) return "";
      return match[1].replace(/[\[\]]/g, "").trim();
    }

    expect(extractSegment("[EM1206] [CLIENTES A+] - Nota Oficial")).toBe("CLIENTES A+");
    expect(extractSegment("[EM1201] [LEADS A] - Storytelling")).toBe("LEADS A");
    expect(extractSegment("Email 1")).toBe("");
    expect(extractSegment("[EM1222.2] [CLIENTES A+] - Presente")).toBe("CLIENTES A+");
  });
});
```

- [ ] **Step 8: Rodar os testes**

```bash
npm run test
```

Esperado: 4 testes passando (eram 3, agora 4).

- [ ] **Step 9: Commit**

```bash
git add src/lib/klaviyo.ts src/lib/klaviyo.test.ts
git commit -m "feat: expande tipo Campaign com 8 novas métricas Klaviyo"
```

---

## Task 2: Dashboard enriquecido com colunas, badges e filtros

**Files:**
- Modify: `src/components/CampaignTable.tsx`

- [ ] **Step 1: Adicionar helpers de formatação e badge de outlier**

No topo de `src/components/CampaignTable.tsx`, após os helpers existentes (`pct`, `currency`), adicionar:

```typescript
function fmtRecipients(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

function getOutlierBadges(c: Campaign, campaigns: Campaign[]): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  const avgCtor = campaigns.reduce((s, x) => s + x.clickToOpenRate, 0) / campaigns.length;
  const maxConvValue = Math.max(...campaigns.map((x) => x.conversionValue));

  if (c.clickToOpenRate > avgCtor * 1.5) badges.push({ label: "🔥 CTOR alto", color: "text-orange-400 bg-orange-950/40 border-orange-800/50" });
  if (c.unsubscribeRate > 0.005) badges.push({ label: "⚠️ Unsub alto", color: "text-yellow-400 bg-yellow-950/40 border-yellow-800/50" });
  if (c.openRate > 0.5 && c.conversionRate === 0) badges.push({ label: "💀 Zero conv", color: "text-red-400 bg-red-950/40 border-red-800/50" });
  if (c.conversionValue > 0 && c.conversionValue === maxConvValue) badges.push({ label: "⭐ Top ROI", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" });
  return badges;
}

type FilterType = "all" | "conversion" | "ctor" | "unsub";
```

- [ ] **Step 2: Adicionar estado de filtro ao componente**

Dentro de `CampaignTable`, após os estados existentes (`selected`, `analyzing`), adicionar:

```typescript
const [filter, setFilter] = useState<FilterType>("all");
```

- [ ] **Step 3: Adicionar lógica de filtro**

Após a declaração de `selectedCampaigns`, adicionar:

```typescript
const filteredCampaigns = campaigns.filter((c) => {
  if (filter === "conversion") return c.conversionRate > 0;
  if (filter === "ctor") {
    const avg = campaigns.reduce((s, x) => s + x.clickToOpenRate, 0) / campaigns.length;
    return c.clickToOpenRate > avg;
  }
  if (filter === "unsub") return c.unsubscribeRate > 0.005;
  return true;
});
```

- [ ] **Step 4: Substituir o Toolbar com filtros**

Substituir o bloco `{/* Toolbar */}` existente:

```tsx
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
```

- [ ] **Step 5: Atualizar o cabeçalho da tabela**

Substituir o `<thead>` existente:

```tsx
<thead>
  <tr className="border-b border-neutral-800 bg-neutral-900">
    <th className="w-10 px-4 py-3" />
    <th className="px-4 py-3 text-left font-medium text-neutral-400">Campanha</th>
    <th className="px-4 py-3 text-left font-medium text-neutral-400 hidden md:table-cell">Subject</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400">Open</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400">CTOR</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden lg:table-cell">Conv%</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden lg:table-cell">AOV</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden xl:table-cell">Unsub%</th>
    <th className="px-4 py-3 text-center font-medium text-neutral-400 hidden xl:table-cell">Recips</th>
  </tr>
</thead>
```

- [ ] **Step 6: Atualizar o tbody para usar filteredCampaigns e novos dados**

Substituir o `<tbody>` existente completo:

```tsx
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
              isSelected ? "border-violet-500 bg-violet-600" : "border-neutral-700"
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
            {c.subject || <span className="text-neutral-600 italic">sem subject</span>}
          </div>
          {c.previewText && (
            <div className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{c.previewText}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <MetricBadge value={pct(c.openRate)} label="open" />
        </td>
        <td className="px-4 py-3">
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
            value={c.averageOrderValue > 0 ? `R$${c.averageOrderValue.toFixed(0)}` : "—"}
            label="aov"
          />
        </td>
        <td className="px-4 py-3 hidden xl:table-cell">
          <MetricBadge
            value={c.unsubscribeRate > 0 ? pct(c.unsubscribeRate) : "—"}
            label="unsub%"
          />
        </td>
        <td className="px-4 py-3 hidden xl:table-cell">
          <MetricBadge
            value={c.recipients > 0 ? fmtRecipients(c.recipients) : "—"}
            label="recips"
          />
        </td>
      </tr>
    );
  })}
</tbody>
```

- [ ] **Step 7: Rodar build e verificar**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build passa sem erros de tipo.

- [ ] **Step 8: Commit**

```bash
git add src/components/CampaignTable.tsx
git commit -m "feat: dashboard enriquecido com CTOR, conv%, AOV, unsub, badges de outlier e filtros"
```

---

## Task 3: Análise Claude com insights profundos

**Files:**
- Modify: `src/app/api/analyze/route.ts`
- Modify: `src/components/AnalyzePanel.tsx`

- [ ] **Step 1: Atualizar tipo AnalysisResult**

Substituir o tipo `AnalysisResult` em `src/app/api/analyze/route.ts`:

```typescript
export type AnalysisResult = {
  subjectPatterns: string[];
  previewPatterns: string[];
  bodyPatterns: string[];
  topInsight: string;
  performanceInsights: string[];
  hiddenPatterns: string[];
  audienceInsights: string[];
};
```

- [ ] **Step 2: Enriquecer o prompt do Claude**

Substituir a variável `campaignList` e o `prompt` completo:

```typescript
const campaignList = campaigns
  .map(
    (c, i) => `
Campanha ${i + 1}: ${c.name}
- Segmento: ${c.audienceSegment || "não identificado"}
- Subject: ${c.subject || "(sem subject)"}
- Preview Text: ${c.previewText || "(sem preview)"}
- Horário de envio: ${c.sendTime ? new Date(c.sendTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
- Open Rate: ${(c.openRate * 100).toFixed(1)}%
- CTOR (Click-to-Open): ${(c.clickToOpenRate * 100).toFixed(1)}%
- Click Rate: ${(c.clickRate * 100).toFixed(1)}%
- Taxa de Conversão: ${(c.conversionRate * 100).toFixed(2)}%
- Receita Total: R$ ${c.conversionValue.toFixed(2)}
- Ticket Médio (AOV): R$ ${c.averageOrderValue.toFixed(2)}
- Receita por Destinatário: R$ ${c.revenuePerRecipient.toFixed(2)}
- Destinatários: ${c.recipients.toLocaleString("pt-BR")}
- Taxa de Descadastro: ${(c.unsubscribeRate * 100).toFixed(3)}%
- Taxa de Spam: ${(c.spamComplaintRate * 100).toFixed(4)}%`
  )
  .join("\n");

const prompt = `Você é um especialista em email marketing e análise de dados para e-commerce masculino premium. Analise as seguintes campanhas da Minimal Club (marca de roupas masculinas D2C brasileira) com dados quantitativos completos.

${campaignList}

Sua análise deve ir ALÉM do óbvio. Encontre:
1. Padrões que humanos não percebem facilmente (correlações entre variáveis)
2. Anomalias reveladoras (ex: open rate alto + conversão zero = problema no corpo do email)
3. Diferenças de performance por segmento (A+ vs LEADS vs outros)
4. Padrão de horário que correlaciona com conversão ou CTOR
5. Qual tipo de subject/preview gera CTOR alto (não apenas abertura)

Dados quantitativos obrigatórios: use números reais das campanhas nos seus insights. Não diga "emails com urgência performam melhor" — diga "emails com urgência no subject tiveram CTOR médio de X% vs Y% dos demais".

Responda APENAS com JSON válido, sem markdown, sem texto adicional:

{
  "subjectPatterns": ["padrão específico 1 com dados", "padrão 2", "padrão 3"],
  "previewPatterns": ["padrão específico 1 com dados", "padrão 2", "padrão 3"],
  "bodyPatterns": ["padrão de estratégia/conteúdo 1", "padrão 2", "padrão 3"],
  "topInsight": "O insight mais surpreendente ou valioso — deve incluir número(s) real(is)",
  "performanceInsights": [
    "dado quantitativo 1 (ex: campanhas com AOV > R$X geraram Y% mais receita total)",
    "dado quantitativo 2",
    "dado quantitativo 3"
  ],
  "hiddenPatterns": [
    "correlação não óbvia 1 (ex: emails enviados entre X-Xh tiveram CTOR Y% maior)",
    "correlação não óbvia 2",
    "correlação não óbvia 3"
  ],
  "audienceInsights": [
    "diferença entre segmentos 1 (ex: CLIENTES A+ convertem X% vs LEADS Y%)",
    "padrão de segmento 2",
    "recomendação baseada em segmento 3"
  ]
}`;
```

- [ ] **Step 3: Atualizar AnalyzePanel com novas seções**

Substituir o bloco `{analysis && (...)}` em `src/components/AnalyzePanel.tsx`:

```tsx
{analysis && (
  <div className="space-y-5">
    {/* Top Insight */}
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
      <p className="text-xs font-semibold text-violet-300 uppercase tracking-wide mb-1">
        Principal Insight
      </p>
      <p className="text-neutral-200">{analysis.topInsight}</p>
    </div>

    {/* Performance Insights */}
    {analysis.performanceInsights?.length > 0 && (
      <div className="rounded-xl border border-blue-800/50 bg-blue-950/10 p-4">
        <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-3">
          📊 Dados Quantitativos
        </p>
        <ul className="space-y-2">
          {analysis.performanceInsights.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-300">
              <span className="text-blue-500 shrink-0">›</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Hidden Patterns */}
    {analysis.hiddenPatterns?.length > 0 && (
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/10 p-4">
        <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-3">
          💡 Padrões Ocultos
        </p>
        <ul className="space-y-2">
          {analysis.hiddenPatterns.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-300">
              <span className="text-amber-500 shrink-0">›</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Audience Insights */}
    {analysis.audienceInsights?.length > 0 && (
      <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/10 p-4">
        <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-3">
          👥 Insights por Segmento
        </p>
        <ul className="space-y-2">
          {analysis.audienceInsights.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-300">
              <span className="text-emerald-500 shrink-0">›</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Padrões de copy */}
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
```

- [ ] **Step 4: Rodar build**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build passa limpo.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/analyze/route.ts src/components/AnalyzePanel.tsx
git commit -m "feat: análise Claude com dados quantitativos, padrões ocultos e insights por segmento"
```

---

## Task 4: Enriquecer geração de copy

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Enriquecer o prompt de geração**

Substituir o bloco de construção do `prompt` em `src/app/api/generate/route.ts`:

```typescript
const hiddenSection =
  analysis.hiddenPatterns?.length > 0
    ? `\nPADRÕES OCULTOS IDENTIFICADOS (use esses para diferenciar o copy):\n${analysis.hiddenPatterns.map((p) => `• ${p}`).join("\n")}`
    : "";

const performanceSection =
  analysis.performanceInsights?.length > 0
    ? `\nDADOS DE PERFORMANCE (calibre o copy com base nesses números):\n${analysis.performanceInsights.map((p) => `• ${p}`).join("\n")}`
    : "";

const prompt = `Você é um copywriter especialista em email marketing para e-commerce masculino premium brasileiro. Sua missão é criar copies que performam tão bem quanto as melhores campanhas da Minimal Club.

PADRÕES IDENTIFICADOS NAS CAMPANHAS TOP PERFORMERS:

Subjects que funcionam:
${analysis.subjectPatterns.map((p) => `• ${p}`).join("\n")}

Previews que funcionam:
${analysis.previewPatterns.map((p) => `• ${p}`).join("\n")}

Padrões no conteúdo/estratégia:
${analysis.bodyPatterns.map((p) => `• ${p}`).join("\n")}

Principal insight: ${analysis.topInsight}
${hiddenSection}
${performanceSection}

---

BRIEFING DO NOVO EMAIL:
${brief}

---

Crie um email de marketing aplicando os padrões acima — especialmente os padrões ocultos e dados de performance. Responda APENAS com JSON válido, sem markdown:

{
  "subjects": [
    "subject opção 1",
    "subject opção 2",
    "subject opção 3"
  ],
  "previews": [
    "preview text opção 1",
    "preview text opção 2",
    "preview text opção 3"
  ],
  "body": "Corpo completo do email em texto simples (pode usar quebras de linha). Deve incluir: abertura impactante, apresentação do produto/oferta, benefícios claros, prova social ou urgência, e CTA forte. Máximo 300 palavras."
}

Seja direto, específico e adaptado ao público masculino da Minimal Club (25-40 anos, renda média-alta, interesse em moda e estilo de vida).`;
```

- [ ] **Step 2: Rodar build final**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build passa limpo, todas as rotas Dynamic.

- [ ] **Step 3: Rodar todos os testes**

```bash
npm run test
```

Esperado: 4 testes passando.

- [ ] **Step 4: Commit e push**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: enriquece geração de copy com padrões ocultos e dados de performance"
git push
```

Esperado: Vercel faz deploy automático em ~1 min.

---

## Smoke Test Final

Após deploy na Vercel:

- [ ] Dashboard carrega 30 campanhas com CTOR, Conv%, AOV, Unsub%, Recips
- [ ] Badges de outlier aparecem (🔥, ⚠️, 💀, ⭐)
- [ ] Filtros "Alta Conversão", "Alto CTOR", "Risco Unsub" funcionam
- [ ] Tag de segmento (A+, LEADS) aparece nas campanhas com esse padrão no nome
- [ ] Selecionando campanhas + "Analisar" → aparece seções azul, âmbar e verde com dados quantitativos
- [ ] "Gerar copy" → copy reflete os padrões ocultos
