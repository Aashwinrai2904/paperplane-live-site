"use client";

interface PageInput {
  label: string;
  text: string;
  url: string;
}

interface QueryInput {
  label: string;
  text: string;
}

interface InputPanelProps {
  pages: PageInput[];
  queries: QueryInput[];
  onPagesChange: (pages: PageInput[]) => void;
  onQueriesChange: (queries: QueryInput[]) => void;
  onSubmit: () => void;
  loading: boolean;
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-400/50 focus:outline-none";

export default function InputPanel({
  pages,
  queries,
  onPagesChange,
  onQueriesChange,
  onSubmit,
  loading,
}: InputPanelProps) {
  function updatePage(index: number, patch: Partial<PageInput>) {
    onPagesChange(
      pages.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function updateQuery(index: number, patch: Partial<QueryInput>) {
    onQueriesChange(
      queries.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-cyan-300">
            SITE PAGES
          </h2>
          <button
            onClick={() =>
              onPagesChange([...pages, { label: "", text: "", url: "" }])
            }
            className="text-xs text-white/50 hover:text-white"
          >
            + add page
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {pages.map((page, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="mb-2 flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Page label (e.g. /pricing)"
                  value={page.label}
                  onChange={(e) => updatePage(i, { label: e.target.value })}
                />
                <button
                  onClick={() =>
                    onPagesChange(pages.filter((_, idx) => idx !== i))
                  }
                  className="px-2 text-white/30 hover:text-red-400"
                  aria-label="remove page"
                >
                  ✕
                </button>
              </div>
              <input
                className={`${inputClass} mb-2`}
                placeholder="URL (optional)"
                value={page.url}
                onChange={(e) => updatePage(i, { url: e.target.value })}
              />
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                placeholder="Paste page body text / main content..."
                value={page.text}
                onChange={(e) => updatePage(i, { text: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-amber-300">
            SEARCH INTENT QUERIES
          </h2>
          <button
            onClick={() => onQueriesChange([...queries, { label: "", text: "" }])}
            className="text-xs text-white/50 hover:text-white"
          >
            + add query
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {queries.map((query, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="What would a user ask an AI search engine?"
                value={query.text}
                onChange={(e) => {
                  updateQuery(i, {
                    text: e.target.value,
                    label: query.label || e.target.value.slice(0, 40),
                  });
                }}
              />
              <button
                onClick={() =>
                  onQueriesChange(queries.filter((_, idx) => idx !== i))
                }
                className="px-2 text-white/30 hover:text-red-400"
                aria-label="remove query"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="mt-auto rounded-md bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Mapping semantic space…" : "Run GEO Analysis"}
      </button>
    </div>
  );
}

export type { PageInput, QueryInput };
