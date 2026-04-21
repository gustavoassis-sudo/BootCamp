const BASE_URL = "https://a.klaviyo.com/api";
const REVISION = "2026-04-15";
const CONVERSION_METRIC_ID = "RTf8bb"; // Order Placed — Minimal Club

export type Campaign = {
  id: string;
  name: string;
  status: string;
  sendTime: string;
  subject: string;
  previewText: string;
  openRate: number;
  clickRate: number;
  revenuePerRecipient: number;
};

type MetricsMap = Record<
  string,
  { openRate: number; clickRate: number; revenuePerRecipient: number }
>;

async function klaviyoFetch(path: string, options?: RequestInit) {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) throw new Error("KLAVIYO_API_KEY não configurada");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: REVISION,
      accept: "application/json",
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new Error(`Rate limit Klaviyo. Tente novamente em ${retryAfter}s.`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Klaviyo API ${res.status}: ${body}`);
  }

  return res.json();
}

async function getCampaignMetrics(): Promise<MetricsMap> {
  const data = await klaviyoFetch("/campaign-values-reports/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "campaign-values-report",
        attributes: {
          timeframe: { key: "last_90_days" },
          conversion_metric_id: CONVERSION_METRIC_ID,
          statistics: ["open_rate", "click_rate", "revenue_per_recipient"],
        },
      },
    }),
  });

  const map: MetricsMap = {};
  for (const result of data.data.attributes.results ?? []) {
    const id = result.groupings.campaign_id;
    map[id] = {
      openRate: result.statistics.open_rate ?? 0,
      clickRate: result.statistics.click_rate ?? 0,
      revenuePerRecipient: result.statistics.revenue_per_recipient ?? 0,
    };
  }
  return map;
}

async function getCampaignMessageContents(
  messageIds: string[]
): Promise<Record<string, { subject: string; previewText: string }>> {
  if (messageIds.length === 0) return {};

  // Klaviyo suporta filter=any(id,...) para busca em lote
  const ids = messageIds.slice(0, 50).join("','"); // max 50 por chamada
  const data = await klaviyoFetch(
    `/campaign-messages/?filter=any(id,'${ids}')&fields[campaign-message]=content`
  );

  const map: Record<string, { subject: string; previewText: string }> = {};
  for (const msg of data.data ?? []) {
    map[msg.id] = {
      subject: msg.attributes.content?.subject ?? "",
      previewText: msg.attributes.content?.preview_text ?? "",
    };
  }
  return map;
}

export async function getCampaigns(limit = 30): Promise<Campaign[]> {
  const [metrics, campaignsData] = await Promise.all([
    getCampaignMetrics(),
    klaviyoFetch(
      `/campaigns/?filter=equals(messages.channel,'email'),equals(status,'Sent')&sort=-updated_at&fields[campaign]=name,status,send_time,created_at`
    ),
  ]);

  const campaigns = campaignsData.data ?? [];

  // Filtra apenas campanhas com métricas disponíveis
  const withMetrics = campaigns.filter((c: { id: string }) => metrics[c.id]);

  // Coleta IDs de mensagens para busca em lote
  const messageIdByCampaign: Record<string, string> = {};
  for (const c of withMetrics) {
    const msgId = c.relationships?.["campaign-messages"]?.data?.[0]?.id;
    if (msgId) messageIdByCampaign[c.id] = msgId;
  }

  const messageContents = await getCampaignMessageContents(
    Object.values(messageIdByCampaign)
  );

  const result: Campaign[] = withMetrics.map(
    (c: {
      id: string;
      attributes: {
        name: string;
        status: string;
        send_time: string;
      };
    }) => {
      const msgId = messageIdByCampaign[c.id] ?? "";
      const content = messageContents[msgId] ?? {
        subject: "",
        previewText: "",
      };
      const m = metrics[c.id];
      return {
        id: c.id,
        name: c.attributes.name,
        status: c.attributes.status,
        sendTime: c.attributes.send_time ?? "",
        subject: content.subject,
        previewText: content.previewText,
        openRate: m.openRate,
        clickRate: m.clickRate,
        revenuePerRecipient: m.revenuePerRecipient,
      };
    }
  );

  // Ordena por open rate decrescente e retorna top N
  return result
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, limit);
}
