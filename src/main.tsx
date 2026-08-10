import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/lib/errorHandler";
import { registerServiceWorker } from "@/lib/registerSW";

installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);

// Suporte offline (apenas no app publicado; nunca em dev/preview).
registerServiceWorker();
