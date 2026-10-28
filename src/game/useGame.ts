import { useEffect, useRef, useState } from "react";
import { Game } from "./engine";

export function useGame() {
  const ref = useRef<Game | null>(null);
  if (!ref.current) ref.current = new Game();
  const g = ref.current;
  const [, setTick] = useState(0);
  const force = () => setTick((n) => (n + 1) % 1e9);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastStatus = g.s.status;
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      g.update(dt);
      if (g.s.status === "playing" || g.s.status !== lastStatus) force();
      lastStatus = g.s.status;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const st = g.s.status;
      if ((k === " " || k === "Enter") && (e.target as HTMLElement | null)?.closest("button, a, input, textarea, select")) return;
      if (st === "playing" && ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k)) e.preventDefault();
      // Results are a scrollable review: Space must scroll instead of restarting.
      if (st === "over") return;
      if (st === "menu") {
        if (k === "Enter" || k === " ") {
          e.preventDefault();
          g.start();
          window.scrollTo(0, 0);
          force();
        }
        return;
      }
      if (k === "p" || k === "P" || k === "Escape" || k === "з" || k === "З") {
        g.togglePause();
        force();
        return;
      }
      if (st !== "playing") {
        if (k === "Enter" || k === " ") {
          g.togglePause();
          force();
        }
        return;
      }
      if (e.repeat && (k === " " || k === "1" || k === "2" || k === "3")) return;
      switch (k) {
        case "ArrowLeft":
        case "a":
        case "A":
        case "ф":
        case "Ф":
          g.moveLane(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
        case "в":
        case "В":
          g.moveLane(1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
        case "ы":
        case "Ы":
          g.setSoft(true);
          break;
        case " ":
        case "ArrowUp":
          g.hardDrop();
          break;
        case "1":
          g.useBonus("slow");
          break;
        case "2":
          g.useBonus("hint");
          break;
        case "3":
          g.useBonus("bomb");
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (["ArrowDown", "s", "S", "ы", "Ы"].includes(e.key)) g.setSoft(false);
    };
    const onVis = () => {
      if (document.hidden) {
        g.pause();
        force();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { g, s: g.s, force };
}
