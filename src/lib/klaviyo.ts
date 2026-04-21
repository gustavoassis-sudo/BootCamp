const BASE_URL = "https://a.klaviyo.com/api";

function extractSegment(name: string): string {
  const match = name.match(/\[([^\]]+)\]/g);
  if (!match || match.length < 2) return "";
  return match[1].replace(/[\[\]]/g, "").trim();
}
const REVISION = "2026-04-15";
const CONVERSION_METRIC_ID = "XbxAt4"; // Placed Order — Minimal Club

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
  });

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
  return map;
}

async function getCampaignContent(
  campaignId: string
): Promise<{ subject: string; previewText: string }> {
  try {
    const data = await klaviyoFetch(
      `/campaigns/${campaignId}/campaign-messages/?fields[campaign-message]=definition`
    );
    const content = data.data?.[0]?.attributes?.definition?.content;
    return {
      subject: content?.subject ?? "",
      previewText: content?.preview_text ?? "",
    };
  } catch {
    return { subject: "", previewText: "" };
  }
}

export async function getCampaigns(limit = 30): Promise<Campaign[]> {
  const [metrics, campaignsData] = await Promise.all([
    getCampaignMetrics(),
    klaviyoFetch(
      `/campaigns/?filter=equals(messages.channel,'email'),equals(status,'Sent')&sort=-updated_at&fields[campaign]=name,status,send_time,created_at`
    ),
  ]);

  const campaigns = campaignsData.data ?? [];

  // Filtra e ordena por open rate para pegar o top N antes de buscar subjects
  const withMetrics = campaigns
    .filter((c: { id: string }) => metrics[c.id])
    .sort(
      (a: { id: string }, b: { id: string }) =>
        metrics[b.id].openRate - metrics[a.id].openRate
    )
    .slice(0, limit);

  // Busca subject/preview por campanha em paralelo (com limite de concorrência)
  const BATCH = 5;
  const contents: Record<string, { subject: string; previewText: string }> = {};
  for (let i = 0; i < withMetrics.length; i += BATCH) {
    const batch = withMetrics.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((c: { id: string }) => getCampaignContent(c.id))
    );
    batch.forEach((c: { id: string }, idx: number) => {
      contents[c.id] = results[idx];
    });
  }

  return withMetrics.map(
    (c: {
      id: string;
      attributes: { name: string; status: string; send_time: string };
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
}

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
    return (data.data ?? []).map(
      (l: { id: string; attributes: { name: string; created: string } }) => ({
        id: l.id,
        name: l.attributes.name,
        created: l.attributes.created,
      })
    );
  } catch {
    return [];
  }
}
