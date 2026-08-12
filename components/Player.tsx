"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { track as trackAnalyticsEvent } from "@vercel/analytics";
import { playlists } from "@/lib/tracks";
import type { PlaylistSource } from "@/lib/tracks";
import { loadYouTubeApi, videoIdFromUrl, YT_STATE, type YTPlayer } from "@/lib/youtube";

const DESKTOP_QUERY = "(min-width: 640px)";

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseDurationLabel(label: string): number {
  const [m, s] = label.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

/** YouTube's oEmbed endpoint — public, no API key, returns { title,
 *  author_name, ... } for a given watch URL. Used only to *display* a
 *  currently-playing title; nothing about the playlist is stored or
 *  looked up ahead of time. Fails soft if blocked or offline. */
async function fetchOEmbed(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title ?? "Untitled", author: data.author_name ?? "" };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Module-scope subcomponents. Defined here — never inside Player() — so they
// keep a stable identity across re-renders. Declared inline they'd get a new
// function identity every render, React would remount the subtree, and the
// vinyl's CSS spin would restart from 0deg on every progress tick (~2.5x/s).
// ---------------------------------------------------------------------------

function VinylMount({
  containerId,
  size,
  spinning,
}: {
  containerId: string;
  size: number;
  spinning: boolean;
}) {
  return (
    <div
      className="relative shrink-0 self-start overflow-hidden rounded-full bg-ink ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        animation: "spin 8s linear infinite",
        animationPlayState: spinning ? "running" : "paused",
      }}
    >
      {/* The YouTube IFrame API takes over this div's contents. It stays
         visible and correctly sized at all times — never hidden behind
         opacity/1px, per YouTube's Developer Policies. */}
      <div
        id={containerId}
        className="absolute inset-0 h-full w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:scale-[1.6]"
      />
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 ring-2 ring-white/40" />
    </div>
  );
}

function SeekBar({
  progress,
  onSeek,
  disabled,
}: {
  progress: number; // 0..1
  onSeek: (fraction: number) => void;
  disabled: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function fractionFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={disabled ? -1 : 0}
      data-dragging={dragging}
      className={`seek-track group relative flex h-6 w-full items-center touch-none ${disabled ? "opacity-40" : "cursor-pointer"
        }`}
      onPointerDown={(e) => {
        if (disabled) return;
        (e.target as Element).setPointerCapture(e.pointerId);
        setDragging(true);
        onSeek(fractionFromClientX(e.clientX));
      }}
      onPointerMove={(e) => {
        if (disabled || !dragging) return;
        onSeek(fractionFromClientX(e.clientX));
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.02));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.02));
      }}
    >
      <div className="relative h-[3px] w-full overflow-visible rounded-full bg-white/15">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber shadow-[0_0_8px_1px_rgba(217,164,65,0.7)]"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="seek-knob absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream shadow"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

function TransportControls({
  playing,
  disabled,
  size = "md",
  onPrev,
  onToggle,
  onNext,
}: {
  playing: boolean;
  disabled: boolean;
  size?: "sm" | "md";
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
}) {
  const playSize = size === "md" ? 52 : 44;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Previous track"
        disabled={disabled}
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-full text-cream/80 transition hover:text-cream disabled:opacity-30"
      >
        <SkipBack size={18} fill="currentColor" />
      </button>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={onToggle}
        style={{ width: playSize, height: playSize }}
        className="flex items-center justify-center rounded-full bg-gradient-to-b from-amber to-rust text-ink ring-1 ring-white/25 shadow-[0_6px_20px_-4px_rgba(217,164,65,0.65)] transition active:scale-95"
      >
        {playing ? (
          <Pause size={playSize * 0.4} fill="currentColor" />
        ) : (
          <Play size={playSize * 0.4} fill="currentColor" className="translate-x-[1px]" />
        )}
      </button>
      <button
        type="button"
        aria-label="Next track"
        disabled={disabled}
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-full text-cream/80 transition hover:text-cream disabled:opacity-30"
      >
        <SkipForward size={18} fill="currentColor" />
      </button>
    </div>
  );
}

function TrackMeta({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-[15px] font-semibold leading-tight text-cream">
        {title}
      </p>
      <p className="truncate text-[12.5px] text-cream/70">{subtitle}</p>
    </div>
  );
}

function PlaylistTabs({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md">
      {playlists.map((pl, i) => (
        <button
          key={pl.id}
          type="button"
          onClick={() => onSelect(i)}
          aria-pressed={active === i}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition ${active === i ? "bg-amber text-ink" : "text-cream/70 hover:text-cream"
            }`}
        >
          {pl.name}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Player() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0); // manual-kind only
  const [ytState, setYtState] = useState<number>(YT_STATE.UNSTARTED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  // youtube-kind only: what's actually cued right now, fetched live
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [liveAuthor, setLiveAuthor] = useState<string>("");
  const [ytIndex, setYtIndex] = useState(0);
  const [ytTotal, setYtTotal] = useState<number | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const pendingPlayRef = useRef(false);
  const skipAttemptsRef = useRef(0);
  const draggingRef = useRef(false);
  const dragReleaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastVideoIdRef = useRef<string | null>(null);

  const playlist: PlaylistSource = playlists[playlistIndex];
  const manualItem = playlist.kind === "manual" ? playlist.tracks[trackIndex] : null;

  const attachKey =
    playlist.kind === "manual" ? `manual:${playlist.id}:${manualItem!.id}` : `youtube:${playlist.id}`;

  // Only one of the two layout blocks (desktop pill / mobile card) is ever
  // visible at a time, so only one should actually host the live iframe.
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Pulls whatever video is currently cued/playing and, if it changed,
  // refreshes the displayed title via oEmbed. Safe to call repeatedly.
  function syncNowPlaying(player: YTPlayer) {
    const url = player.getVideoUrl?.();
    const id = url ? videoIdFromUrl(url) : null;
    if (playlist.kind === "youtube") {
      const idx = player.getPlaylistIndex?.();
      if (typeof idx === "number" && idx >= 0) setYtIndex(idx);
      const list = player.getPlaylist?.();
      if (list) setYtTotal(list.length);
    }
    if (id && id !== lastVideoIdRef.current) {
      lastVideoIdRef.current = id;
      setLiveTitle(null);
      fetchOEmbed(id).then((meta) => {
        if (!meta) return;
        setLiveTitle(meta.title);
        setLiveAuthor(meta.author);
      });
    }
  }

  // (Re)attach the YT player whenever the active track/playlist or the
  // active breakpoint changes.
  useEffect(() => {
    if (isDesktop === null) return;

    let cancelled = false;
    const containerId = isDesktop ? "yt-mount-desktop" : "yt-mount-mobile";
    const resumeAt = playerRef.current?.getCurrentTime?.() ?? 0;
    const wasPlaying = ytState === YT_STATE.PLAYING;

    setReady(false);
    setCurrentTime(0);
    lastVideoIdRef.current = null;

    const playerVars: Record<string, number | string> =
      playlist.kind === "youtube"
        ? {
          listType: "playlist",
          list: playlist.listId,
          index: playerRef.current?.getPlaylistIndex?.() ?? 0,
          start: Math.floor(resumeAt),
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          loop: 1,
        }
        : {
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(resumeAt),
        };

    if (playlist.kind === "manual") {
      setDuration(parseDurationLabel(manualItem!.duration));
    } else {
      setDuration(0);
    }

    const trackCount = playlist.kind === "manual" ? playlist.tracks.length : 0;

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current?.destroy();
      playerRef.current = new YT.Player(containerId, {
        ...(playlist.kind === "manual" ? { videoId: manualItem!.videoId } : {}),
        playerVars,
        events: {
          onReady: (e) => {
            setReady(true);
            syncNowPlaying(e.target);
            if (wasPlaying || pendingPlayRef.current) {
              pendingPlayRef.current = false;
              e.target.playVideo();
            }
          },
          onStateChange: (e) => {
            setYtState(e.data);
            syncNowPlaying(e.target);
            if (e.data === YT_STATE.PLAYING) {
              skipAttemptsRef.current = 0;
              setExhausted(false);
            }
            if (e.data === YT_STATE.ENDED && playlist.kind === "manual") {
              setTrackIndex((i) => (i + 1) % trackCount);
            }
          },
          onError: (e) => {
            trackAnalyticsEvent("youtube_track_error", {
              code: e.data,
              videoId: playlist.kind === "manual" ? manualItem!.videoId : "playlist",
            });
            skipAttemptsRef.current += 1;
            const cap = playlist.kind === "manual" ? trackCount : ytTotal ?? 50;
            if (skipAttemptsRef.current >= cap) {
              setExhausted(true);
              skipAttemptsRef.current = 0;
              return;
            }
            if (playlist.kind === "manual") {
              setTrackIndex((i) => (i + 1) % trackCount);
            } else {
              playerRef.current?.nextVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, attachKey]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  // Poll playback position (and, for the live playlist, the now-playing
  // video) while playing. Paused while the user is dragging the seek bar.
useEffect(() => {
  if (ytState !== YT_STATE.PLAYING) return;
  const id = setInterval(() => {
    const p = playerRef.current;
    // Same guard as handleToggle: playerRef can point at a freshly
    // constructed player instance whose IFrame API handshake hasn't
    // finished (methods like getCurrentTime aren't attached yet), even
    // while ytState still reflects the previous track. `ready` only
    // flips true once onReady fires on *this* instance.
    if (!p || !ready || draggingRef.current) return;
    setCurrentTime(p.getCurrentTime());
    const d = p.getDuration();
    if (d) setDuration(d);
    syncNowPlaying(p);
  }, 250);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ytState, ready]);

  function handleSelectPlaylist(index: number) {
    if (index === playlistIndex) return;
    setPlaylistIndex(index);
    setTrackIndex(0); // switching playlist always restarts at track 1
    setExhausted(false);
    setLiveTitle(null);
    setYtTotal(null);
    skipAttemptsRef.current = 0;
  }

  function handlePrev() {
    if (playlist.kind === "manual") {
      setTrackIndex((i) => (i - 1 + playlist.tracks.length) % playlist.tracks.length);
    } else {
      playerRef.current?.previousVideo();
    }
  }

  function handleNext() {
    if (playlist.kind === "manual") {
      setTrackIndex((i) => (i + 1) % playlist.tracks.length);
    } else {
      playerRef.current?.nextVideo();
    }
  }

  function handleToggle() {
    const p = playerRef.current;
    // Guard on `ready` (set in onReady), not just on the ref being non-null:
    // `new YT.Player(...)` assigns the ref synchronously, but methods like
    // playVideo aren't attached to that object until onReady actually fires.
    // Calling them before then throws "playVideo is not a function".
    if (!p || !ready) {
      // Not ready yet — remember the gesture for onReady. Never disable the
      // button while waiting on a "canplay"-style event: iOS Safari won't
      // fire one before a user gesture, and the button would stay dead.
      pendingPlayRef.current = true;
      return;
    }
    if (ytState === YT_STATE.PLAYING) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }

  function handleSeek(fraction: number) {
    draggingRef.current = true;
    const targetDuration = duration || (manualItem ? parseDurationLabel(manualItem.duration) : 0);
    setCurrentTime(fraction * targetDuration);
    playerRef.current?.seekTo(fraction * targetDuration, true);

    clearTimeout(dragReleaseTimer.current);
    dragReleaseTimer.current = setTimeout(() => {
      draggingRef.current = false;
    }, 300);
  }

  const playing = ytState === YT_STATE.PLAYING;
  const effectiveDuration =
    duration || (manualItem ? parseDurationLabel(manualItem.duration) : 0);
  const progress = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  const displayTitle =
    playlist.kind === "manual" ? manualItem!.title : liveTitle ?? "Loading…";
  const displaySubtitle =
    playlist.kind === "manual"
      ? `${manualItem!.artist} · ${manualItem!.film}`
      : [liveAuthor, ytTotal ? `Track ${ytIndex + 1} of ${ytTotal}` : null]
        .filter(Boolean)
        .join(" · ") || "Bus Driver ki Playlist";

  return (
    <div className="relative z-10 w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0">
      <div className="mb-3 flex justify-center">
        <PlaylistTabs active={playlistIndex} onSelect={handleSelectPlaylist} />
      </div>

      {exhausted && (
        <p className="mb-2 text-center text-xs text-cream/60">
          Nothing in “{playlist.name}” will play right now — its videos may not allow
          embedding.
        </p>
      )}

      {/* DESKTOP — horizontal glass pill */}
      <div className="hidden items-center gap-4 rounded-full border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] p-3 pr-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-3xl backdrop-saturate-[1.7] sm:flex">
        <VinylMount containerId="yt-mount-desktop" size={80} spinning={playing} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <TrackMeta title={displayTitle} subtitle={displaySubtitle} />
          <SeekBar progress={progress} onSeek={handleSeek} disabled={!ready} />
          <div className="font-numeric text-[10.5px] tabular-nums text-cream/60">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </div>
        </div>
        <TransportControls
          playing={playing}
          disabled={!ready}
          onPrev={handlePrev}
          onToggle={handleToggle}
          onNext={handleNext}
        />
      </div>

      {/* MOBILE — stacked card */}
      <div className="flex flex-col gap-3 rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] p-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-3xl backdrop-saturate-[1.7] sm:hidden">
        <div className="flex items-center gap-3">
          <VinylMount containerId="yt-mount-mobile" size={64} spinning={playing} />
          <TrackMeta title={displayTitle} subtitle={displaySubtitle} />
        </div>
        <SeekBar progress={progress} onSeek={handleSeek} disabled={!ready} />
        <div className="flex items-center justify-between">
          <span className="font-numeric text-[10.5px] tabular-nums text-cream/60">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </span>
          <TransportControls
            playing={playing}
            disabled={!ready}
            size="sm"
            onPrev={handlePrev}
            onToggle={handleToggle}
            onNext={handleNext}
          />
          <span className="w-[54px]" aria-hidden />
        </div>
      </div>
    </div>
  );
}
