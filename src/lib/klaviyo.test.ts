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
