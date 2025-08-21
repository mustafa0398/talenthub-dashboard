import type { Candidate } from "../types";

import type { CandidateStatus } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
const API_KEY  = (import.meta.env.VITE_API_KEY  as string | undefined)?.trim();

function toMs(ts: unknown): number {
  const n = typeof ts === "number" ? ts : Number(ts);
  if (!Number.isFinite(n)) return Date.now();
  return n > 1e12 ? n : n * 1000;
}

export function normalizeSkills(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((it) => {
        if (typeof it === "string") return it;
        if (it && typeof it === "object") {
          const o = it as Record<string, unknown>;
          if (typeof o.name === "string") return o.name;
          if (typeof o.value === "string") return o.value;
          const first = Object.values(o)[0];
          if (typeof first === "string") return first;
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
    }
    return v.split(/[,\|]/).map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

function buildUrl(count: number): string {
  if (!API_BASE) throw new Error("VITE_API_BASE fehlt (.env)");

  const base = API_BASE.replace(/\s+/g, "");

  if (/candidates\.json/i.test(base)) {
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}count=${count}`;
  }

  if (!API_KEY) throw new Error("VITE_API_KEY fehlt (.env)");
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}/candidates.json?key=${API_KEY}&count=${count}`;
}

export async function fetchCandidates(count = 24): Promise<Candidate[]> {
  const url = `${buildUrl(count)}&_=${Date.now()}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);

  const raw = (await res.json()) as any[];

  return raw.map((r, i) => ({
    id: Number.isFinite(Number(r.id)) ? Number(r.id) : i + 1,
    name: String(r.name ?? "Unbekannt"),
    title: String(r.title ?? ""),
    location: String(r.location ?? ""),
    experienceYears: Number(r.experienceYears ?? 0),
    skills: normalizeSkills(r.skills),
    status: (r.status ?? "sourced") as CandidateStatus,
    updatedAt: toMs(r.updatedAt ?? Date.now()),
  }));
}
