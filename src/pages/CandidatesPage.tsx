import { useMemo, useState } from "react";
import CandidateCard from "../components/CandidateCard";
import BackgroundDecor from "../components/BackgroundDecor";
import { useCandidates } from "../hooks/useCandidates";
import type { Candidate, CandidateStatus } from "../types";
import NavBar from "../components/NavBar";

export default function CandidatesPage() {
  const { data, loading, error, refetch, regenerate, clearCache } = useCandidates(100);

  const [rawQ, setRawQ] = useState("");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("Alle Orte");
  const [minYears, setMinYears] = useState<number | "">("");
  const [sort, setSort] = useState<"name" | "experience" | "updated">("name");
  const [status, setStatus] = useState<"" | CandidateStatus>("");

  useMemo(() => {
    const t = setTimeout(() => setQ(rawQ), 250);
    return () => clearTimeout(t);
  }, [rawQ]);

  const filtered: Candidate[] = useMemo(() => {
    let list = [...data];

    if (location !== "Alle Orte") list = list.filter((c) => c.location === location);
    if (status) list = list.filter((c) => c.status === status);
    if (minYears !== "") list = list.filter((c) => c.experienceYears >= Number(minYears));

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((c) => {
        if (c.name.toLowerCase().startsWith(s)) return true;
        const blob = (c.title + " " + c.skills.join(" ")).toLowerCase();
        return blob.includes(s);
      });
    }

    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "experience") list.sort((a, b) => b.experienceYears - a.experienceYears);
    if (sort === "updated") list.sort((a, b) => b.updatedAt - a.updatedAt);

    return list;
  }, [data, q, location, minYears, sort, status]);

  const locations = useMemo(() => {
    const set = new Set<string>(data.map((d) => d.location));
    return ["Alle Orte", ...Array.from(set)];
  }, [data]);

  function resetFilters() {
    setRawQ("");
    setQ("");
    setLocation("Alle Orte");
    setMinYears("");
    setSort("name");
    setStatus("");
  }

  return (
    <div className="min-h-dvh">
      <BackgroundDecor />
      <NavBar />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">
            Kandidaten <span className="text-sm text-gray-500">(API)</span>
          </h1>

          <div className="hidden sm:flex gap-6">
            <button className="btn-outline" onClick={() => refetch(100)}>
              Neu laden
            </button>
            <button className="btn-primary" onClick={() => regenerate(100)}>
              Neu generieren
            </button>
            <button className="btn-danger" onClick={clearCache}>
              Speicher leeren
            </button>
          </div>

          <div className="sm:hidden grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => refetch(100)}>
              Neu laden
            </button>
            <button className="btn-primary" onClick={() => regenerate(100)}>
              Neu generieren
            </button>
            <button className="btn-danger col-span-2" onClick={clearCache}>
              Speicher leeren
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={rawQ}
            onChange={(e) => setRawQ(e.target.value)}
            placeholder="Suche nach Name, Skill, Titel…"
            className="rounded-xl border bg-white/70 backdrop-blur px-3 py-2 shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          />

          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border bg-white/70 backdrop-blur px-3 py-2 shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus((e.target.value || "") as "" | CandidateStatus)}
            className="rounded-xl border bg-white/70 backdrop-blur px-3 py-2 shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">Alle Stati</option>
            <option value="sourced">sourced</option>
            <option value="applied">applied</option>
            <option value="interview">interview</option>
            <option value="offer">offer</option>
            <option value="hired">hired</option>
            <option value="rejected">rejected</option>
          </select>

          <input
            type="number"
            min={0}
            value={minYears}
            onChange={(e) => setMinYears(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Min. Jahre"
            className="w-28 rounded-xl border bg-white/70 backdrop-blur px-3 py-2 shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-xl border bg-white/70 backdrop-blur px-3 py-2 shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="updated">Zuletzt aktualisiert</option>
            <option value="name">Name</option>
            <option value="experience">Erfahrung</option>
          </select>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {!loading && !error ? `${filtered.length} Treffer` : "\u00A0"}
          </div>
          <button className="btn-ghost" onClick={resetFilters}>Zurücksetzen</button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        {loading && <div className="text-gray-500">Lade Kandidaten…</div>}
        {error && <div className="text-red-600">Fehler: {error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="mx-auto max-w-3xl rounded-xl border bg-white/70 p-6 text-center">
            <div className="text-lg font-semibold">Keine Treffer</div>
            <p className="text-sm text-gray-600 mt-1">
              Passe deine Filter an oder importiere Kandidaten als CSV.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CandidateCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
