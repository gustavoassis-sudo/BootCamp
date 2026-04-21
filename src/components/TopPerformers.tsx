import type { TopPerformer } from "@/lib/analytics";

function pct(n: number, d = 1) {
  return (n * 100).toFixed(d) + "%";
}

function TopList({
  title,
  items,
  format,
}: {
  title: string;
  items: TopPerformer[];
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{title}</p>
      {items.map((item, i) => (
        <div key={item.campaign.id} className="flex items-center gap-3 rounded-lg bg-neutral-800/40 px-3 py-2.5">
          <span className={`text-xs font-bold w-4 shrink-0 ${i === 0 ? "text-violet-400" : "text-neutral-600"}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-neutral-200 line-clamp-1">
              {item.campaign.subject || item.campaign.name}
            </p>
            {item.campaign.audienceSegment && (
              <p className="text-[10px] text-neutral-600 mt-0.5">{item.campaign.audienceSegment}</p>
            )}
          </div>
          <span className={`text-sm font-bold shrink-0 ${i === 0 ? "text-violet-400" : "text-neutral-300"}`}>
            {format(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TopPerformers({
  byOpen,
  byCtor,
  byConv,
  byRevenue,
}: {
  byOpen: TopPerformer[];
  byCtor: TopPerformer[];
  byConv: TopPerformer[];
  byRevenue: TopPerformer[];
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Top Performers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <TopList title="Maior Open Rate" items={byOpen} format={(v) => pct(v)} />
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <TopList title="Maior CTOR" items={byCtor} format={(v) => pct(v)} />
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <TopList title="Maior Conv%" items={byConv} format={(v) => pct(v, 3)} />
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <TopList title="Maior Receita" items={byRevenue} format={(v) => `R$ ${v.toFixed(0)}`} />
        </div>
      </div>
    </div>
  );
}
