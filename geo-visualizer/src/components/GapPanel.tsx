"use client";

import type { ContentGapBlueprint } from "@/types/geo";

export default function GapPanel({ gaps }: { gaps: ContentGapBlueprint[] }) {
  if (gaps.length === 0) {
    return (
      <div className="p-5 text-sm text-white/40">
        No content gaps detected — every search intent has nearby topical
        coverage.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-5">
      <h2 className="text-sm font-semibold tracking-wide text-red-300">
        CONTENT GAP BLUEPRINTS
      </h2>
      {gaps
        .slice()
        .sort((a, b) => b.strength - a.strength)
        .map((gap) => (
          <div
            key={gap.id}
            className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{gap.title}</h3>
              <span className="text-[10px] text-red-300/70">
                {Math.round(gap.strength * 100)}% gap
              </span>
            </div>
            <p className="text-xs text-white/60">{gap.recommendation}</p>
            {gap.suggestedKeywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {gap.suggestedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
