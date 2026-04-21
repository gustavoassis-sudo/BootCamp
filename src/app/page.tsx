export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-1.5 text-sm text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Em construção — Bootcamp Claude Code
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white">
          Email Copy Intelligence
        </h1>

        <p className="text-lg text-neutral-400 leading-relaxed">
          Analisa as campanhas Klaviyo que mais performaram e gera novos copies
          baseados nesses padrões — subject, preview e body em segundos.
        </p>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {["Campanhas Klaviyo", "Análise Claude", "Histórico de Copies"].map(
            (step) => (
              <div
                key={step}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400"
              >
                {step}
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
