import { useEffect, useState, type CSSProperties } from "react";
import type { GState } from "../game/engine";

export function GameResults({ state, onRestart, onMenu }: { state: GState; onRestart: () => void; onMenu: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const mistakes = state.answers.filter((answer) => !answer.correct);
  const accuracy = state.totalAnswered ? Math.round(state.totalCorrect / state.totalAnswered * 100) : 0;
  const shown = showAll ? state.answers : mistakes;
  const seconds = Math.floor(state.now / 1000);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <section className="results-screen" aria-labelledby="results-title">
      <div className="eyebrow">Партия завершена</div>
      <h1 id="results-title">Твой результат</h1>
      <p className="screen-subtitle">{state.endReason === "limit" ? "Башня достигла предела. Посмотрим, какие даты стоит закрепить." : "Разбери ответы перед следующей партией: это поможет закрепить даты."}</p>
      <div className="result-overview">
        <div className="accuracy-ring" style={{ "--accuracy": `${accuracy}%` } as CSSProperties}>
          <strong>{accuracy}%</strong><span>точность</span>
        </div>
        <div className="result-numbers">
          <div><strong>{state.totalAnswered}</strong><span>ответов</span></div>
          <div data-tone="mint"><strong>{state.totalCorrect}</strong><span>верных</span></div>
          <div data-tone="coral"><strong>{mistakes.length}</strong><span>ошибок</span></div>
        </div>
      </div>
      {state.newBest && <p className="new-record">★ Новый личный рекорд!</p>}
      <div className="result-secondary">
        <div><span>Очки</span><strong>{state.score.toLocaleString("ru-RU")}</strong></div>
        <div><span>Уровень</span><strong>{state.level}</strong></div>
        <div><span>Лучшая серия</span><strong>{state.maxCombo}</strong></div>
        <div><span>Время в игре</span><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div>
      </div>
      <div className="result-actions">
        <button className="btn-main" onClick={onRestart}>Играть снова</button>
        <button className="btn-sec" onClick={onMenu}>В меню</button>
      </div>
      <section className="answer-review" aria-labelledby="review-title">
        <div className="review-header">
          <h2 id="review-title">Разбор ответов</h2>
          <div className="review-tabs" role="group" aria-label="Показать ответы">
            <button aria-pressed={!showAll} onClick={() => setShowAll(false)}>Ошибки · {mistakes.length}</button>
            <button aria-pressed={showAll} onClick={() => setShowAll(true)}>Все · {state.answers.length}</button>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="review-empty">{!state.totalAnswered ? "Ты ещё не ответил ни на одно событие. Начни новую партию." : "Ошибок нет — отличная работа! Все ответы можно посмотреть в соседней вкладке."}</p>
        ) : (
          <ol className="answer-list">
            {shown.map((answer, i) => (
              <li key={`${answer.eventId}-${i}`} className={answer.correct ? "answer-correct" : "answer-wrong"}>
                <div className="answer-heading"><span aria-label={answer.correct ? "Верно" : "Ошибка"}>{answer.correct ? "✓" : "×"}</span><h3>{answer.title}</h3></div>
                <div className="answer-dates">
                  {!answer.correct && <div><span>Твой ответ</span><strong className="wrong-date">{answer.selectedDate}</strong></div>}
                  <div><span>{answer.correct ? "Верная дата" : "Правильный ответ"}</span><strong className="correct-date">{answer.correctDate}</strong></div>
                </div>
                {answer.note && <p className="answer-note">{answer.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
