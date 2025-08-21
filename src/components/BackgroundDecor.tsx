export default function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-sky-900" />
      </svg>

      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-indigo-400/20 blur-3xl" />
    </div>
  );
}
