# Design — Flow Builder com Criação Automática no Klaviyo

Data: 2026-04-21

## Problema

O dashboard atual é informativo mas não guia decisões. O usuário vê dados, mas não sabe o que fazer com eles. O processo de criar uma sequência de emails ainda é 100% manual: escrever copy, configurar no Klaviyo, definir delays, ativar. A IA não está conectada ao canal de distribuição.

## Objetivo

Sistema que analisa padrões históricos de performance, gera copies de sequências completas de email (flows) com score estimado, e cria o flow automaticamente no Klaviyo após aprovação do usuário.

## Fluxo do Usuário

1. Usuário acessa `/flow-builder`
2. Escolhe tipo de flow + define trigger + monta estrutura (N emails + delays)
3. Clica "Gerar copies" → Claude gera todos os emails com consistência narrativa
4. Revisa email por email — pode aprovar, editar ou pedir nova versão
5. Quando todos aprovados, clica "Criar no Klaviyo"
6. Sistema cria o flow via API, exibe link direto para o Klaviyo
7. Usuário ativa o flow no Klaviyo (única ação manual restante)

---

## Seção 1 — Análise de Padrões Históricos

### Fontes de dados
- **Campanhas Klaviyo** — métricas reais: open, CTOR, conv%, rev/rec, segmento, horário
- **Copies salvas no Supabase** — subjects, previews, bodies gerados pela plataforma

### Função `analyzeFlowPatterns(type, segment)`
Cruza as duas fontes e retorna um "perfil de copy que converte" por tipo de flow e segmento:

```typescript
type FlowPattern = {
  subjectStyle: string[]       // padrões de subject que convertiram
  previewStyle: string[]       // padrões de preview
  bodyStructure: string[]      // estrutura de corpo que funcionou
  idealDelay: number[]         // delays em dias por posição do email
  bestHour: number             // hora de envio com melhor performance
  topInsight: string           // insight principal dos dados históricos
  basedOn: number              // quantas campanhas similares foram encontradas
}
```

### Score estimado
Para cada copy gerado, sistema calcula score baseado na correlação com campanhas históricas similares:
```typescript
type CopyScore = {
  estimatedOpen: number
  estimatedCtor: number
  estimatedConv: number
  confidence: "alta" | "média" | "baixa"  // baseado em basedOn
  similarCampaigns: number
}
```

---

## Seção 2 — Criação Guiada de Copy com Score

### Brief estruturado
```typescript
type FlowBrief = {
  type: "welcome" | "abandoned_cart" | "reengagement" | "custom"
  triggerList: string        // ID da lista no Klaviyo
  segment: string            // segmento alvo
  objective: string          // objetivo geral do flow
  emails: EmailBrief[]
}

type EmailBrief = {
  position: number
  objective: "welcome" | "product" | "social_proof" | "urgency" | "custom"
  delay: number              // dias após email anterior
  customObjective?: string   // se objective === "custom"
}
```

### Geração de copy
Claude recebe:
- Perfil de padrões históricos (`FlowPattern`)
- Brief completo do flow (`FlowBrief`)
- Posição do email na sequência + emails já gerados (para manter consistência narrativa)

Claude retorna para cada email:
```typescript
type GeneratedEmail = {
  subject: string
  previewText: string
  body: string
  score: CopyScore
  rationale: string          // por que essas escolhas, baseado nos padrões
}
```

### Interface de revisão
Cada email exibe:
- Subject + Preview Text + Body completo
- Score estimado com barra visual
- Rationale ("baseado em 7 campanhas A+ com CTOR > 12%")
- Botões: [Aprovar] [Nova versão] [Editar manualmente]

---

## Seção 3 — Builder de Flow

### Tipos de flow pré-definidos
```typescript
const FLOW_TEMPLATES = {
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
}
```

### Estado do flow builder (client component)
```typescript
type FlowState = {
  config: FlowBrief
  emails: (GeneratedEmail & { status: "pending" | "generating" | "approved" | "editing" })[]
  deployStatus: "idle" | "deploying" | "done" | "error"
  klaviyoFlowId?: string
  klaviyoFlowUrl?: string
}
```

---

## Seção 4 — Criação no Klaviyo via API

### Adapter `src/lib/klaviyo-flows.ts`

```typescript
async function createKlaviyoFlow(
  brief: FlowBrief,
  emails: GeneratedEmail[]
): Promise<{ flowId: string; flowUrl: string }>
```

**Sequência de chamadas:**
1. `POST /api/flows` — cria o flow com trigger e nome
2. Para cada email: configura flow action + flow message com subject/preview/body
3. Retorna `flowId` e URL direta para o Klaviyo

### Estrutura do flow no Klaviyo
```json
{
  "data": {
    "type": "flow",
    "attributes": {
      "name": "[ECI] Welcome Series — CLIENTES A+",
      "status": "draft",
      "trigger_type": "list"
    }
  }
}
```

Cada email é criado como `flow-action` com `flow-message` encadeados via `temporary_id`.

### Status de deploy em tempo real
```
Criando flow...         ✓
Email 1 configurado...  ✓
Email 2 configurado...  ✓
Email 3 configurado...  →

Ver no Klaviyo →  [link direto]
```

---

## Arquitetura de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/flow-builder/page.tsx` | Página do flow builder (server: carrega listas e padrões) |
| `src/components/FlowBuilder.tsx` | Client component — estado completo do flow |
| `src/components/FlowConfig.tsx` | Etapa 1: tipo + trigger + estrutura de emails |
| `src/components/EmailEditor.tsx` | Etapa 2: revisão e aprovação email por email |
| `src/components/DeployPanel.tsx` | Etapa 3: criação no Klaviyo + status em tempo real |
| `src/app/api/flow-copy/route.ts` | POST — gera copy de todos os emails do flow |
| `src/app/api/create-klaviyo-flow/route.ts` | POST — cria o flow no Klaviyo |
| `src/lib/klaviyo-flows.ts` | Adapter Klaviyo: criar flows, actions, messages |
| `src/lib/flow-patterns.ts` | Análise de padrões históricos por tipo + segmento |

---

## Fora do Escopo

- Edição de flows existentes no Klaviyo
- Flows com branches condicionais (A/B dentro do flow)
- Preview renderizado em HTML
- Integração com templates HTML do Klaviyo
- Agendamento de campanhas únicas (apenas flows)

---

## Critério de Sucesso

Usuário abre `/flow-builder`, monta um welcome series de 4 emails em menos de 5 minutos, aprova os copies, clica "Criar no Klaviyo", e o flow aparece em draft no Klaviyo pronto para ativar — sem precisar entrar no editor do Klaviyo para configurar nada além da ativação.
