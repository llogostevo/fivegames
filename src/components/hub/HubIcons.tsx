/** Small SVG flag icons for hub tiles (emoji for World — Windows-safe flags drawn as SVG). */

import { useId, type ReactNode } from "react";

type IconProps = {
  className?: string;
};

/** Region / country flag (or world emoji) for a hub game. */
export function HubFlagIcon({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const frame = className ?? "h-3.5 w-[1.15rem]";
  switch (code) {
    case "WORLD":
      return (
        <span
          className={`${frame} inline-flex items-center justify-center text-[11px] leading-none`}
          aria-hidden="true"
        >
          🌍
        </span>
      );
    case "UK":
      return <UkFlag className={frame} />;
    case "ENG":
      return <EnglandFlag className={frame} />;
    case "ITA":
      return <ItalyFlag className={frame} />;
    case "GER":
      return <GermanyFlag className={frame} />;
    case "FRA":
      return <FranceFlag className={frame} />;
    case "ESP":
      return <SpainFlag className={frame} />;
    case "LDN":
      return <LondonBadge className={frame} />;
    default:
      return (
        <span
          className={`${frame} inline-flex items-center justify-center text-[11px] leading-none`}
          aria-hidden="true"
        >
          🌍
        </span>
      );
  }
}

function FlagShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const clipId = useId();
  return (
    <svg
      viewBox="0 0 24 18"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="24" height="18" rx="2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <rect
        width="24"
        height="18"
        rx="2"
        fill="none"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth="0.75"
      />
    </svg>
  );
}

function UkFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="24" height="18" fill="#012169" />
      <path d="M0 0 24 18M24 0 0 18" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 18M24 0 0 18" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0v18M0 9h24" stroke="#fff" strokeWidth="5" />
      <path d="M12 0v18M0 9h24" stroke="#C8102E" strokeWidth="2.6" />
    </FlagShell>
  );
}

function EnglandFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="24" height="18" fill="#fff" />
      <path d="M12 0v18M0 9h24" stroke="#C8102E" strokeWidth="3.2" />
    </FlagShell>
  );
}

function ItalyFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="8" height="18" fill="#009246" />
      <rect x="8" width="8" height="18" fill="#fff" />
      <rect x="16" width="8" height="18" fill="#CE2B37" />
    </FlagShell>
  );
}

function GermanyFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="24" height="6" fill="#000" />
      <rect y="6" width="24" height="6" fill="#D00" />
      <rect y="12" width="24" height="6" fill="#FFCE00" />
    </FlagShell>
  );
}

function FranceFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="8" height="18" fill="#002654" />
      <rect x="8" width="8" height="18" fill="#fff" />
      <rect x="16" width="8" height="18" fill="#CE1126" />
    </FlagShell>
  );
}

function SpainFlag({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="24" height="18" fill="#AA151B" />
      <rect y="4.5" width="24" height="9" fill="#F1BF00" />
    </FlagShell>
  );
}

/** City of London–inspired badge (cross + sword) for London Pubs. */
function LondonBadge({ className }: IconProps) {
  return (
    <FlagShell className={className}>
      <rect width="24" height="18" fill="#ffffff" />
      <path d="M12 0v18M0 9h24" stroke="#C8102E" strokeWidth="3.2" />
      <path
        d="M4.2 2.2 5.6 5.4 2.8 4.2Z"
        fill="#C8102E"
      />
      <path
        d="M4.8 5.2v5.2"
        stroke="#C8102E"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </FlagShell>
  );
}
