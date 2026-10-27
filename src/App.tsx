import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import bg from "./assets/bg.jpg";
import { useGame } from "./game/useGame";
import {
  BOARD_W,
  cardLayout,
  LANES,
  LANE_W,
  LEVEL_STEP,
  MAX_STACK,
  PLAY_H,
  type BonusType,
  type Card,
} from "./game/engine";
import { isMuted, setMuted } from "./game/audio";
import { BombIcon, HintIcon, PauseIcon, PlayIcon, SlowIcon, SoundIcon } from "./components/Icons";
import { GameLogo } from "./components/GameLogo";

const STAGE_W = 640;
const STAGE_H = 1060;
const BOARD_X = 120;
const BOARD_Y = 110;

function useScale() {
  const [sc, setSc] = useState(1);
  useEffect(() => {
    const f = () => setSc(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return sc;
}

function SidePanel(props: { x: number; y: number; h: number; label?: string; children: ReactNode; tone?: string }) {
  return (
    <>
      <div className="panel" data-tone={props.tone} style={{ left: props.x, top: props.y, width: 92, height: props.h }}>
        {props.children}
      </div>
      {props.label && (
        <div className="lbl" style={{ left: props.x - 6, top: props.y + props.h + 6, width: 104, fontSize: 15 }}>
          {props.label}
        </div>
      )}
    </>
  );
}

function BonusBtn(props: {
  y: number;
  type: BonusType;
  count: number;
  keyLabel: string;
  name: string;
  icon: ReactNode;
  active?: boolean;
  progress?: number;
  onUse: (t: BonusType) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={"bonus" + (props.active ? " active" : "")}
      data-tone={props.type === "slow" ? "mint" : props.type === "hint" ? "violet" : "coral"}
      style={{ left: 14, top: props.y }}
      disabled={props.count <= 0 || props.disabled}
      onClick={() => props.onUse(props.type)}
      title={props.name}
    >
      <span className="key">{props.keyLabel}</span>
      <span className="cnt">×{props.count}</span>
      <span style={{ marginTop: 10 }}>{props.icon}</span>
      <span className="font-display" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
        {props.name}
      </span>
      {props.active && (
        <span
          style={{
            position: "absolute",
            left: 6,
            bottom: 5,
            height: 4,
            width: `${Math.max(0, (props.progress ?? 0) * 78)}px`,
            background: "var(--accent)",
            borderRadius: 2,
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      )}
    </button>
  );
}

function MenuDemo() {
  const years = [986, 987, 988, 989, 990];
  return (
    <div style={{ position: "relative", width: 400, height: 250 }}>
      <div style={{ position: "absolute", left: 114, top: 0, animation: "demoFall 2.6s ease-in infinite" }}>
        <div className="ecard" style={{ position: "relative", animation: "none", fontSize: 18, width: 172 }}>
          Крещение Руси
          <div className="notch" style={{ left: 86 }} />
        </div>
      </div>
      <div className="plates" style={{ position: "absolute", bottom: 0, left: 0, width: 400, border: "2px solid var(--frame)", borderRadius: 4 }}>
        {years.map((y, i) => (
          <div
            key={y}
            className="plate"
            style={i === 2 ? { animation: "demoPlate 2.6s ease-in infinite", background: "linear-gradient(180deg,#315b50,#1c3730)" } : undefined}
          >
            <span className="yr">{y}</span>
            <span className="gd">год</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { g, s, force } = useGame();
  const sc = useScale();
  const boardRef = useRef<HTMLDivElement>(null);
  const [muted, setMutedState] = useState(isMuted());

  // не даём кнопкам удерживать фокус, чтобы пробел не нажимал их повторно
  useEffect(() => {
    const h = (e: MouseEvent) => (e.target as HTMLElement | null)?.closest("button")?.blur();
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const act = (fn: () => void) => () => {
    fn();
    force();
  };

  const onBoardPointer = (e: React.PointerEvent) => {
    if (s.status !== "playing") return;
    const r = boardRef.current!.getBoundingClientRect();
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor(((e.clientX - r.left) / r.width) * LANES)));
    g.goToLane(lane);
    force();
  };

  const card: Card | null = s.card;
  const showGame = s.status !== "menu";
  const fb = s.feedback;
  const layout = cardLayout(card?.ev.t ?? "");
  const cardLeft = Math.max(0, Math.min(BOARD_W - layout.width, s.lane * LANE_W + LANE_W / 2 - layout.width / 2));
  const ghostY = g.landY(s.lane);
  const maxStack = Math.max(...s.stacks.map((x) => x.length));
  const slowActive = s.now < s.slowUntil;
  const accuracy = s.totalAnswered ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 100;
  const multColor = ["var(--accent)", "var(--accent)", "#9dffb8", "#ffe14d", "#ffa23a", "#ff5a5a"][s.mult] ?? "#fff";

  const stageStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: STAGE_W,
    height: STAGE_H,
    marginLeft: -STAGE_W / 2,
    marginTop: -STAGE_H / 2,
    transform: `scale(${sc})`,
    transformOrigin: "center center",
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--canvas)" }}>
      <div className="backdrop" style={{ backgroundImage: `url(${bg})` }} />
      <div className="sweep" />

      <div style={stageStyle}>
        {/* ---------- HUD ---------- */}
        <div style={{ position: "absolute", left: 170, width: 300, top: 8, textAlign: "center" }}>
          <div className="tiny" style={{ marginBottom: -2 }}>очки</div>
          <div key={s.score} className="stroke-score" style={{ fontSize: 58, lineHeight: 1.1 }}>
            {s.score.toLocaleString("ru-RU")}
          </div>
        </div>

        <button
          className="hud-btn"
          style={{ left: 478, top: 14, width: 70 }}
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-label="Звук"
        >
          <SoundIcon off={muted} />
        </button>
        <button
          className="hud-btn"
          style={{ left: 556, top: 14, width: 70 }}
          onClick={act(() => g.togglePause())}
          disabled={s.status === "menu" || s.status === "over"}
          aria-label="Пауза"
        >
          {s.status === "paused" ? <PlayIcon /> : <PauseIcon />}
        </button>

        {/* ---------- left side ---------- */}
        <SidePanel x={14} y={BOARD_Y} h={120} label="УРОВЕНЬ" tone="amber">
          <div key={s.level} className="big-num" style={{ fontSize: 56, animation: "scorePop 0.4s ease-out" }}>
            {s.level}
          </div>
        </SidePanel>

        <BonusBtn
          y={292}
          type="slow"
          count={s.bonuses.slow}
          keyLabel="1"
          name="ЗАМЕДЛИТЬ"
          icon={<SlowIcon />}
          active={slowActive}
          progress={(s.slowUntil - s.now) / 9000}
          onUse={(t) => act(() => g.useBonus(t))()}
          disabled={slowActive}
        />
        <BonusBtn
          y={402}
          type="hint"
          count={s.bonuses.hint}
          keyLabel="2"
          name="ПОДСКАЗКА"
          icon={<HintIcon />}
          onUse={(t) => act(() => g.useBonus(t))()}
          disabled={s.hintDim.length > 0}
        />
        <BonusBtn
          y={512}
          type="bomb"
          count={s.bonuses.bomb}
          keyLabel="3"
          name="ВЗРЫВ"
          icon={<BombIcon />}
          onUse={(t) => act(() => g.useBonus(t))()}
        />
        <div className="lbl" style={{ left: 8, top: 620, width: 104, fontSize: 15 }}>БОНУСЫ</div>

        <SidePanel x={14} y={690} h={100} label="РЕКОРД" tone="amber">
          <div className="big-num" style={{ fontSize: 22 }}>{Math.max(s.best, s.score).toLocaleString("ru-RU")}</div>
        </SidePanel>

        {/* ---------- right side ---------- */}
        <SidePanel x={534} y={BOARD_Y} h={120} label="ДАЛЕЕ" tone="violet">
          {s.next ? (
            <div
              title={s.next.ev.t}
              style={{
                padding: "0 6px",
                textAlign: "center",
                fontWeight: 700,
                fontSize: s.next.ev.t.length > 34 ? 10.5 : 12,
                lineHeight: 1.2,
                color: s.next.gold ? "#ffe14d" : "#e4d9ed",
                display: "-webkit-box",
                WebkitLineClamp: 7,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {s.next.gold && <div style={{ fontSize: 16 }}>★</div>}
              {s.next.ev.t}
            </div>
          ) : (
            <div className="tiny">—</div>
          )}
        </SidePanel>

        <SidePanel x={534} y={292} h={110} label="МНОЖИТЕЛЬ" tone="violet">
          <div key={s.mult} className="big-num" style={{ fontSize: 52, color: multColor, animation: "scorePop 0.4s ease-out" }}>
            x{s.mult}
          </div>
        </SidePanel>

        <SidePanel x={534} y={450} h={96} label="СЕРИЯ" tone="coral">
          <div key={s.combo} className="big-num" style={{ fontSize: 40, animation: "scorePop 0.3s ease-out" }}>
            {s.combo}
          </div>
        </SidePanel>

        <SidePanel x={534} y={594} h={96} label="ТОЧНОСТЬ" tone="mint">
          <div className="big-num" style={{ fontSize: 28 }}>{accuracy}%</div>
          <div className="tiny" style={{ marginTop: 2 }}>
            {s.totalCorrect}/{s.totalAnswered}
          </div>
        </SidePanel>

        {/* ---------- board ---------- */}
        <div
          ref={boardRef}
          className={"board" + (slowActive ? " slow" : "") + (s.now < s.shakeUntil ? " shake" : "")}
          style={{ left: BOARD_X - 3, top: BOARD_Y - 3, width: BOARD_W, height: PLAY_H + 80, boxSizing: "content-box" }}
          onPointerDown={onBoardPointer}
        >
          <div className="playfield">
            {showGame && card && (
              <div className="beam" style={{ left: s.lane * LANE_W }} />
            )}

            <div
              className={"danger" + (maxStack >= MAX_STACK - 3 ? " hot" : "")}
              style={{ top: PLAY_H - MAX_STACK * 40 }}
            >
              <span>ПРЕДЕЛ</span>
            </div>

            {/* stacks */}
            {s.stacks.map((col, l) =>
              col.map((b, r) => (
                <div key={b.id} className="brow" style={{ left: l * LANE_W, bottom: r * 40 }}>
                  <div className={"blk c" + b.cs[0]} />
                  <div className={"blk c" + b.cs[1]} />
                </div>
              ))
            )}

            {/* particles */}
            {s.particles.map((p) => (
              <div
                key={p.id}
                className={"prt blk c" + p.c}
                style={{ left: p.x, bottom: p.y, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, ["--rot" as string]: `${p.rot}deg` }}
              />
            ))}

            {/* ghost + card */}
            {showGame && card && s.phase === "falling" && s.status !== "menu" && (
              <div className="ghost" style={{ left: s.lane * LANE_W, top: ghostY, height: layout.height }} />
            )}
            {showGame && card && (
              <div
                key={s.totalAnswered + "-" + card.ev.t}
                className={"ecard" + (card.gold ? " gold" : "") + (fb ? (fb.ok ? " ok" : " bad") : "") + (s.hard ? " hard" : "")}
                style={{ left: cardLeft, top: s.y, ...layout }}
              >
                {card.gold && <span className="star">✦</span>}
                <span>{card.ev.t}</span>
                <div className="notch" style={{ left: s.lane * LANE_W + LANE_W / 2 - cardLeft }} />
              </div>
            )}

            {/* floats */}
            {s.floats.map((f) => (
              <div key={f.id} className="floatTxt" style={{ left: f.x, top: f.y, color: f.color }}>
                {f.text}
              </div>
            ))}

            {s.now < s.flashUntil && <div className="flash" />}

            {fb && s.status !== "over" && (
              <div className={"toast " + (fb.ok ? "ok" : "bad")} key={"t" + s.totalAnswered}>
                <div className="font-display" style={{ fontSize: 22, color: fb.ok ? "#5dffa0" : "#ff6b78" }}>
                  {fb.title}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, margin: "4px 0 2px", color: "#fff" }}>{fb.text}</div>
                <div className="font-display" style={{ fontSize: 34, color: "#ffe14d", textShadow: "0 0 14px rgba(255,200,0,.7)" }}>
                  {fb.date} {/^\d+$/.test(fb.date) ? "г." : "гг."}
                </div>
              </div>
            )}

            {s.status === "playing" && s.now < s.bannerUntil && (
              <div className="banner">
                <div className="title-grad" style={{ fontSize: 54, lineHeight: 1 }}>
                  УРОВЕНЬ {s.level}
                </div>
                <div className="font-display" style={{ color: "#ffe14d", fontSize: 16, marginTop: 8, letterSpacing: "0.1em" }}>
                  {s.level === 1 ? "ГОТОВЬСЯ!" : "СКОРОСТЬ РАСТЁТ!"}
                </div>
              </div>
            )}
          </div>

          {/* answer plates */}
          <div className="plates">
            {(card ? card.options : ["", "", "", "", ""]).map((date, i) => {
              const cls = ["plate"];
              if (showGame && card) {
                if (fb) {
                  if (i === fb.correct) cls.push("ok");
                  else if (!fb.ok && i === fb.chosen) cls.push("bad");
                } else {
                  if (i === s.lane) cls.push("active");
                  if (s.hintDim.includes(i)) cls.push("dim");
                }
              }
              return (
                <div key={i} className={cls.join(" ")}>
                  <span className={"yr" + (date && !/^\d+$/.test(date) ? " yr-multiple" : "")}>
                    {card && showGame ? date.replace(/\s*([-–,])\s*/g, "$1\n") : "—"}
                  </span>
                  <span className="gd">{date && !/^\d+$/.test(date) ? "годы" : "год"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- progress ---------- */}
        <div className="progress" style={{ left: BOARD_X + 6, top: 926, width: BOARD_W - 12 }}>
          <div style={{ width: `${(s.progress / LEVEL_STEP) * 100}%` }} />
        </div>
        <div className="lbl" style={{ left: BOARD_X, width: BOARD_W, top: 946, fontSize: 18 }}>
          {s.progress}/{LEVEL_STEP} · до уровня {s.level + 1}
        </div>

        {/* ---------- touch controls ---------- */}
        <button className="ctrl" style={{ left: BOARD_X, top: 984, width: 112 }} onPointerDown={(e) => { e.stopPropagation(); g.moveLane(-1); force(); }}>
          ◄
        </button>
        <button
          className="ctrl ctrl-drop"
          style={{ left: BOARD_X + 124, top: 984, width: 152, fontSize: 18 }}
          onPointerDown={(e) => { e.stopPropagation(); g.hardDrop(); force(); }}
        >
          СБРОС ▼
        </button>
        <button className="ctrl" style={{ left: BOARD_X + 288, top: 984, width: 112 }} onPointerDown={(e) => { e.stopPropagation(); g.moveLane(1); force(); }}>
          ►
        </button>
        <div className="tiny" style={{ position: "absolute", left: 0, width: STAGE_W, top: 1046, textAlign: "center", fontSize: 10, opacity: 0.75 }}>
          ← → выбор · ↓ ускорить · ПРОБЕЛ сбросить · 1 2 3 бонусы · P пауза
        </div>

        {/* ---------- overlays ---------- */}
        {s.status === "menu" && (
          <div className="overlay">
            <GameLogo />
            <div className="font-display" style={{ color: "#ffe14d", letterSpacing: "0.22em", fontSize: 16, margin: "14px 0 26px", textShadow: "0 0 12px rgba(255,200,0,.6)" }}>
              ТЕТРИС ПО ИСТОРИИ
            </div>
            <MenuDemo />
            <div style={{ width: 430, margin: "26px 0 24px", color: "#dedbd3", fontWeight: 600, fontSize: 15, lineHeight: 1.45 }}>
              {[
                ["◆", "Сверху падает историческое событие — направь его в плитку с верной датой."],
                ["◆", "Верный ответ убирает нижний ряд, ошибка — растит башню. Достигнет предела — игра окончена."],
                ["★", "Золотые карточки дают ×2 очков и бонус. Серия ответов повышает множитель до ×5."],
              ].map(([i, t]) => (
                <div key={t} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: "#ffe14d" }}>{i}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <button className="btn-main" onClick={act(() => g.start())}>
              ИГРАТЬ
            </button>
            {s.best > 0 && (
              <div className="font-display" style={{ color: "var(--accent)", marginTop: 18, fontSize: 15 }}>
                РЕКОРД: {s.best.toLocaleString("ru-RU")}
              </div>
            )}
            <div className="tiny" style={{ marginTop: 10, opacity: 0.8 }}>
              Касание полосы — переместить, повторное — сбросить
            </div>
          </div>
        )}

        {s.status === "paused" && (
          <div className="overlay">
            <div className="title-grad" style={{ fontSize: 64 }}>ПАУЗА</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34, alignItems: "center" }}>
              <button className="btn-main" style={{ fontSize: 24 }} onClick={act(() => g.togglePause())}>
                ПРОДОЛЖИТЬ
              </button>
              <button className="btn-sec" onClick={act(() => g.start())}>
                НАЧАТЬ ЗАНОВО
              </button>
            </div>
          </div>
        )}

        {s.status === "over" && (
          <div className="overlay">
            <div className="title-grad" style={{ fontSize: 60, textAlign: "center", lineHeight: 1 }}>
              КОНЕЦ ИГРЫ
            </div>
            {s.newBest && (
              <div className="font-display" style={{ color: "#ffe14d", fontSize: 22, marginTop: 16, animation: "ctaPulse 1s ease-in-out infinite", textShadow: "0 0 16px rgba(255,200,0,.9)" }}>
                ★ НОВЫЙ РЕКОРД ★
              </div>
            )}
            <div className="tiny" style={{ marginTop: 26 }}>ваш счёт</div>
            <div className="stroke-score" style={{ fontSize: 76 }}>{s.score.toLocaleString("ru-RU")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 120px)", gap: 14, margin: "28px 0 34px" }}>
              {[
                ["УРОВЕНЬ", s.level],
                ["ВЕРНО", `${s.totalCorrect}/${s.totalAnswered}`],
                ["СЕРИЯ", s.maxCombo],
              ].map(([k, v]) => (
                <div key={k} className="panel" style={{ position: "relative", height: 90 }}>
                  <div className="big-num" style={{ fontSize: 28 }}>{v}</div>
                  <div className="tiny" style={{ marginTop: 4 }}>{k}</div>
                </div>
              ))}
            </div>
            <button className="btn-main" onClick={act(() => g.start())}>
              ИГРАТЬ СНОВА
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
