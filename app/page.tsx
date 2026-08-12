import ClockWidget from "@/components/ClockWidget";
// import ListenerCount from "@/components/ListenerCount";
// import SocialLinks from "@/components/SocialLinks";
import Player from "@/components/Player";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      {/* 1. background — swaps scene-wide.png / scene-tall.png by orientation */}
      <div className="fixed inset-0 -z-20 bg-cover bg-center hero-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      </div>

      {/* 2. grain overlay */}
      <div className="fixed inset-0 -z-10 grain-overlay" />

      {/* 3. fixed top row */}
      <div className="fixed inset-x-0 top-0 z-20 grid grid-cols-3 items-start gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="justify-self-start">
          <ClockWidget />
        </div>
        {/* <div className="justify-self-center">
          <ListenerCount />
        </div> */}
        {/* <div className="justify-self-end">
          <SocialLinks />
        </div> */}
      </div>

      {/* spacer so the fixed top row doesn't visually collide on very short viewports */}
      <div aria-hidden className="h-16 shrink-0" />

      {/* 4. the player, bottom-anchored */}
      <Player />
    </main>
  );
}
