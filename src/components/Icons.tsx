const base = {
  width: 40,
  height: 40,
  viewBox: "0 0 40 40",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const SlowIcon = ({ color = "#82d4c3" }: { color?: string }) => (
  <svg {...base} style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}>
    <circle cx="20" cy="21" r="14" />
    <path d="M20 11v10l7 4" />
    <path d="M15 4h10" />
  </svg>
);

export const HintIcon = ({ color = "#c9a4ed" }: { color?: string }) => (
  <svg {...base} style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}>
    <circle cx="20" cy="20" r="13" />
    <circle cx="20" cy="20" r="5" />
    <path d="M20 3v7M20 30v7M3 20h7M30 20h7" />
  </svg>
);

export const BombIcon = ({ color = "#ed927d" }: { color?: string }) => (
  <svg {...base} style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}>
    <circle cx="18" cy="23" r="12" />
    <path d="M26 13l4-4" />
    <path d="M31 3v4M35 8h-4M28 4l2 2M34 12l-2-2" strokeWidth={2.5} />
  </svg>
);

export const PauseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="#fff">
    <rect x="3" y="2" width="6" height="18" rx="1" />
    <rect x="13" y="2" width="6" height="18" rx="1" />
  </svg>
);

export const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="#fff">
    <path d="M5 2l14 9-14 9z" />
  </svg>
);

export const SoundIcon = ({ off }: { off: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h4l6-5v16l-6-5H3z" fill="#fff" />
    {off ? <path d="M17 10l6 6M23 10l-6 6" /> : <path d="M17 9c2 2.5 2 5.500 0 8M20 6c4 4 4 10 0 14" />}
  </svg>
);
