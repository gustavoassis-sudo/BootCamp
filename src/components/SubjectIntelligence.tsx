import type { SubjectIntelligence as SubjectIntelligenceType, SubjectInsight } from "@/lib/analytics";

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

function ComparisonRow({
  a,
  b,
  metric,
  fmt,
}: {
  a: SubjectInsight;
  b: SubjectInsight;
  metric: keyof Pick<SubjectInsight, "avgOpen" | "avgCtor" | "avgConv">;
  fmt?: (n: number) => string;
}) {
  const format = fmt ?? pct;
  const aVal = a[metric];
  const bVal = b[metric];
  const aWins = aVal >= bVal;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${aWins ? "bg-emerald-950/30 border border-emerald-800/40" : "bg-neutral-800/40 border border-neutral-800"}`}>
        <span className="text-neutral-400">{a.label} <span className="text-neutral-600">({a.count})</span></span>
        <span className={`font-semibold ${aWins ? "text-emerald-400" : "text-neutral-300"}`}>{format(aVal)}</span>
      </div>
      <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${!aWins ? "bg-emerald-950/30 border border-emerald-800/40" : "bg-neutral-800/40 border border-neutral-800"}`}>
        <span className="text-neutral-400">{b.label} <span className="text-neutral-600">({b.count})</span></span>
        <span className={`font-semibold ${!aWins ? "text-emerald-400" : "text-neutral-300"}`}>{format(bVal)}</span>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

export default function SubjectIntelligence({ data }: { data: SubjectIntelligenceType }) {
  const { emoji, number, length, urgency } = data;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Inteligência de Subject</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        <InsightCard title="Emoji no subject">
          <div className="space-y-1.5">
            <p className="text-[10px] text-neutral-600 uppercase">Open Rate</p>
            <ComparisonRow a={emoji.yes} b={emoji.no} metric="avgOpen" />
            <p className="text-[10px] text-neutral-600 uppercase mt-2">CTOR</p>
            <ComparisonRow a={emoji.yes} b={emoji.no} metric="avgCtor" />
          </div>
        </InsightCard>

        <InsightCard title="Número no subject">
          <div className="space-y-1.5">
            <p className="text-[10px] text-neutral-600 uppercase">Open Rate</p>
            <ComparisonRow a={number.yes} b={number.no} metric="avgOpen" />
            <p className="text-[10px] text-neutral-600 uppercase mt-2">CTOR</p>
            <ComparisonRow a={number.yes} b={number.no} metric="avgCtor" />
          </div>
        </InsightCard>

        <InsightCard title="Urgência no subject">
          <div className="space-y-1.5">
            <p className="text-[10px] text-neutral-600 uppercase">Open Rate</p>
            <ComparisonRow a={urgency.yes} b={urgency.no} metric="avgOpen" />
            <p className="text-[10px] text-neutral-600 uppercase mt-2">CTOR</p>
            <ComparisonRow a={urgency.yes} b={urgency.no} metric="avgCtor" />
          </div>
        </InsightCard>

        <InsightCard title="Comprimento do subject">
          <div className="space-y-1.5">
            {[length.short, length.medium, length.long].map((item) => (
              <div key={item.label} className="rounded-lg bg-neutral-800/40 border border-neutral-800 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-neutral-400">{item.label}</span>
                  <span className="text-[10px] text-neutral-600">{item.count} camps</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-600">Open </span>
                    <span className="text-xs font-semibold text-white">{pct(item.avgOpen)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-600">CTOR </span>
                    <span className="text-xs font-semibold text-white">{pct(item.avgCtor)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </InsightCard>

      </div>
    </div>
  );
}
