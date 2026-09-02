"use client";

import { useOthers } from "@/lib/liveblocks.config";

export default function Cursors({
  scale,
  offsetX,
  offsetY,
}: {
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const others = useOthers();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) return null;
        const screenX = presence.cursor.x * scale + offsetX;
        const screenY = presence.cursor.y * scale + offsetY;

        return (
          <div
            key={connectionId}
            className="absolute left-0 top-0 will-change-transform motion-safe:transition-transform motion-safe:duration-[80ms] motion-safe:ease-linear"
            style={{ transform: `translate3d(${screenX}px, ${screenY}px, 0)` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 1.5 15 8.5 9 9.5 6 16 2 1.5Z"
                fill={presence.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-3 mt-0.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
              style={{ backgroundColor: presence.color }}
            >
              {presence.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
