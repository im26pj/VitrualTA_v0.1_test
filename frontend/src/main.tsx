import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./index.css"; // Tailwind + 自定樣式都從這邊進

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
