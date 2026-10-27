import type { CSSProperties } from "react";

const rows = [
  { text: "ХРОНО", hues: [32, 116, 276, 350, 49] },
  { text: "ТЕТРИС", hues: [187, 220, 32, 116, 276, 350] },
];

export function GameLogo() {
  return (
    <h1 className="game-logo" aria-label="Хроно тетрис">
      {rows.map((row) => (
        <span className="game-logo-row" key={row.text} aria-hidden="true">
          {[...row.text].map((letter, index) => (
            <span
              className="game-logo-tile"
              key={index}
              style={{ "--tile-hue": row.hues[index] } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
