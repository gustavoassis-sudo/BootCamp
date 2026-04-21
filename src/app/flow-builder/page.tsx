import { getCampaigns, getLists } from "@/lib/klaviyo";
import FlowBuilder from "@/components/FlowBuilder";

export const dynamic = "force-dynamic";

export default async function FlowBuilderPage() {
  let error: string | null = null;

  const [campaigns, lists] = await Promise.all([
    getCampaigns(30).catch((e) => {
      error = e instanceof Error ? e.message : "Erro ao carregar campanhas";
      return [];
    }),
    getLists().catch(() => []),
  ]);

  const segments = Array.from(
    new Set(campaigns.map((c) => c.audienceSegment).filter(Boolean))
  ).sort();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest">
              Minimal Club · Flow Builder
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Flow no Klaviyo</h1>
          <p className="mt-2 text-neutral-400">
            Monte a sequência, a IA gera os copies baseados nos padrões históricos,
            e o flow é criado automaticamente no Klaviyo após aprovação.
          </p>
        </div>

        <div className="flex gap-1">
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/flow-builder"
            className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white"
          >
            Flow Builder
          </a>
          <a
            href="/historico"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Histórico
          </a>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-red-300">
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        ) : lists.length === 0 ? (
          <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-6 text-yellow-300">
            <p className="font-medium">Nenhuma lista encontrada no Klaviyo</p>
            <p className="text-sm mt-1 text-yellow-400">
              Crie uma lista no Klaviyo para usá-la como trigger do flow.
            </p>
          </div>
        ) : (
          <FlowBuilder lists={lists} segments={segments} campaigns={campaigns} />
        )}
      </div>
    </main>
  );
}
