import { getCampaigns, type Campaign } from "@/lib/klaviyo";
import CampaignTable from "@/components/CampaignTable";

export const dynamic = "force-dynamic";

export default async function Home() {
  let campaigns: Campaign[] = [];
  let error: string | null = null;

  try {
    campaigns = await getCampaigns(30);
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao carregar campanhas";
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              Minimal Club · Klaviyo
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Email Copy Intelligence
          </h1>
          <p className="mt-2 text-neutral-400">
            Analisa os top performers e gera novos copies baseados nos padrões
            que funcionaram.
          </p>
        </div>

        {/* Nav */}
        <div className="flex gap-1 mb-8">
          <a
            href="/"
            className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white"
          >
            Campanhas
          </a>
          <a
            href="/historico"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Histórico de Copies
          </a>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-red-300">
            <p className="font-medium">Erro ao carregar dados da Klaviyo</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        ) : (
          <CampaignTable campaigns={campaigns} />
        )}
      </div>
    </main>
  );
}
