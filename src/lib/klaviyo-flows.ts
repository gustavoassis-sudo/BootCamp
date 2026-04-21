import type { FlowBrief, GeneratedEmail } from "./flow-patterns";

const BASE_URL = "https://a.klaviyo.com/api";
const REVISION = "2026-04-15";
const FROM_EMAIL = "jbento@minimalclub.com.br";
const FROM_LABEL = "Minimal Club";

async function klaviyoPost(
  path: string,
  body: object
): Promise<{ data: { id: string; type: string; attributes?: Record<string, unknown> } }> {
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

  const flowRes = await klaviyoPost("/flows/", {
    data: {
      type: "flow",
      attributes: {
        name: `[ECI] ${brief.name}`,
        status: "draft",
        definition: {
          trigger: {
            type: "manual",
          },
          states: [],
        },
      },
    },
  });

  const flowId = flowRes.data.id;
  progress[0].status = "done";

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
                value: email.position === 1 ? 0 : email.position,
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
