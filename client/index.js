import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./styles.css";

const theme = localStorage.getItem("inventory-theme");
document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

createRoot(document.getElementById("root")).render(
  createElement(StrictMode, null, createElement(App))
);
