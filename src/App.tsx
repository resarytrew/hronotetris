import { useState } from "react";
import bg from "./assets/bg.jpg";
import { useGame } from "./game/useGame";
import { LEVEL_STEP, type BonusType } from "./game/engine";
import { EVENTS } from "./data/events";
import { isMuted, setMuted } from "./game/audio";
import { BombIcon, HintIcon, PauseIcon, SlowIcon, SoundIcon } from "./components/Icons";
import { GameLogo } from "./components/GameLogo";
import { GameBoard } from "./components/GameBoard";
import { GameResults } from "./components/GameResults";
import "./responsive.css";

const bonusInfo = {
  slow: { label: "Замедлить", key: "1", tone: "mint", Icon: SlowIcon },
  hint: { label: "Подсказка", key: "2", tone: "violet", Icon: HintIcon },
  bomb: { label: "Взрыв", key: "3", tone: "coral", Icon: BombIcon },
};

export default function App() {
  const { g, s, force } = useGame();
  const [muted, setMutedState] = useState(isMuted());
  const act = (fn: () => void) => { fn(); force(); };
  const start = () => { act(() => g.start()); window.scrollTo(0, 0); };
  const accuracy = s.totalAnswered ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  const slowActive = s.now < s.slowUntil;

  return (
    <main className="app-shell">
      <div className="backdrop" style={{ backgroundImage: `url(${bg})` }} />
      <div className="sweep" />
      {s.status === "menu" ? (
        <section className="menu-screen" aria-label="Главное меню">
          <GameLogo />
          <p className="menu-tagline">Исторические даты в ритме аркады</p>
          <div className="menu-chips"><span>История России</span><span>862–1801</span><span>{EVENTS.length} событий</span></div>
          <div className="menu-example" aria-hidden="true">
            <div className="example-card">Крещение Руси</div><span className="example-arrow">↓</span>
            <div className="example-dates">{[986, 987, 988, 989, 990].map(year => <span className={year === 988 ? "example-correct" : ""} key={year}>{year}</span>)}</div>
          </div>
          <ol className="menu-rules">
            <li><span>01</span><p>Прочитай событие и выбери полосу с верной датой.</p></li>
            <li><span>02</span><p>Верный ответ убирает блоки. Ошибки растят башню до предела.</p></li>
            <li><span>03</span><p>Собирай серии, используй бонусы, а после партии разбери ошибки.</p></li>
          </ol>
          <button className="btn-main" onClick={start}>Играть</button>
          {s.best > 0 && <p className="menu-best">Личный рекорд: {s.best.toLocaleString("ru-RU")}</p>}
          <p className="menu-help">← → выбор · пробел — сброс · P — пауза<br />На телефоне: коснись даты, повторное касание — сброс.</p>
        </section>
      ) : s.status === "over" ? (
        <GameResults state={s} onRestart={start} onMenu={() => act(() => g.toMenu())} />
      ) : (
        <>
          <div className="game-shell" inert={s.status === "paused"}>
            <header className="game-topbar">
              <div className="game-brand">ХРОНО<span>ТЕТРИС</span></div>
              <div className="score-summary"><span>очки</span><strong>{s.score.toLocaleString("ru-RU")}</strong></div>
              <div className="topbar-actions">
                <button className="hud-btn" aria-label={muted ? "Включить звук" : "Выключить звук"} onClick={() => { setMuted(!muted); setMutedState(!muted); }}><SoundIcon off={muted} /></button>
                <button className="hud-btn" aria-label="Пауза" onClick={() => act(() => g.pause())}><PauseIcon /></button>
              </div>
            </header>
            <section className="game-stats" aria-label="Показатели партии">
              {[["Уровень", s.level, "amber"], ["Точность", s.totalAnswered ? `${accuracy}%` : "—", "mint"], ["Серия", s.combo, "coral"], ["Множитель", `×${s.mult}`, "violet"]].map(([label, value, tone]) => (
                <div className="stat" data-tone={tone} key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </section>
            <div className="arena-layout">
              <aside className="bonus-bank" aria-label="Бонусы">
                {(Object.keys(bonusInfo) as BonusType[]).map(type => {
                  const info = bonusInfo[type];
                  const active = type === "slow" && slowActive;
                  return <button key={type} className={"bonus" + (active ? " active" : "")} data-tone={info.tone} title={`${info.label} · клавиша ${info.key}`} disabled={s.phase !== "falling" || s.bonuses[type] <= 0 || active || (type === "hint" && s.hintDim.length > 0)} onClick={() => act(() => g.useBonus(type))}>
                    <span className="bonus-shortcut">{info.key}</span><info.Icon /><span className="bonus-label">{info.label}</span><span className="bonus-count">×{s.bonuses[type]}</span>
                    {active && <span className="bonus-timer" style={{ width: `${Math.max(0, (s.slowUntil - s.now) / 9000) * 100}%` }} />}
                  </button>;
                })}
              </aside>
              <section className="arena-column" aria-label="Текущая карточка">
                <div className={"current-question" + (s.card?.gold ? " question-gold" : "")}>
                  <div className="question-caption"><span>Событие {s.totalAnswered + (s.phase === "feedback" ? 0 : 1)}</span>{s.card?.gold && <span>★ Золотая карточка · ×2</span>}</div>
                  <h1>{s.card?.ev.t}</h1>
                </div>
                <GameBoard state={s} game={g} onChange={force} />
                <div className="level-progress"><div className="progress" role="progressbar" aria-label="До следующего уровня" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={LEVEL_STEP}><div style={{ width: `${s.progress / LEVEL_STEP * 100}%` }} /></div><span>{s.progress}/{LEVEL_STEP} до уровня {s.level + 1}</span></div>
                <div className="touch-controls" role="group" aria-label="Управление карточкой">
                  <button className="ctrl" aria-label="Влево" onClick={() => act(() => g.moveLane(-1))}>◄</button>
                  <button className="ctrl ctrl-drop" onClick={() => act(() => g.hardDrop())}>Сброс ▼</button>
                  <button className="ctrl" aria-label="Вправо" onClick={() => act(() => g.moveLane(1))}>►</button>
                </div>
              </section>
              <aside className="auxiliary">
                <div className="aux-panel" data-tone="violet"><span>Далее</span><p>{s.next?.ev.t}</p></div>
                <div className="aux-panel" data-tone="amber"><span>Рекорд</span><strong>{Math.max(s.best, s.score).toLocaleString("ru-RU")}</strong></div>
                <p className="keyboard-help">← → выбрать<br />↓ ускорить<br />Пробел — сброс<br />1 2 3 — бонусы<br />P / Esc — пауза</p>
              </aside>
            </div>
          </div>
          {s.status === "paused" && <section className="pause-backdrop" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <div className="pause-dialog"><div className="eyebrow">Можно выдохнуть</div><h1 id="pause-title">Пауза</h1><p>Карточка подождёт. Продолжи игру или заверши партию, чтобы разобрать ответы.</p>
              <button className="btn-main" autoFocus onClick={() => act(() => g.togglePause())}>Продолжить</button>
              <button className="btn-sec" onClick={() => act(() => g.finish())}>Завершить и посмотреть итог</button>
            </div>
          </section>}
        </>
      )}
    </main>
  );
}
