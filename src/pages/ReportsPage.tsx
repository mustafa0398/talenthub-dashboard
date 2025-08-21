import { useMemo } from "react";
import NavBar from "../components/NavBar";
import BackgroundDecor from "../components/BackgroundDecor";
import { useCandidates } from "../hooks/useCandidates";
import type { CandidateStatus } from "../types";

type StatRow = {
  key: string;
  count: number;
  avgExp?: number;
  minExp?: number;
  maxExp?: number;
};

const STATI: CandidateStatus[] = [
  "sourced",
  "applied",
  "interview",
  "offer",
  "hired",
  "rejected",
];

export default function ReportsPage() {
  const { data, loading, error, refetch, clearCache } = useCandidates(200);
  const kpis = useMemo(() => {
    const total = data.length;
    const byStatus = Object.fromEntries(STATI.map((s) => [s, 0])) as Record<
      CandidateStatus,
      number
    >;
    let expSum = 0;

    for (const c of data) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      expSum += c.experienceYears;
    }

    return {
      total,
      avgExp: total ? expSum / total : 0,
      byStatus,
    };
  }, [data]);

  const topSkills = useMemo<StatRow[]>(() => {
    const map = new Map<string, number>();
    for (const c of data)
      for (const s of c.skills) map.set(s, (map.get(s) ?? 0) + 1);
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data]);

  const byLocation = useMemo<StatRow[]>(() => {
    const bucket = new Map<
      string,
      { n: number; sum: number; min: number; max: number }
    >();
    for (const c of data) {
      const o = bucket.get(c.location) ?? {
        n: 0,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: 0,
      };
      o.n += 1;
      o.sum += c.experienceYears;
      o.min = Math.min(o.min, c.experienceYears);
      o.max = Math.max(o.max, c.experienceYears);
      bucket.set(c.location, o);
    }
    return [...bucket.entries()]
      .map(([key, v]) => ({
        key,
        count: v.n,
        avgExp: v.n ? v.sum / v.n : 0,
        minExp: v.n ? v.min : 0,
        maxExp: v.n ? v.max : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const timeline = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const counts: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
      counts.push(0);
    }

    const idxOf = (ts: number) => {
      const d = new Date(ts);
      const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      return labels.indexOf(tag);
    };

    for (const c of data) {
      const i = idxOf(c.updatedAt);
      if (i >= 0) counts[i] += 1;
    }

    const max = counts.length ? Math.max(...counts) : 0;
    return { labels, counts, max };
  }, [data]);

  return (
    <div className="min-h-dvh">
      <BackgroundDecor />
      <NavBar />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Berichte</h1>

          <div className="hidden sm:block">
            <div className="btn-group">
              <button
                onClick={() => refetch(200)}
                className="hover:bg-white/80"
              >
                Neu laden
              </button>
              <button
                onClick={clearCache}
                className="text-red-700 hover:bg-red-50"
              >
                Speicher leeren
              </button>
            </div>
          </div>
          <div className="sm:hidden flex gap-2">
            <button className="btn-outline" onClick={() => refetch(200)}>
              Neu laden
            </button>
            <button className="btn-danger" onClick={clearCache}>
              Speicher leeren
            </button>
          </div>
        </div>

        {loading && <div className="text-gray-500">Lade Daten…</div>}
        {error && <div className="text-red-600">Fehler: {error}</div>}

        {!loading && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Kandidaten gesamt" value={kpis.total} />
              <KpiCard
                title="Ø Erfahrung (Jahre)"
                value={kpis.avgExp.toFixed(1)}
              />
              {STATI.slice(0, 2).map((s) => (
                <KpiCard key={s} title={label(s)} value={kpis.byStatus[s]} />
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STATI.slice(2).map((s) => (
                <KpiCard key={s} title={label(s)} value={kpis.byStatus[s]} />
              ))}
            </div>

            <section className="mt-6 rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
              <h2 className="mb-3 text-lg font-semibold">
                Aktualisierungen (letzte 6 Monate)
              </h2>
              <div className="grid grid-cols-6 gap-3">
                {timeline.labels.map((lab, i) => {
                  const h = timeline.max
                    ? Math.round((timeline.counts[i] / timeline.max) * 120)
                    : 0; 
                  return (
                    <div key={lab} className="flex flex-col items-center gap-1">
                      <div className="h-32 w-8 flex items-end">
                        <div
                          className="w-full rounded bg-sky-200/60"
                          style={{ height: `${h}px` }}
                          title={`${lab}: ${timeline.counts[i]}`}
                        />
                      </div>
                      <div className="text-xs text-gray-600">
                        {lab.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
              <h2 className="mb-3 text-lg font-semibold">Top Skills</h2>
              <div className="flex flex-wrap gap-2">
                {topSkills.map((s) => (
                  <span
                    key={s.key}
                    className="px-2 py-1 rounded-full text-xs border bg-sky-50 text-sky-700 border-sky-200"
                  >
                    {s.key} • {s.count}
                  </span>
                ))}
                {topSkills.length === 0 && (
                  <div className="text-sm text-gray-500">Keine Daten</div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
              <h2 className="mb-3 text-lg font-semibold">Orte</h2>
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-3">Ort</th>
                      <th className="py-2 pr-3">Anzahl</th>
                      <th className="py-2 pr-3">Ø Erfahrung</th>
                      <th className="py-2 pr-3">Min</th>
                      <th className="py-2 pr-3">Max</th>
                      <th className="py-2">Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byLocation.map((r) => (
                      <tr key={r.key} className="border-t">
                        <td className="py-2 pr-3">{r.key}</td>
                        <td className="py-2 pr-3 font-medium">{r.count}</td>
                        <td className="py-2 pr-3">{r.avgExp?.toFixed(1)}</td>
                        <td className="py-2 pr-3">{r.minExp}</td>
                        <td className="py-2 pr-3">{r.maxExp}</td>
                        <td className="py-2">
                          <Bar
                            width={r.count}
                            max={byLocation[0]?.count ?? 1}
                          />
                        </td>
                      </tr>
                    ))}
                    {byLocation.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-4 text-center text-gray-500"
                        >
                          Keine Daten
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  );
}


function KpiCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Bar({ width, max }: { width: number; max: number }) {
  const pct = max ? Math.max(6, Math.round((width / max) * 100)) : 0; // min 6%
  return (
    <div className="h-2 rounded bg-sky-200/70" style={{ width: `${pct}%` }} />
  );
}

function label(s: CandidateStatus): string {
  switch (s) {
    case "sourced":
      return "Sourced";
    case "applied":
      return "Applied";
    case "interview":
      return "Interview";
    case "offer":
      return "Offer";
    case "hired":
      return "Hired";
    case "rejected":
      return "Rejected";
  }
}
