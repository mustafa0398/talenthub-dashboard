import type { Candidate } from "../types";

export default function CandidateChip({ c }: { c: Candidate }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/plain", String(c.id));
    const crt = document.createElement("div");
    crt.style.padding = "6px 10px";
    crt.style.fontSize = "12px";
    crt.style.border = "1px solid rgba(0,0,0,0.1)";
    crt.style.borderRadius = "8px";
    crt.style.background = "white";
    crt.style.boxShadow = "0 6px 18px rgba(0,0,0,0.10)";
    crt.innerText = c.name;
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 10, 10);
    requestAnimationFrame(() => crt.remove());
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-lg border bg-white px-3 py-2 text-sm hover:shadow transition cursor-grab active:cursor-grabbing"
      title={`${c.name} – ${c.title}`}
    >
      <div className="font-medium truncate">{c.name}</div>
      <div className="text-xs text-gray-600 truncate">{c.title}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {c.skills.slice(0, 3).map((s, i) => (
          <span
            key={`${c.id}-${i}-${s}`}
            className="px-1.5 py-0.5 rounded-full text-[11px] border bg-sky-50 text-sky-700 border-sky-200"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
