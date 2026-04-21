import { getCampaigns } from "@/lib/klaviyo";
import {
  computeKpis,
  computeSubjectIntelligence,
  computeSegmentStats,
  computeHourStats,
  computeTopPerformers,
} from "@/lib/analytics";
import { generateBriefing } from "@/lib/briefing";
import KpiCards from "@/components/KpiCards";
import SubjectIntelligence from "@/components/SubjectIntelligence";
import SegmentPerformance from "@/components/SegmentPerformance";
import HourHeatmap from "@/components/HourHeatmap";
import TopPerformers from "@/components/TopPerformers";
import ExecutiveBriefingPanel from "@/components/ExecutiveBriefing";
import CampaignTable from "@/components/CampaignTable";

export const dynamic = "force-dynamic";

export default async function Home() {
  let error: string | null = null;

  let campaigns = await getCampaigns(30).catch((e) => {
    error = e instanceof Error ? e.message : "Erro ao carregar campanhas";
    return [];
  });

  const kpis = computeKpis(campaigns);
  const subjectIntel = computeSubjectIntelligence(campaigns);
  const segments = computeSegmentStats(campaigns);
  const hours = computeHourStats(campaigns);
  const topPerformers = computeTopPerformers(campaigns);

  const briefing = campaigns.length > 0
    ? await generateBriefing(campaigns, kpis, segments, hours).catch(() => null)
    : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              Minimal Club · Klaviyo · últimos 90 dias
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Email Copy Intelligence</h1>
          <p className="mt-2 text-neutral-400">
            Analisa os top performers e gera novos copies baseados nos padrões que funcionaram.
          </p>
        </div>

        {/* Nav */}
        <div className="flex gap-1">
          <a href="/" className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white">
            Dashboard
          </a>
          <a href="/historico" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            Histórico de Copies
          </a>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-red-300">
            <p className="font-medium">Erro ao carregar dados da Klaviyo</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Briefing Executivo */}
            {briefing && <ExecutiveBriefingPanel briefing={briefing} />}

            {/* KPIs */}
            <KpiCards kpis={kpis} />

            {/* Subject Intelligence */}
            <SubjectIntelligence data={subjectIntel} />

            {/* Top Performers */}
            <TopPerformers
              byOpen={topPerformers.byOpen}
              byCtor={topPerformers.byCtor}
              byConv={topPerformers.byConv}
              byRevenue={topPerformers.byRevenue}
            />

            {/* Segment + Hour (lado a lado em telas grandes) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SegmentPerformance segments={segments} />
              <HourHeatmap hours={hours} />
            </div>

            {/* Divisor */}
            <div className="border-t border-neutral-800 pt-6">
              <p className="text-xs text-neutral-500 uppercase tracking-widest mb-6">
                Campanhas — selecione para analisar com Claude
              </p>
              <CampaignTable campaigns={campaigns} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
