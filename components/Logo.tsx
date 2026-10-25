export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill="#1C1B19" />
      <path
        d="M5.5 14.5 13 7l1.2 1.2L14 10l-2-2-6.8 6.8-1.7.4.3-1.7Z"
        fill="#F2F1EC"
      />
      <circle cx="14.25" cy="5.75" r="1.35" fill="#1C6E8C" />
    </svg>
  );
}
