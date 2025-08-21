import type { Candidate } from "../types";

const API = "https://api.mockaroo.com/api/generate.json";
const KEY = import.meta.env.VITE_MOCKAROO_KEY as string;
const SCHEMA = (import.meta.env.VITE_MOCKAROO_SCHEMA as string) || "candidates_schema";
const DEFAULT_COUNT = Number(import.meta.env.VITE_MOCKAROO_COUNT || 100);

function normalize(r: any): Candidate {
  return {
    id: Number(r.id ?? Date.now()),
    name: String(r.name ?? ""),
    title: String(r.title ?? ""),
    location: String(r.location ?? "Remote"),
    experienceYears: Number(r.experienceYears ?? 0),
    skills: Array.isArray(r.skills)
      ? r.skills.map((s: any) => String(s))
      : String(r.skills ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    status: (r.status ?? "sourced") as Candidate["status"],
    updatedAt: Number(r.updatedAt ?? Date.now()),
  };
}

export async function fetchCandidates(count = DEFAULT_COUNT, signal?: AbortSignal): Promise<Candidate[]> {
  if (!KEY) throw new Error("VITE_MOCKAROO_KEY fehlt (.env.local)!");
  const url = `${API}?key=${encodeURIComponent(KEY)}&schema=${encodeURIComponent(SCHEMA)}&count=${count}`;

  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mockaroo-API ${res.status}: ${text || res.statusText}`);
  }
  const raw = await res.json();
  return (Array.isArray(raw) ? raw : [raw]).map(normalize);
}