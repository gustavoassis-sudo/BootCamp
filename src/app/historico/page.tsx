import { getSupabaseAdmin } from "@/lib/supabase";

type CopyRecord = {
  id: string;
  brief: string;
  subject_variants: string[];
  preview_variants: string[];
  body: string;
  created_at: string;
};

export const revalidate = 0;

export default async function HistoricoPage() {
  let copies: CopyRecord[] = [];
  let error: string | null = null;

  try {
    const { data, error: err } = await getSupabaseAdmin()
      .from("copies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) throw err;
    copies = data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao carregar histórico";
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Histórico de Copies
          </h1>
          <p className="mt-2 text-neutral-400">
            Todos os copies gerados, prontos para usar.
          </p>
        </div>

        {/* Nav */}
        <div className="flex gap-1 mb-8">
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Campanhas
          </a>
          <a
            href="/historico"
            className="px-4 py-2 rounded-lg bg-neutral-800 text-sm font-medium text-white"
          >
            Histórico de Copies
          </a>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-red-300 mb-6">
            <p className="font-medium">Erro ao carregar histórico</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        )}

        {copies.length === 0 && !error ? (
          <div className="rounded-lg border border-neutral-800 p-12 text-center text-neutral-500">
            <p className="text-lg mb-2">Nenhum copy salvo ainda</p>
            <p className="text-sm">
              Gere copies no{" "}
              <a href="/" className="text-violet-400 hover:underline">
                dashboard
              </a>{" "}
              e salve-os aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {copies.map((copy) => (
              <div
                key={copy.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
              >
                {/* Brief */}
                <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                      Brief
                    </p>
                    <p className="text-sm text-neutral-300">{copy.brief}</p>
                  </div>
                  <p className="text-xs text-neutral-600 shrink-0">
                    {new Date(copy.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Subjects */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      Subjects
                    </p>
                    <div className="space-y-1.5">
                      {copy.subject_variants?.map((s, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-neutral-800 px-4 py-2.5 text-sm text-neutral-200"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previews */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      Preview Texts
                    </p>
                    <div className="space-y-1.5">
                      {copy.preview_variants?.map((p, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-neutral-800 px-4 py-2.5 text-sm text-neutral-400"
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body (collapsible) */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-neutral-500 uppercase tracking-wide hover:text-neutral-300 transition-colors list-none flex items-center gap-2">
                      <span>Body do Email</span>
                      <span className="group-open:rotate-90 transition-transform">›</span>
                    </summary>
                    <div className="mt-3 rounded-lg bg-neutral-800 px-4 py-3">
                      <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                        {copy.body}
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
