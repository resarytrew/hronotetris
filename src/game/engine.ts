import { EVENTS, shiftDate, type HistEvent } from "../data/events";
import { sfx } from "./audio";

export const LANES = 5;
export const LANE_W = 80;
export const CELL = 40;
export const PLAY_H = 720;
export const PLATE_H = 80;
export const BOARD_W = LANES * LANE_W;
export const CARD_W = 172;
export const CARD_H = 80;
export const MAX_STACK = 12;
export const LEVEL_STEP = 6;
export const COLORS = 7;

export function cardLayout(title: string) {
  if (title.length > 160) return { width: 304, height: 152, fontSize: 14 };
  if (title.length > 90) return { width: 284, height: 128, fontSize: 14 };
  if (title.length > 50) return { width: 244, height: 100, fontSize: 14 };
  return { width: CARD_W, height: CARD_H, fontSize: title.length <= 24 ? 16 : title.length <= 34 ? 14 : 13 };
}

export type BonusType = "slow" | "hint" | "bomb";
export type Status = "menu" | "playing" | "paused" | "over";

export interface Block {
  id: number;
  cs: [number, number];
}
export interface Card {
  ev: HistEvent;
  options: string[];
  correct: number;
  gold: boolean;
}
export interface Particle {
  id: number;
  x: number;
  y: number; // bottom px
  c: number;
  dx: number;
  dy: number;
  rot: number;
  until: number;
}
export interface Float {
  id: number;
  text: string;
  x: number;
  y: number; // top px in playfield
  color: string;
  until: number;
}
export interface Feedback {
  ok: boolean;
  chosen: number;
  correct: number;
  title: string;
  text: string;
  date: string;
  until: number;
}

export interface Answer {
  eventId: string;
  title: string;
  selectedDate: string;
  correctDate: string;
  correct: boolean;
  note?: string;
}

export interface GState {
  status: Status;
  phase: "falling" | "feedback";
  now: number;
  score: number;
  best: number;
  level: number;
  combo: number;
  mult: number;
  progress: number;
  totalCorrect: number;
  totalAnswered: number;
  maxCombo: number;
  lane: number;
  y: number;
  card: Card | null;
  next: Card | null;
  stacks: Block[][];
  particles: Particle[];
  floats: Float[];
  bonuses: Record<BonusType, number>;
  slowUntil: number;
  hintDim: number[];
  feedback: Feedback | null;
  bannerUntil: number;
  holdUntil: number;
  shakeUntil: number;
  flashUntil: number;
  blockedUntil: number;
  hard: boolean;
  soft: boolean;
  dropFrac: number;
  dying: boolean;
  pendingLevelUp: boolean;
  newBest: boolean;
  answers: Answer[];
  endReason: "limit" | "finished" | null;
}

const BEST_KEY = "chrono-blocks-best";

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export class Game {
  s!: GState;
  private bag: HistEvent[] = [];
  private uid = 1;
  private spawned = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.bag = [];
    this.spawned = 0;
    this.s = {
      status: "menu",
      phase: "falling",
      now: 0,
      score: 0,
      best: loadBest(),
      level: 1,
      combo: 0,
      mult: 1,
      progress: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      maxCombo: 0,
      lane: 2,
      y: 0,
      card: null,
      next: null,
      stacks: Array.from({ length: LANES }, () => []),
      particles: [],
      floats: [],
      bonuses: { slow: 1, hint: 1, bomb: 0 },
      slowUntil: 0,
      hintDim: [],
      feedback: null,
      bannerUntil: 0,
      holdUntil: 0,
      shakeUntil: 0,
      flashUntil: 0,
      blockedUntil: 0,
      hard: false,
      soft: false,
      dropFrac: 1,
      dying: false,
      pendingLevelUp: false,
      newBest: false,
      answers: [],
      endReason: null,
    };
  }

  start() {
    const best = this.s.best;
    this.reset();
    this.s.best = best;
    this.s.status = "playing";
    this.s.next = this.makeCard();
    this.spawn();
    this.s.holdUntil = 700;
    this.s.bannerUntil = 1500;
    sfx.start();
  }

  togglePause() {
    const s = this.s;
    if (s.status === "playing") this.pause();
    else if (s.status === "paused") s.status = "playing";
  }

  pause() {
    this.s.soft = false;
    if (this.s.status === "playing") this.s.status = "paused";
  }

  finish() {
    if (this.s.status !== "playing" && this.s.status !== "paused") return;
    this.s.endReason = "finished";
    this.gameOver();
  }

  toMenu() {
    const best = this.s.best;
    this.reset();
    this.s.best = best;
  }

  // ---------- cards ----------
  private nextEvent(): HistEvent {
    if (this.bag.length === 0) this.bag = shuffle(EVENTS);
    return this.bag.pop()!;
  }

  private makeCard(): Card {
    const ev = this.nextEvent();
    const level = this.s.level;
    const y = ev.y;
    const spread = y < 1000 ? 60 : y < 1500 ? 70 : y < 1800 ? 35 : 20;
    const R = Math.max(4, Math.round(spread * Math.max(0.2, 1.4 - (level - 1) * 0.12)));
    const set = new Set<number>([y]);
    let guard = 0;
    while (set.size < 5 && guard < 300) {
      guard++;
      const off = (1 + Math.floor(Math.random() * R)) * (Math.random() < 0.5 ? -1 : 1);
      const v = y + off;
      if (v > 0 && v <= 2025) set.add(v);
    }
    let k = 1;
    while (set.size < 5) {
      set.add(y - k);
      k++;
    }
    // Shift every year together so ranges retain their duration and date format.
    const options = [...set].sort((a, b) => a - b).map((year) => shiftDate(ev.date, year - y));
    this.spawned++;
    const gold = this.spawned > 3 && Math.random() < 0.12;
    return { ev, options, correct: options.indexOf(ev.date), gold };
  }

  private spawn() {
    const s = this.s;
    s.card = s.next ?? this.makeCard();
    s.next = this.makeCard();
    s.lane = 2;
    s.y = 0;
    s.hard = false;
    s.dropFrac = 1;
    s.hintDim = [];
    s.phase = "falling";
    s.feedback = null;
  }

  // ---------- helpers ----------
  landY(lane: number) {
    const height = this.s.card ? cardLayout(this.s.card.ev.t).height : CARD_H;
    return PLAY_H - this.s.stacks[lane].length * CELL - height;
  }

  private rid() {
    return this.uid++;
  }

  private rc() {
    return Math.floor(Math.random() * COLORS);
  }

  private addFloat(text: string, x: number, y: number, color = "#fff") {
    this.s.floats.push({ id: this.rid(), text, x, y, color, until: this.s.now + 1200 });
  }

  speed() {
    const s = this.s;
    let v = 48 + (s.level - 1) * 12;
    if (s.now < s.slowUntil) v *= 0.4;
    if (s.soft) v *= 4.5;
    if (s.hard) v = 2600;
    return v;
  }

  private clearRows(n: number) {
    const s = this.s;
    let removed = 0;
    for (let l = 0; l < LANES; l++) {
      for (let i = 0; i < n; i++) {
        const b = s.stacks[l].shift();
        if (!b) break;
        removed++;
        for (let c = 0; c < 2; c++) {
          s.particles.push({
            id: this.rid(),
            x: l * LANE_W + c * CELL,
            y: i * CELL,
            c: b.cs[c],
            dx: (Math.random() - 0.5) * 220 + (l - 2) * 40,
            dy: -(60 + Math.random() * 160),
            rot: (Math.random() - 0.5) * 360,
            until: s.now + 750,
          });
        }
      }
    }
    return removed;
  }

  private giveBonus(from = "") {
    const s = this.s;
    const r = Math.random();
    const type: BonusType = r < 0.4 ? "hint" : r < 0.75 ? "slow" : "bomb";
    s.bonuses[type] = Math.min(9, s.bonuses[type] + 1);
    const name = type === "hint" ? "ПОДСКАЗКА" : type === "slow" ? "ЗАМЕДЛЕНИЕ" : "ВЗРЫВ";
    this.addFloat(`+ ${name}`, BOARD_W / 2, 120 + (from ? 0 : 0), "#ffe14d");
    sfx.bonus();
  }

  // ---------- controls ----------
  moveLane(dir: number) {
    const s = this.s;
    if (s.status !== "playing" || s.phase !== "falling" || s.hard || s.now < s.holdUntil) return;
    const nl = Math.max(0, Math.min(LANES - 1, s.lane + dir));
    if (nl === s.lane) return;
    const top = PLAY_H - s.stacks[nl].length * CELL;
    const height = s.card ? cardLayout(s.card.ev.t).height : CARD_H;
    if (s.y + height > top - 2) {
      s.blockedUntil = s.now + 300;
      sfx.blocked();
      return;
    }
    s.lane = nl;
    sfx.move();
  }

  goToLane(target: number) {
    const s = this.s;
    if (s.status !== "playing" || s.phase !== "falling") return;
    if (target === s.lane) {
      this.hardDrop();
      return;
    }
    let guard = 0;
    while (s.lane !== target && guard++ < 6) {
      const before = s.lane;
      this.moveLane(target > s.lane ? 1 : -1);
      if (s.lane === before) break;
    }
  }

  hardDrop() {
    const s = this.s;
    if (s.status !== "playing" || s.phase !== "falling" || s.hard || s.now < s.holdUntil) return;
    const ly = this.landY(s.lane);
    s.dropFrac = Math.min(1, Math.max(0, s.y / Math.max(1, ly)));
    s.hard = true;
    sfx.drop();
  }

  setSoft(v: boolean) {
    this.s.soft = v;
  }

  useBonus(type: BonusType) {
    const s = this.s;
    if (s.status !== "playing" || s.phase !== "falling" || s.bonuses[type] <= 0) return;
    if (type === "slow") {
      if (s.now < s.slowUntil) return;
      s.slowUntil = s.now + 9000;
    } else if (type === "hint") {
      if (s.hintDim.length || !s.card) return;
      const wrong = [0, 1, 2, 3, 4].filter((l) => l !== s.card!.correct);
      s.hintDim = shuffle(wrong).slice(0, 2);
    } else {
      const n = this.clearRows(3);
      if (n === 0) return;
      const pts = n * 20 * s.mult;
      s.score += pts;
      s.flashUntil = s.now + 500;
      s.shakeUntil = s.now + 450;
      this.addFloat(`+${pts}`, BOARD_W / 2, PLAY_H - 200, "#ff9d3a");
    }
    s.bonuses[type]--;
    sfx.bonus();
  }

  // ---------- loop ----------
  update(dt: number) {
    const s = this.s;
    if (s.status !== "playing") return;
    s.now += dt;
    if (s.particles.length && s.particles.some((p) => p.until <= s.now))
      s.particles = s.particles.filter((p) => p.until > s.now);
    if (s.floats.length && s.floats.some((p) => p.until <= s.now))
      s.floats = s.floats.filter((p) => p.until > s.now);

    if (s.phase === "feedback") {
      if (s.feedback && s.now >= s.feedback.until) this.finishFeedback();
      return;
    }
    if (s.now < s.holdUntil || !s.card) return;

    const ly = this.landY(s.lane);
    s.y += (this.speed() * dt) / 1000;
    if (s.y >= ly) {
      s.y = ly;
      this.land();
    }
  }

  private land() {
    const s = this.s;
    const card = s.card!;
    const ok = s.lane === card.correct;
    const cx = s.lane * LANE_W + LANE_W / 2;
    s.totalAnswered++;
    s.answers.push({
      eventId: card.ev.id,
      title: card.ev.t,
      selectedDate: card.options[s.lane],
      correctDate: card.ev.date,
      correct: ok,
      note: card.ev.note,
    });
    s.hard = false;

    if (ok) {
      s.combo++;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.mult = Math.min(5, 1 + Math.floor(s.combo / 3));
      const speedBonus = Math.round(60 * (1 - s.dropFrac));
      let pts = (100 + s.level * 10 + speedBonus) * s.mult * (card.gold ? 2 : 1);
      const cleared = this.clearRows(1);
      pts += cleared * 15 * s.mult;
      s.score += pts;
      s.totalCorrect++;
      s.progress++;
      this.addFloat(`+${pts}`, cx, s.y - 10, card.gold ? "#ffe14d" : "#7dffb0");
      if (card.gold || s.combo % 4 === 0) this.giveBonus();
      if (s.progress >= LEVEL_STEP) s.pendingLevelUp = true;
      s.feedback = {
        ok: true,
        chosen: s.lane,
        correct: card.correct,
        title: s.combo >= 3 ? `ВЕРНО! СЕРИЯ ×${s.combo}` : "ВЕРНО!",
        text: card.ev.t,
        date: card.ev.date,
        until: s.now + 1300,
      };
      sfx.correct();
    } else {
      s.combo = 0;
      s.mult = 1;
      for (let i = 0; i < 2; i++) s.stacks[s.lane].push({ id: this.rid(), cs: [this.rc(), this.rc()] });
      s.shakeUntil = s.now + 450;
      this.addFloat("ОШИБКА", cx, s.y - 10, "#ff6b6b");
      if (s.stacks[s.lane].length >= MAX_STACK) s.dying = true;
      s.feedback = {
        ok: false,
        chosen: s.lane,
        correct: card.correct,
        title: "НЕВЕРНО",
        text: card.ev.t,
        date: card.ev.date,
        until: s.now + 2300,
      };
      sfx.wrong();
    }
    s.phase = "feedback";
  }

  private finishFeedback() {
    const s = this.s;
    if (s.dying) {
      this.gameOver();
      return;
    }
    if (s.pendingLevelUp) {
      s.pendingLevelUp = false;
      s.level++;
      s.progress = 0;
      s.bannerUntil = s.now + 1700;
      s.holdUntil = s.now + 1500;
      this.giveBonus();
      sfx.level();
    }
    this.spawn();
  }

  private gameOver() {
    const s = this.s;
    s.endReason ??= "limit";
    s.soft = false;
    s.status = "over";
    if (s.score > s.best) {
      s.best = s.score;
      s.newBest = true;
      try {
        localStorage.setItem(BEST_KEY, String(s.best));
      } catch {
        /* ignore */
      }
    }
    sfx.over();
  }
}
