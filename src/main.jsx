import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router.jsx";
import { Analytics } from "@vercel/analytics/react";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Analytics />
    <Router />
  </React.StrictMode>
);
