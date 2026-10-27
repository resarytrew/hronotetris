import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/russo-one";
import "@fontsource/exo-2/600.css";
import "@fontsource/exo-2/700.css";
import "@fontsource/exo-2/800.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
