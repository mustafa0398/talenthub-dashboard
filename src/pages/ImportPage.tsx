import { useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import BackgroundDecor from "../components/BackgroundDecor";
import type { Candidate, CandidateStatus } from "../types";

const CACHE_KEY = "candidates_cache_v2"; 
const STATUS: CandidateStatus[] = [
  "sourced",
  "applied",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const TEMPLATE_CSV = [
  [
    "name",
    "title",
    "location",
    "experienceYears",
    "skills",
    "status",
    "updatedAt",
  ],
  [
    "Mira Albrecht",
    "Frontend Engineer",
    "Berlin",
    "5",
    "React|TypeScript|Tailwind",
    "applied",
    "2025-06-01",
  ],
  [
    "Jonas Weber",
    "Full-Stack Dev",
    "Remote",
    "7",
    "Node.js|React|TypeScript",
    "interview",
    "2025-05-12",
  ],
  [
    "Aylin Kaya",
    "UX Engineer",
    "Hamburg",
    "3",
    "React|Tailwind",
    "sourced",
    "2025-04-20",
  ],
]
  .map((r) => r.join(","))
  .join("\n");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        continue;
      }
      cell += ch;
    } else {
      if (ch === '"') {
        inQuotes = true;
        continue;
      }
      if (ch === ",") {
        row.push(cell.trim());
        cell = "";
        continue;
      }
      if (ch === "\n") {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }
      if (ch === "\r") {
        continue;
      }
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x !== ""));
}

function normalizeSkills(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p.map(String).filter(Boolean);
    } catch {}
    return v
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function toMs(x: unknown): number {
  if (typeof x === "number" && Number.isFinite(x))
    return x > 1e12 ? x : x * 1000;
  if (typeof x === "string") {
    const t = Date.parse(x);
    if (!Number.isNaN(t)) return t;
    const n = Number(x);
    if (Number.isFinite(n)) return n > 1e12 ? n : n * 1000;
  }
  return Date.now();
}

function readCache(): Candidate[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ts: number; data: Candidate[] };
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    return [];
  }
}
function writeCache(data: Candidate[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
}


type Mapping = {
  name?: string;
  title?: string;
  location?: string;
  experienceYears?: string;
  skills?: string;
  status?: string;
  updatedAt?: string;
};

export default function ImportPage() {
  const [rawCsv, setRawCsv] = useState<string>("");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [message, setMessage] = useState<string>("");

  function onFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setRawCsv(text);
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setRows([]);
        setHeaders([]);
        return;
      }
      const hdr = parsed[0].map((h) => h.trim());
      setHeaders(hdr);
      setRows(parsed.slice(1));
      setMapping(autoMap(hdr));
    };
    reader.readAsText(f);
  }

  function autoMap(hdr: string[]): Mapping {
    const L = hdr.map((h) => h.toLowerCase());
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = L.indexOf(n.toLowerCase());
        if (i >= 0) return hdr[i];
      }
      return undefined;
    };
    return {
      name: idx(["name", "full name"]),
      title: idx(["title", "job", "role"]),
      location: idx(["location", "city"]),
      experienceYears: idx(["experienceYears", "years", "exp", "experience"]),
      skills: idx(["skills", "skill"]),
      status: idx(["status", "stage"]),
      updatedAt: idx(["updatedAt", "updated", "date", "last_updated"]),
    };
  }

  const candidates: Candidate[] = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    const col = (key?: string) => (key ? headers.indexOf(key) : -1);

    const existing = readCache();
    let nextId = existing.length
      ? Math.max(...existing.map((c) => c.id)) + 1
      : 1;

    const list: Candidate[] = [];
    for (const r of rows) {
      const get = (k?: string) => (k && col(k) >= 0 ? r[col(k)] : "");
      const name = get(mapping.name) || "";
      if (!name) continue; 

      const statusRaw = (get(mapping.status) || "sourced").toLowerCase();
      const status = (
        STATUS.includes(statusRaw as CandidateStatus) ? statusRaw : "sourced"
      ) as CandidateStatus;

      list.push({
        id: nextId++,
        name,
        title: get(mapping.title) || "",
        location: get(mapping.location) || "",
        experienceYears: Number(get(mapping.experienceYears) || 0) || 0,
        skills: normalizeSkills(get(mapping.skills)),
        status,
        updatedAt: toMs(get(mapping.updatedAt) || Date.now()),
      });
    }
    return list;
  }, [headers, rows, mapping]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function appendToCache() {
    const current = readCache();
    writeCache([...current, ...candidates]);
    setMessage(
      `✓ ${candidates.length} Einträge angehängt (Cache jetzt ${
        current.length + candidates.length
      }).`
    );
  }
  function replaceCache() {
    writeCache(candidates);
    setMessage(`✓ Cache ersetzt mit ${candidates.length} Einträgen.`);
  }
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    setMessage("✓ Cache geleert.");
  }

  return (
    <div className="min-h-dvh">
      <BackgroundDecor />
      <NavBar />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">CSV importieren</h1>
          <div className="hidden sm:block">
            <div className="btn-group">
              <button onClick={downloadTemplate} className="hover:bg-white/80">
                Vorlage
              </button>
              <button
                onClick={appendToCache}
                className="bg-sky-50 text-sky-700 hover:bg-sky-100"
                disabled={!candidates.length}
              >
                Anhängen
              </button>
              <button
                onClick={replaceCache}
                className="text-red-700 hover:bg-red-50"
                disabled={!candidates.length}
              >
                Cache ersetzen
              </button>
              <button
                onClick={clearCache}
                className="text-red-700 hover:bg-red-50"
              >
                Cache leeren
              </button>
            </div>
          </div>
          <div className="sm:hidden flex gap-2">
            <button className="btn-outline" onClick={downloadTemplate}>
              Vorlage
            </button>
            <button
              className="btn-primary"
              onClick={appendToCache}
              disabled={!candidates.length}
            >
              Anhängen
            </button>
            <button
              className="btn-danger"
              onClick={replaceCache}
              disabled={!candidates.length}
            >
              Ersetzen
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-3 text-sm text-emerald-700">{message}</div>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="rounded-2xl border border-dashed bg-white/60 backdrop-blur p-6 text-center shadow-card"
        >
          <div className="text-sm text-gray-600 mb-2">
            Datei hier ablegen oder auswählen
          </div>
          <label className="inline-block cursor-pointer rounded-lg bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow hover:bg-sky-100">
            Datei auswählen
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              className="hidden"
            />
          </label>

          {rawCsv === "" && (
            <p className="mt-2 text-sm text-gray-500 italic">
              Keine Datei ausgewählt
            </p>
          )}

          <div className="mt-3 text-sm text-gray-600 leading-relaxed">
            <p>
              <strong>Erwartete Spalten:</strong>
            </p>
            <ul className="list-disc list-inside">
              <li>
                <code>name</code> – vollständiger Name
              </li>
              <li>
                <code>title</code> – Jobtitel (z. B. Frontend Engineer)
              </li>
              <li>
                <code>location</code> – Ort
              </li>
              <li>
                <code>experienceYears</code> – Berufserfahrung in Jahren (Zahl)
              </li>
              <li>
                <code>skills</code> – Skills getrennt mit Komma oder{" "}
                <code>|</code> (z. B. <code>React|TypeScript</code>)
              </li>
              <li>
                <code>status</code> – Bewerbungsstatus:{" "}
                <em>sourced, applied, interview, offer, hired, rejected</em>
              </li>
              <li>
                <code>updatedAt</code> – Datum der letzten Aktualisierung (z. B.
                2025-05-12)
              </li>
            </ul>
          </div>
        </div>

        {headers.length > 0 && (
          <section className="mt-6 rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
            <h2 className="mb-3 text-lg font-semibold">Feld-Mapping</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(
                [
                  "name",
                  "title",
                  "location",
                  "experienceYears",
                  "skills",
                  "status",
                  "updatedAt",
                ] as Array<keyof Mapping>
              ).map((k) => (
                <label key={k} className="text-sm">
                  <div className="mb-1 font-medium">{k}</div>
                  <select
                    value={mapping[k] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [k]: e.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-md border bg-white/80 px-3 py-2"
                  >
                    <option value="">— nicht zuordnen —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        )}

        {candidates.length > 0 && (
          <section className="mt-6 rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-card">
            <h2 className="mb-3 text-lg font-semibold">
              Vorschau ({candidates.length} Zeilen)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Titel</th>
                    <th className="py-2 pr-3">Ort</th>
                    <th className="py-2 pr-3">Jahre</th>
                    <th className="py-2 pr-3">Skills</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.slice(0, 10).map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 pr-3">{c.name}</td>
                      <td className="py-2 pr-3">{c.title}</td>
                      <td className="py-2 pr-3">{c.location}</td>
                      <td className="py-2 pr-3">{c.experienceYears}</td>
                      <td className="py-2 pr-3">{c.skills.join(", ")}</td>
                      <td className="py-2 pr-3">{c.status}</td>
                      <td className="py-2 pr-3">
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
