
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerSW } from 'virtual:pwa-register';

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl) {
      console.log('SW registered:', swUrl);
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  
