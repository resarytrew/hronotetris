import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { buildSync } from 'esbuild';

const bundled = buildSync({
  stdin: { contents: 'export { Game, cardLayout, PLAY_H, CELL, MAX_STACK } from "./src/game/engine.ts"; export { EVENTS } from "./src/data/events.ts";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { Game, EVENTS, cardLayout, PLAY_H, CELL, MAX_STACK } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const saved = new Map();
globalThis.window = {};
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };

function answer(game, correct = true, chosenLane) {
  while (game.s.now <= game.s.holdUntil) game.update(50);
  const card = game.s.card;
  const lane = chosenLane ?? (correct ? card.correct : (card.correct + 1) % 5);
  game.goToLane(lane);
  game.hardDrop();
  for (let i = 0; game.s.phase === 'falling' && i < 100; i++) game.update(50);
  assert.equal(game.s.phase, 'feedback');
  return card;
}

test('curated data: stable IDs, compact titles, valid dates and review trail', () => {
  assert.equal(EVENTS.length, 256);
  assert.equal(new Set(EVENTS.map(event => event.id)).size, 256);
  const audit = JSON.parse(fs.readFileSync('docs/data-audit.json', 'utf8').replace(/^\uFEFF/, ''));
  for (const event of EVENTS) {
    assert.ok(event.t.length <= 90 && event.t.length > 0);
    assert.match(event.date, /^\d{3,4}(?:[–,]\s?\d{3,4})?$/);
    assert.equal(event.y, Number(event.date.match(/\d+/)[0]));
    const row = audit.find(row => row.id === event.id);
    assert.equal(row.after.title, event.t);
    assert.equal(row.after.dateText, event.date);
  }
  assert.equal(EVENTS.find(e => e.t === 'Основание Черноморского флота').date, '1783');
  assert.equal(EVENTS.find(e => e.t.includes('Гогландское')).date, '1788');
  assert.equal(EVENTS.find(e => e.t.includes('Василия Блаженного')).date, '1555–1561');
});

test('an entire question bag has unique choices and accurate answer history', () => {
  const game = new Game(); game.start();
  const seen = new Set();
  for (let i = 0; i < EVENTS.length; i++) {
    const card = game.s.card; seen.add(card.ev.id);
    assert.equal(card.options.length, 5);
    assert.equal(new Set(card.options).size, 5);
    assert.equal(card.options[card.correct], card.ev.date);
    assert.equal(game.landY(2) + cardLayout(card.ev.t).height, PLAY_H);
    const years = card.ev.date.match(/\d+/g).map(Number);
    for (const option of card.options) {
      const optionYears = option.match(/\d+/g).map(Number);
      assert.equal(optionYears.length, years.length);
      if (years.length > 1) assert.equal(optionYears[1] - optionYears[0], years[1] - years[0]);
    }
    answer(game);
    const recorded = game.s.answers.at(-1);
    assert.equal(recorded.correct, true);
    assert.equal(recorded.eventId, card.ev.id);
    assert.equal(recorded.selectedDate, card.ev.date);
    assert.equal(game.s.feedback.date, card.ev.date);
    game.update(game.s.feedback.until - game.s.now + 1);
  }
  assert.equal(seen.size, 256);
  assert.equal(game.s.answers.length, 256);
  assert.equal(game.s.totalCorrect, 256);
});

test('mistakes record both full dates, including ranges, without changing later', () => {
  const game = new Game(); game.start();
  const event = EVENTS.find(e => e.date.includes('–'));
  game.s.card = { ev: event, options: ['1–2', event.date, '3–4', '5–6', '7–8'], correct: 1, gold: false };
  answer(game, false, 2);
  const record = game.s.answers[0];
  assert.equal(record.correct, false);
  assert.equal(record.selectedDate, '3–4');
  assert.equal(record.correctDate, event.date);
  assert.equal(game.s.stacks[2].length, 2);
  game.update(2400);
  assert.equal(game.s.answers[0], record);
});

test('pause freezes time; early finish retains results and saves best', () => {
  const game = new Game(); game.start(); answer(game);
  const score = game.s.score;
  game.setSoft(true); game.togglePause();
  assert.equal(game.s.soft, false);
  const now = game.s.now; game.update(5000);
  assert.equal(game.s.now, now);
  game.finish();
  assert.equal(game.s.status, 'over');
  assert.equal(game.s.endReason, 'finished');
  assert.equal(game.s.answers.length, 1);
  assert.equal(game.s.best, Math.max(score, Number(saved.get('chrono-blocks-best')) || 0));
  game.toMenu();
  assert.equal(game.s.status, 'menu');
  assert.equal(game.s.answers.length, 0);
  assert.ok(game.s.best >= score);
});

test('natural game over includes the last mistake in results', () => {
  const game = new Game(); game.start();
  while (game.s.now <= game.s.holdUntil) game.update(50);
  const wrongLane = (game.s.card.correct + 1) % 5;
  game.goToLane(wrongLane);
  game.s.stacks[wrongLane] = Array.from({ length: MAX_STACK - 2 }, (_, id) => ({ id, cs: [0, 1] }));
  assert.equal(game.landY(wrongLane) + cardLayout(game.s.card.ev.t).height + (MAX_STACK - 2) * CELL, PLAY_H);
  answer(game, false, wrongLane);
  game.update(2400);
  assert.equal(game.s.status, 'over');
  assert.equal(game.s.endReason, 'limit');
  assert.equal(game.s.answers.length, 1);
  assert.equal(game.s.answers[0].correct, false);
});

test('empty finished game and restarted game have consistent counts', () => {
  const game = new Game(); game.start(); game.finish();
  assert.equal(game.s.totalAnswered, 0);
  assert.equal(game.s.answers.length, 0);
  game.start();
  assert.equal(game.s.totalAnswered, 0);
  assert.equal(game.s.endReason, null);
});

test('all event blocks reserve native text space and land above a tall stack', () => {
  for (const [width, height] of [[283, 270], [366, 474], [480, 514], [480, 320], [400, 220]]) {
    const game = new Game(); game.start(); game.resizeBoard(width, height);
    for (const ev of EVENTS) {
      game.s.card = { ...game.s.card, ev };
      game.s.stacks[2] = Array.from({ length: MAX_STACK - 2 }, (_, id) => ({ id, cs: [0, 1] }));
      const layout = game.cardLayout();
      assert.ok(layout.fontSize >= 15);
      assert.ok(layout.height * height / PLAY_H >= 80);
      assert.ok(layout.width < 400);
      assert.ok(game.landY(2) >= 0, ev.t);
      assert.equal(game.landY(2) + layout.height + (MAX_STACK - 2) * CELL, PLAY_H);
    }
  }
});

test('rotation preserves drop progress, collision size and unanswered state', () => {
  const game = new Game(); game.start();
  game.s.card = { ...game.s.card, ev: EVENTS.reduce((a, b) => a.t.length > b.t.length ? a : b) };
  game.s.y = game.landY(2) * .65;
  game.resizeBoard(296, 280);
  assert.ok(Math.abs(game.s.y / game.landY(2) - .65) < 1e-9);
  assert.equal(game.s.totalAnswered, 0);
  assert.equal(game.s.phase, 'falling');
  const landing = game.landY(2);
  game.resizeBoard(0, 0);
  assert.equal(game.landY(2), landing);
  answer(game);
  assert.equal(game.s.totalCorrect, 1);
  assert.ok(game.s.particles.length >= 12);
  assert.equal(game.s.y, game.landY(2));
});
