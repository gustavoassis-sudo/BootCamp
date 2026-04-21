import type { KpiSummary } from "@/lib/analytics";

function pct(n: number, decimals = 1) {
  return (n * 100).toFixed(decimals) + "%";
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "border-violet-800/60 bg-violet-950/10" : "border-neutral-800 bg-neutral-900"}`}>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${highlight ? "text-violet-300" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function KpiCards({ kpis }: { kpis: KpiSummary }) {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `R$ ${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
      ? `R$ ${(n / 1000).toFixed(1)}k`
      : `R$ ${n.toFixed(2)}`;

  const fmtRecipients = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
      ? `${(n / 1000).toFixed(0)}k`
      : n.toString();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        label="Open Rate médio"
        value={pct(kpis.avgOpenRate)}
        sub={`${kpis.totalCampaigns} campanhas`}
        highlight
      />
      <KpiCard
        label="CTOR médio"
        value={pct(kpis.avgCtor)}
        sub="click-to-open"
      />
      <KpiCard
        label="Conv% média"
        value={pct(kpis.avgConvRate, 3)}
        sub="por campanha"
      />
      <KpiCard
        label="Rev / Rec médio"
        value={`R$ ${kpis.avgRevPerRecipient.toFixed(3)}`}
        sub="por destinatário"
      />
      <KpiCard
        label="Receita total"
        value={fmt(kpis.totalRevenue)}
        sub="90 dias"
        highlight
      />
      <KpiCard
        label="Destinatários"
        value={fmtRecipients(kpis.totalRecipients)}
        sub="total enviado"
      />
    </div>
  );
}
