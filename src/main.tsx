
  import { createRoot } from "react-dom/client";
  import { Component, type ReactNode } from "react";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };
    static getDerivedStateFromError(error: Error) {
      return { error };
    }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
      console.error("App crashed:", error, info.componentStack);
    }
    render() {
      if (this.state.error) {
        return (
          <div style={{ minHeight: "100vh", background: "#1b120a", color: "#F5DEB3", padding: 24, fontFamily: "monospace", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            <h2 style={{ color: "#ff6b6b", marginBottom: 12 }}>Error de la app</h2>
            <p>{this.state.error.message}</p>
            <p style={{ color: "#aaa", marginTop: 8 }}>{this.state.error.stack?.split("\n").slice(0, 5).join("\n")}</p>
            <button onClick={() => location.reload()} style={{ marginTop: 16, padding: "8px 16px", background: "#654321", color: "#F5DEB3", border: "2px solid #D4AF37", borderRadius: 4, cursor: "pointer" }}>
              Recargar
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  window.addEventListener("error", (e) => {
    console.error("Global error:", e.message, e.filename, e.lineno);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled rejection:", e.reason);
  });

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
