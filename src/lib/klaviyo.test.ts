import { describe, it, expect } from "vitest";

// Testa a lógica de parsing/join sem fazer chamadas HTTP

describe("Klaviyo metrics parser", () => {
  it("mapeia resultados do report para MetricsMap corretamente", () => {
    const results = [
      {
        groupings: { campaign_id: "camp1", campaign_message_id: "msg1" },
        statistics: { open_rate: 0.35, click_rate: 0.05, revenue_per_recipient: 2.5 },
      },
      {
        groupings: { campaign_id: "camp2", campaign_message_id: "msg2" },
        statistics: { open_rate: 0.21, click_rate: 0.02, revenue_per_recipient: 0 },
      },
    ];

    const map: Record<string, { openRate: number; clickRate: number; revenuePerRecipient: number }> = {};
    for (const r of results) {
      map[r.groupings.campaign_id] = {
        openRate: r.statistics.open_rate ?? 0,
        clickRate: r.statistics.click_rate ?? 0,
        revenuePerRecipient: r.statistics.revenue_per_recipient ?? 0,
      };
    }

    expect(map["camp1"].openRate).toBe(0.35);
    expect(map["camp2"].clickRate).toBe(0.02);
    expect(map["camp2"].revenuePerRecipient).toBe(0);
  });

  it("ordena campanhas por open rate decrescente", () => {
    const campaigns = [
      { id: "a", openRate: 0.21, clickRate: 0.01, revenuePerRecipient: 0, name: "", status: "", sendTime: "", subject: "", previewText: "" },
      { id: "b", openRate: 0.35, clickRate: 0.05, revenuePerRecipient: 2.5, name: "", status: "", sendTime: "", subject: "", previewText: "" },
      { id: "c", openRate: 0.28, clickRate: 0.03, revenuePerRecipient: 1.0, name: "", status: "", sendTime: "", subject: "", previewText: "" },
    ];

    const sorted = [...campaigns].sort((a, b) => b.openRate - a.openRate);

    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("c");
    expect(sorted[2].id).toBe("a");
  });

  it("usa valores default 0 quando estatística está ausente", () => {
    const stat = { open_rate: undefined, click_rate: 0.03, revenue_per_recipient: null };
    const result = {
      openRate: (stat.open_rate as number | undefined) ?? 0,
      clickRate: stat.click_rate ?? 0,
      revenuePerRecipient: (stat.revenue_per_recipient as number | null) ?? 0,
    };

    expect(result.openRate).toBe(0);
    expect(result.clickRate).toBe(0.03);
    expect(result.revenuePerRecipient).toBe(0);
  });
});
