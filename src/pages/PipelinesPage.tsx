import { useEffect, useState } from "react";
import BackgroundDecor from "../components/BackgroundDecor";
import NavBar from "../components/NavBar";
import CandidateChip from "../components/CandidateChip";
import { useCandidates } from "../hooks/useCandidates";
import type { Candidate, CandidateStatus } from "../types";

const STATI: CandidateStatus[] = [
  "sourced",
  "applied",
  "interview",
  "offer",
  "hired",
  "rejected",
];

type Board = Record<CandidateStatus, Candidate[]>;
const LS_KEY = "pipelines.board.v1";

function emptyBoard(): Board {
  return { sourced: [], applied: [], interview: [], offer: [], hired: [], rejected: [] };
}
function boardFromData(data: Candidate[]): Board {
  const b = emptyBoard();
  for (const c of data) b[c.status].push(c);
  return b;
}
function totalItems(b: Board | null): number {
  if (!b) return 0;
  return b.sourced.length + b.applied.length + b.interview.length + b.offer.length + b.hired.length + b.rejected.length;
}
function label(s: CandidateStatus) {
  switch (s) {
    case "sourced": return "Sourced";
    case "applied": return "Applied";
    case "interview": return "Interview";
    case "offer": return "Offer";
    case "hired": return "Hired";
    case "rejected": return "Rejected";
  }
}

export default function PipelinesPage() {
  const { data, loading, error, refetch } = useCandidates(80);

  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setBoard(JSON.parse(saved) as Board);
    } catch {

    }
  }, []);

  useEffect(() => {
    if (data.length === 0) return;
    if (board === null || totalItems(board) === 0) setBoard(boardFromData(data));
  }, [data]);
  useEffect(() => {
    if (board) localStorage.setItem(LS_KEY, JSON.stringify(board));
  }, [board]);

  function resetFromData() {
    setBoard(boardFromData(data));
  }
  function clearStorage() {
    localStorage.removeItem(LS_KEY);
    setBoard(boardFromData(data));
  }

  function onDrop(to: CandidateStatus, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!board) return;
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(id)) return;

    setBoard((prev) => {
      if (!prev) return prev;

      let from: CandidateStatus | null = null;
      let cand: Candidate | undefined;

      for (const s of STATI) {
        const idx = prev[s].findIndex((x) => x.id === id);
        if (idx >= 0) {
          cand = { ...prev[s][idx], status: to };
          from = s;
          break;
        }
      }
      if (!cand || !from || from === to) return prev;

      const next: Board = {
        sourced: [...prev.sourced],
        applied: [...prev.applied],
        interview: [...prev.interview],
        offer: [...prev.offer],
        hired: [...prev.hired],
        rejected: [...prev.rejected],
      };
      next[from] = next[from].filter((x) => x.id !== id);
      next[to] = [cand, ...next[to]];
      return next;
    });
  }

  return (
    <div className="min-h-dvh">
      <BackgroundDecor />
      <NavBar />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Pipelines</h1>

          <div className="hidden sm:block">
            <div className="btn-group">
              <button
                onClick={() => refetch(80)}
                className="hover:bg-white/80"
                title="Neu laden (API)"
              >
                Neu laden
              </button>
              <button
                onClick={resetFromData}
                className="bg-sky-50 text-sky-700 hover:bg-sky-100"
                title="Board aus aktuellen Kandidaten neu aufbauen"
              >
                Zurücksetzen
              </button>
              <button
                onClick={clearStorage}
                className="text-red-700 hover:bg-red-50"
                title="LocalStorage leeren"
              >
                Speicher leeren
              </button>
            </div>
          </div>

          <div className="sm:hidden flex gap-2">
            <button className="btn-outline" onClick={() => refetch(80)}>Neu laden</button>
            <button className="btn-primary" onClick={resetFromData}>Zurücksetzen</button>
            <button className="btn-danger" onClick={clearStorage}>Speicher leeren</button>
          </div>
        </div>

        {board && (
          <div className="mb-4 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            {STATI.map((s) => (
              <span key={s}>
                {label(s)}: <b>{board[s]?.length ?? 0}</b>
              </span>
            ))}
          </div>
        )}

        {loading && <div className="text-gray-500">Lade…</div>}
        {error && <div className="text-red-600">Fehler: {error}</div>}

        {!loading && !error && board && (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {STATI.map((s) => (
              <Column
                key={s}
                title={label(s)}
                onDrop={(e) => onDrop(s, e)}
                onDragOver={(e) => e.preventDefault()}
              >
                {board[s].map((c) => (
                  <CandidateChip key={c.id} c={c} />
                ))}
              </Column>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Column({
  title,
  children,
  onDrop,
  onDragOver,
}: {
  title: string;
  children: React.ReactNode;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-3 shadow-card min-h-[60vh] flex flex-col gap-3"
    >
      <div className="mb-1 text-sm font-semibold text-slate-700">{title}</div>
      {children}
    </div>
  );
}
