"use client";

import { useEffect, useState } from "react";

// There's no backend behind this — no server, no room of real listeners.
// It's ambient set-dressing for the shopfront, so it drifts gently around
// a base number rather than claiming to be a live metric.
const BASE_COUNT = 214;

export default function ListenerCount() {
  const [count, setCount] = useState(BASE_COUNT);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((prev) => {
        const drift = Math.round((Math.random() - 0.5) * 6);
        const next = prev + drift;
        return Math.min(260, Math.max(180, next));
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
      </span>
      <span className="font-numeric text-xs tabular-nums text-cream/80">
        {count}
      </span>
      <span className="hidden text-xs text-cream/60 sm:inline">tuned in</span>
    </div>
  );
}
