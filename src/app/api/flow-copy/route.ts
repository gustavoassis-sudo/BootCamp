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

    const cleanJson = content.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleanJson) as {
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
