import type { HourStats } from "@/lib/analytics";

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

export default function HourHeatmap({ hours }: { hours: HourStats[] }) {
  if (hours.length === 0) return null;

  const maxOpen = Math.max(...hours.map((h) => h.avgOpen));

  const allHours = Array.from({ length: 24 }, (_, i) => {
    const found = hours.find((h) => h.hour === i);
    return found ?? { hour: i, count: 0, avgOpen: 0, avgCtor: 0, avgConv: 0 };
  });

  const bestHour = hours.reduce((best, h) => (h.avgOpen > best.avgOpen ? h : best), hours[0]);

  function intensity(open: number): string {
    if (open === 0) return "bg-neutral-800/30";
    const ratio = open / maxOpen;
    if (ratio >= 0.85) return "bg-violet-500";
    if (ratio >= 0.7) return "bg-violet-600/80";
    if (ratio >= 0.5) return "bg-violet-700/60";
    if (ratio >= 0.3) return "bg-violet-800/50";
    return "bg-violet-900/30";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Melhor Horário de Envio</h2>
        <span className="text-xs text-neutral-500">
          Melhor: <span className="text-violet-400 font-medium">{bestHour.hour}h</span> — {pct(bestHour.avgOpen)} open, {pct(bestHour.avgCtor)} ctor
        </span>
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="grid grid-cols-12 gap-1.5">
          {allHours.map((h) => (
            <div
              key={h.hour}
              className="group relative"
              title={h.count > 0 ? `${h.hour}h: ${pct(h.avgOpen)} open, ${pct(h.avgCtor)} ctor (${h.count} camps)` : `${h.hour}h: sem dados`}
            >
              <div className={`h-8 rounded ${intensity(h.avgOpen)} transition-all flex items-center justify-center`}>
                {h.count > 0 && (
                  <span className="text-[10px] font-bold text-white/80">{h.count}</span>
                )}
              </div>
              <p className="text-center text-[9px] text-neutral-600 mt-1">{h.hour}h</p>

              {/* Tooltip */}
              {h.count > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap">
                  <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs shadow-xl">
                    <p className="font-semibold text-white">{h.hour}h — {h.count} camp{h.count !== 1 ? "s" : ""}</p>
                    <p className="text-neutral-400">Open: <span className="text-white">{pct(h.avgOpen)}</span></p>
                    <p className="text-neutral-400">CTOR: <span className="text-white">{pct(h.avgCtor)}</span></p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px] text-neutral-600">Menor open</span>
          <div className="flex gap-1">
            {["bg-violet-900/30", "bg-violet-800/50", "bg-violet-700/60", "bg-violet-600/80", "bg-violet-500"].map((c) => (
              <div key={c} className={`w-4 h-2 rounded ${c}`} />
            ))}
          </div>
          <span className="text-[10px] text-neutral-600">Maior open</span>
        </div>
      </div>
    </div>
  );
}
