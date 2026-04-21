import type { SegmentStats } from "@/lib/analytics";

function pct(n: number, d = 1) {
  return (n * 100).toFixed(d) + "%";
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden mt-1">
      <div
        className="h-full bg-violet-500 rounded-full"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function SegmentPerformance({ segments }: { segments: SegmentStats[] }) {
  if (segments.length === 0) return null;

  const maxOpen = Math.max(...segments.map((s) => s.avgOpen));
  const maxCtor = Math.max(...segments.map((s) => s.avgCtor));
  const maxConv = Math.max(...segments.map((s) => s.avgConv));
  const maxRev = Math.max(...segments.map((s) => s.avgRevPerRecipient));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Performance por Segmento</h2>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Segmento</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500">Camps</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 hidden sm:table-cell">Open médio</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 hidden sm:table-cell">CTOR médio</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 hidden md:table-cell">Conv%</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 hidden lg:table-cell">Rev/Rec</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 hidden lg:table-cell">Receita Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {segments.map((s, i) => (
              <tr key={s.segment} className={i === 0 ? "bg-violet-950/10" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-800/40">top</span>}
                    <span className="font-medium text-neutral-200">{s.segment}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-neutral-400">{s.count}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white">{pct(s.avgOpen)}</span>
                    <Bar value={s.avgOpen} max={maxOpen} />
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white">{pct(s.avgCtor)}</span>
                    <Bar value={s.avgCtor} max={maxCtor} />
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white">{pct(s.avgConv, 3)}</span>
                    <Bar value={s.avgConv} max={maxConv} />
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white">R$ {s.avgRevPerRecipient.toFixed(3)}</span>
                    <Bar value={s.avgRevPerRecipient} max={maxRev} />
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-center text-neutral-300">
                  {s.totalRevenue > 0 ? `R$ ${s.totalRevenue.toFixed(0)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
