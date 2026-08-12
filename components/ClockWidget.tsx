"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function splitTime(date: Date) {
  // formatter yields something like "7:42 pm" — pull the pieces apart so
  // only the colon gets the blink animation, not the whole string.
  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "--";
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return { hour, minute, period };
}

export default function ClockWidget() {
  const [time, setTime] = useState<{ hour: string; minute: string; period: string } | null>(
    null
  );

  useEffect(() => {
    setTime(splitTime(new Date()));
    const id = setInterval(() => setTime(splitTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-baseline gap-1 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
      <span className="font-numeric text-sm tabular-nums text-cream">
        {time ? time.hour : "--"}
        <span className="clock-colon">:</span>
        {time ? time.minute : "--"}
      </span>
      <span className="font-numeric text-[10px] uppercase tracking-wide text-cream/60">
        {time ? time.period : ""}
      </span>
    </div>
  );
}
