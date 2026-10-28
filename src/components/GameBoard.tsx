import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { BOARD_W, PLAY_H, MAX_STACK, LANE_W, cardLayout, type GState, type Game } from "../game/engine";

export function GameBoard({ state: s, game: g, onChange }: { state: GState; game: Game; onChange: () => void }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  useLayoutEffect(() => {
    const field = fieldRef.current!;
    const observer = new ResizeObserver(([entry]) => setScale({ x: entry.contentRect.width / BOARD_W, y: entry.contentRect.height / PLAY_H }));
    observer.observe(field);
    return () => observer.disconnect();
  }, []);
  const card = s.card;
  const layout = cardLayout(card?.ev.t ?? "");
  const cardLeft = Math.max(0, Math.min(BOARD_W - layout.width, s.lane * LANE_W + LANE_W / 2 - layout.width / 2));
  const fb = s.feedback;
  const chooseLane = (lane: number) => { g.goToLane(lane); onChange(); };

  return (
    <div className={"board" + (s.now < s.slowUntil ? " slow" : "") + (s.now < s.shakeUntil ? " shake" : "")} aria-label="Игровое поле">
      <div className="playfield" ref={fieldRef} onPointerDown={(e) => {
        if (s.status !== "playing") return;
        const rect = e.currentTarget.getBoundingClientRect();
        chooseLane(Math.max(0, Math.min(4, Math.floor((e.clientX - rect.left) / rect.width * 5))));
      }}>
        <div className="game-world" style={{ transform: `scale(${scale.x}, ${scale.y})` }}>
          {card && <div className="beam" style={{ left: s.lane * LANE_W }} />}
          <div className={"danger" + (Math.max(...s.stacks.map(col => col.length)) >= MAX_STACK - 3 ? " hot" : "")} style={{ top: PLAY_H - MAX_STACK * 40 }}><span>ПРЕДЕЛ</span></div>
          {s.stacks.map((col, lane) => col.map((block, row) => (
            <div key={block.id} className="brow" style={{ left: lane * LANE_W, bottom: row * 40 }}><div className={"blk c" + block.cs[0]} /><div className={"blk c" + block.cs[1]} /></div>
          )))}
          {s.particles.map(p => <div key={p.id} className={"prt blk c" + p.c} style={{ left: p.x, bottom: p.y, "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg` } as CSSProperties} />)}
          {card && s.phase === "falling" && <div className="ghost" style={{ left: s.lane * LANE_W, top: g.landY(s.lane), height: layout.height }} />}
          {s.floats.map(f => <div key={f.id} className="floatTxt" style={{ left: f.x, top: f.y, color: f.color }}>{f.text}</div>)}
          {s.now < s.flashUntil && <div className="flash" />}
        </div>
        {card && <div key={`${s.totalAnswered}-${card.ev.id}`} className={"ecard" + (card.gold ? " gold" : "") + (fb ? fb.ok ? " ok" : " bad" : "") + (s.hard ? " hard" : "")} style={{ left: `${cardLeft / BOARD_W * 100}%`, top: `${s.y / PLAY_H * 100}%`, width: `${layout.width / BOARD_W * 100}%`, height: `${layout.height / PLAY_H * 100}%`, fontSize: 14, pointerEvents: "none" }}>
          {card.gold && <span className="star">✦</span>}
          <span className="falling-title">{card.ev.t}</span>
          <span className="falling-mobile">СОБЫТИЕ {s.totalAnswered + (s.phase === "feedback" ? 0 : 1)}{card.gold ? " ★" : ""}</span>
          <div className="notch" style={{ left: `${(s.lane * LANE_W + LANE_W / 2 - cardLeft) / layout.width * 100}%` }} />
        </div>}
        {fb && <div className={"toast " + (fb.ok ? "ok" : "bad")} role="status" key={s.totalAnswered}>
          <strong>{fb.title}</strong><span>{fb.text}</span><b>{fb.date} {/^\d+$/.test(fb.date) ? "г." : "гг."}</b>
        </div>}
        {s.now < s.bannerUntil && <div className="level-banner"><strong>Уровень {s.level}</strong><span>{s.level === 1 ? "Выбери верную дату" : "Скорость растёт"}</span></div>}
      </div>
      <div className="plates" role="group" aria-label="Варианты даты">
        {(card?.options ?? []).map((date, i) => {
          const classes = ["plate"];
          if (fb) { if (i === fb.correct) classes.push("ok"); else if (!fb.ok && i === fb.chosen) classes.push("bad"); }
          else { if (i === s.lane) classes.push("active"); if (s.hintDim.includes(i)) classes.push("dim"); }
          return <button key={i} className={classes.join(" ")} aria-label={`Дата ${date}`} aria-pressed={i === s.lane} onClick={() => chooseLane(i)} disabled={s.status !== "playing" || s.phase !== "falling"}>
            <span className={"yr" + (!/^\d+$/.test(date) ? " yr-multiple" : "")}>{date.replace(/\s*([–,])\s*/g, "$1\n")}</span><span className="gd">{/^\d+$/.test(date) ? "год" : "годы"}</span>
          </button>;
        })}
      </div>
    </div>
  );
}
