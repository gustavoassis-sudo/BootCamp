# Design — Email Copy Intelligence v2

Data: 2026-04-21

## Problema

A análise atual é genérica, sem dados quantitativos e não identifica correlações que um humano não veria. O dashboard mostra apenas open rate, click rate e receita por destinatário.

## Objetivo

Enriquecer o pipeline completo (dados → dashboard → análise Claude → geração de copy) com todos os dados disponíveis na Klaviyo API, entregando insights que só IA consegue encontrar em escala.

---

## 1. Dados — `src/lib/klaviyo.ts`

### Novos campos no tipo `Campaign`

```typescript
conversionRate: number
conversionValue: number
averageOrderValue: number
clickToOpenRate: number
unsubscribeRate: number
spamComplaintRate: number
recipients: number
audienceId: string
```

### Query de métricas

Uma única chamada à Reporting API com todas as statistics válidas:
`open_rate, click_rate, revenue_per_recipient, conversion_rate, conversion_value, average_order_value, click_to_open_rate, unsubscribe_rate, spam_complaint_rate, recipients`

Sem chamadas extras — zero custo adicional de API.

### Audiência

`audienceId` extraído de `campaign.attributes.audiences.included[0]`. Não busca nome do segmento (evita chamada extra e rate limit). Frontend formata o ID para exibição legível.

---

## 2. Dashboard — `src/components/CampaignTable.tsx`

### Colunas novas
| Coluna | Campo | Formato |
|--------|-------|---------|
| CTOR | clickToOpenRate | % |
| Conv% | conversionRate | % |
| AOV | averageOrderValue | R$ |
| Unsub% | unsubscribeRate | % com alerta visual |
| Recipients | recipients | número formatado |

### Outlier badges (automático)
- 🔥 "CTOR alto" — clickToOpenRate > média do conjunto
- ⚠️ "Unsub alto" — unsubscribeRate > 0.5%
- 💀 "Zero conv" — openRate > 50% mas conversionRate = 0 (body/CTA ruim)
- ⭐ "Top ROI" — conversionValue maior do conjunto

### Filtros rápidos
Botões acima da tabela: `Todos | Alta Conversão | Alto CTOR | Risco Unsub`

### Segmento
Tag com audienceId formatado visível em cada linha (ex: "A+", "LEADS", "VIP").

### Horário de envio
Coluna ou tooltip com hora do envio — permite identificar padrão de horário visualmente.

---

## 3. Análise Claude — `src/app/api/analyze/route.ts` + `src/components/AnalyzePanel.tsx`

### Prompt enriquecido

Claude recebe todos os campos quantitativos + instrução explícita para encontrar:

1. **Correlações ocultas:** subject com emoji → CTOR melhor ou pior? Horário de envio → conversão? Comprimento do subject → open rate?
2. **Anomalias:** campanhas com open_rate > 50% mas conversionRate = 0 (problema no body/CTA)
3. **Padrão de segmento:** campanhas A+ vs LEADS performam diferente em conversão?
4. **Padrão de horário:** qual faixa de horário gera mais conversão?

### Tipo `AnalysisResult` atualizado

```typescript
type AnalysisResult = {
  subjectPatterns: string[]
  previewPatterns: string[]
  bodyPatterns: string[]
  topInsight: string
  performanceInsights: string[]   // dados quantitativos com números reais
  hiddenPatterns: string[]        // correlações que humano não viu
  audienceInsights: string[]      // diferença entre segmentos / horários
}
```

### AnalyzePanel — novas seções visuais

Cada tipo de insight tem cor e ícone próprios:
- `performanceInsights` — azul, ícone de gráfico
- `hiddenPatterns` — amarelo/âmbar, ícone de lâmpada
- `audienceInsights` — verde, ícone de pessoas

---

## 4. Geração — `src/app/api/generate/route.ts`

Prompt de geração inclui `hiddenPatterns` e `performanceInsights` além dos padrões atuais, para que o copy gerado reflita correlações reais e não só padrões óbvios de texto.

---

## Fora do escopo

- Gráficos de evolução temporal (Chart.js = peso desnecessário)
- Comparação lado a lado entre segmentos em tela separada
- Busca de nome do segmento via API (rate limit)

---

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/lib/klaviyo.ts` | Tipo + query de métricas |
| `src/components/CampaignTable.tsx` | UI — colunas, badges, filtros |
| `src/app/api/analyze/route.ts` | Prompt + tipo de resposta |
| `src/components/AnalyzePanel.tsx` | UI — novas seções de análise |
| `src/app/api/generate/route.ts` | Prompt enriquecido |
| `src/lib/klaviyo.test.ts` | Testes atualizados |
