// Development-only visual fixture; not an entry point of the production build.
// Open /tests/arcade-preview.html on the Vite server to inspect every title.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/russo-one";
import "@fontsource/exo-2/600.css";
import "@fontsource/exo-2/700.css";
import "@fontsource/exo-2/800.css";
import "../src/index.css";
import "../src/responsive.css";
import "../src/arcade.css";
import { Game } from "../src/game/engine";
import { EVENTS, shiftDate, type HistEvent } from "../src/data/events";
import { GameBoard } from "../src/components/GameBoard";

function Preview({ event, index }: { event: HistEvent; index: number }) {
  const [game] = useState(() => {
    const g = new Game();
    g.s.status = "playing";
    g.s.card = { ev: event, options: [-2, -1, 0, 1, 2].map(n => shiftDate(event.date, n)), correct: 2, gold: index === 1 };
    g.s.lane = 2;
    return g;
  });
  const [, render] = useState(0);
  return <section className="arena-column" data-event-id={event.id} style={{ maxWidth: 480, margin: "24px auto" }}>
    <h2 style={{ fontSize: 14 }}>{event.id} · {event.t.length} символов</h2>
    <GameBoard state={game.s} game={game} onChange={() => render(n => n + 1)} />
  </section>;
}

createRoot(document.getElementById("root")!).render(<main className="app-shell">
  {[...EVENTS].sort((a, b) => b.t.length - a.t.length).map((event, index) => <Preview key={event.id} event={event} index={index} />)}
</main>);
