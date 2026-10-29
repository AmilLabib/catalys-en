import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { PageTitleProvider } from "./context/PageTitleContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PageTitleProvider>
        <App />
      </PageTitleProvider>
    </BrowserRouter>
  </StrictMode>,
);
