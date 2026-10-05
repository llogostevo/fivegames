/** PIN5 orienteering-control mark for the hub header. */
export function Pin5Mark({ className }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="31" fill="#c4157a" />
        <circle
          cx="32"
          cy="32"
          r="26.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.75"
        />
      </svg>
      {/* HTML flex-centers the digit — SVG <text> baselines sit too low. */}
      <span className="relative font-display text-[2.05rem] font-bold leading-none text-white sm:text-[2.35rem]">
        5
      </span>
    </div>
  );
}
