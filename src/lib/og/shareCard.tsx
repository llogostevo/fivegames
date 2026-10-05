import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const SHARE_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const SHARE_CONTENT_TYPE = "image/png";

export type ShareCardKind = "hub" | "daily" | "world" | "football";

export type FootballFlag = "ENG" | "ITA" | "GER" | "FRA" | "ESP";

export type ShareCardProps = {
  kind: ShareCardKind;
  /** Middle line (e.g. DAILY 5, FOOTBALL). */
  line: string;
  /** Bottom subtitle (e.g. UK Edition, Spain). */
  subtitle: string;
  /** Accent for middle line / football icon frame. */
  accent?: string;
  /** Country flag for football share cards. */
  flag?: FootballFlag;
};

const FOOTBALL_FLAG_EMOJI: Record<FootballFlag, string> = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  ITA: "🇮🇹",
  GER: "🇩🇪",
  FRA: "🇫🇷",
  ESP: "🇪🇸",
};

function Pin5MarkIcon({ size = 220 }: { size?: number }) {
  const ring = size * 0.82;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "#c4157a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          border: `${Math.round(size * 0.045)}px solid #ffffff`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: Math.round(size * 0.52),
            fontWeight: 700,
            lineHeight: 1,
            marginTop: Math.round(size * -0.04),
          }}
        >
          5
        </div>
      </div>
    </div>
  );
}

function RoundedFrame({
  background,
  children,
  size = 220,
}: {
  background: string;
  children: ReactNode;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function EmojiStack({
  primary,
  secondary,
  primarySize = 84,
  secondarySize = 40,
}: {
  primary: string;
  secondary: string;
  primarySize?: number;
  secondarySize?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div style={{ fontSize: primarySize, lineHeight: 1, display: "flex" }}>
        {primary}
      </div>
      <div style={{ fontSize: secondarySize, lineHeight: 1, display: "flex" }}>
        {secondary}
      </div>
    </div>
  );
}

function FootballIcon({
  size = 220,
  accent = "#15803d",
  flag,
}: {
  size?: number;
  accent?: string;
  flag?: FootballFlag;
}) {
  return (
    <RoundedFrame background={accent} size={size}>
      {flag ? (
        <EmojiStack
          primary={FOOTBALL_FLAG_EMOJI[flag]}
          secondary="⚽"
          primarySize={Math.round(size * 0.38)}
          secondarySize={Math.round(size * 0.2)}
        />
      ) : (
        <div
          style={{
            fontSize: Math.round(size * 0.48),
            lineHeight: 1,
            display: "flex",
          }}
        >
          ⚽
        </div>
      )}
    </RoundedFrame>
  );
}

function WorldIcon({ size = 220 }: { size?: number }) {
  return (
    <RoundedFrame background="#1e1e24" size={size}>
      <div
        style={{
          fontSize: Math.round(size * 0.55),
          lineHeight: 1,
          display: "flex",
        }}
      >
        🌍
      </div>
    </RoundedFrame>
  );
}

function DailyIcon({ size = 220 }: { size?: number }) {
  return (
    <RoundedFrame background="#1e1e24" size={size}>
      <EmojiStack
        primary="🇬🇧"
        secondary="📍"
        primarySize={Math.round(size * 0.38)}
        secondarySize={Math.round(size * 0.2)}
      />
    </RoundedFrame>
  );
}

function ShareIcon({
  kind,
  accent,
  flag,
}: {
  kind: ShareCardKind;
  accent?: string;
  flag?: FootballFlag;
}) {
  switch (kind) {
    case "hub":
      return <Pin5MarkIcon />;
    case "world":
      return <WorldIcon />;
    case "daily":
      return <DailyIcon />;
    case "football":
      return <FootballIcon accent={accent} flag={flag} />;
  }
}

export function shareCardImage({
  kind,
  line,
  subtitle,
  accent = "#15803d",
  flag,
}: ShareCardProps) {
  const midColor = kind === "football" ? accent : "#1d1d1f";
  const bg =
    kind === "football"
      ? "radial-gradient(circle at 50% 45%, #f4faf5 0%, #e7f0e8 55%, #dfe8e0 100%)"
      : "radial-gradient(circle at 50% 45%, #ffffff 0%, #f3f4f1 55%, #e8eae6 100%)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: bg,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            padding: "0 72px",
          }}
        >
          <ShareIcon kind={kind} accent={accent} flag={flag} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 800,
                color: "#1d1d1f",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              PIN5
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 48,
                fontWeight: 700,
                color: midColor,
                letterSpacing: kind === "football" ? "0.08em" : "-0.02em",
                lineHeight: 1.05,
                textTransform: "uppercase",
              }}
            >
              {line}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 34,
                fontWeight: 500,
                color: "#5f6368",
                lineHeight: 1.1,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      emoji: "twemoji",
    },
  );
}
