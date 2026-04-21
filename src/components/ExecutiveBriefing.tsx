import type { ExecutiveBriefing } from "@/lib/briefing";

function Section({
  label,
  labelColor,
  title,
  detail,
  borderColor,
  bgColor,
}: {
  label: string;
  labelColor: string;
  title: string;
  detail: string;
  borderColor: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>
        {label}
      </p>
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-sm text-neutral-400 leading-relaxed">{detail}</p>
    </div>
  );
}

export default function ExecutiveBriefingPanel({ briefing }: { briefing: ExecutiveBriefing }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Briefing Executivo · gerado com Claude
          </p>
        </div>
        <p className="text-xs text-neutral-600">atualiza a cada 5 min</p>
      </div>

      {/* Situação */}
      <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Situação</p>
        <p className="text-sm text-neutral-200 leading-relaxed">{briefing.situation}</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section
          label="Destaque"
          labelColor="text-emerald-400"
          title={briefing.highlight.title}
          detail={briefing.highlight.detail}
          borderColor="border-emerald-800/40"
          bgColor="bg-emerald-950/10"
        />

        {briefing.anomaly && (
          <Section
            label="Anomalia"
            labelColor="text-amber-400"
            title={briefing.anomaly.title}
            detail={briefing.anomaly.detail}
            borderColor="border-amber-800/40"
            bgColor="bg-amber-950/10"
          />
        )}

        {briefing.risk && (
          <Section
            label="Risco"
            labelColor="text-red-400"
            title={briefing.risk.title}
            detail={briefing.risk.detail}
            borderColor="border-red-800/40"
            bgColor="bg-red-950/10"
          />
        )}
      </div>

      {/* Próximo email */}
      <div className="rounded-xl border border-violet-800/40 bg-violet-950/10 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
          Próximo Email
        </p>
        <p className="text-sm text-neutral-200 leading-relaxed">{briefing.nextEmail}</p>
      </div>
    </div>
  );
}
