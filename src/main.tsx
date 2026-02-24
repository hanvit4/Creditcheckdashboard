
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Toaster } from "sonner";
import "./index.css";
import "./styles/dark-mode.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster position="top-center" richColors />
  </>
);
