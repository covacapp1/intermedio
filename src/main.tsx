
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerSW } from 'virtual:pwa-register';

  // Register service worker for PWA
  registerSW();

  createRoot(document.getElementById("root")!).render(<App />);
  