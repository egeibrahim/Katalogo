import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "600px",
          margin: "2rem auto",
        }}>
          <h1 style={{ color: "#b91c1c", marginBottom: "0.5rem" }}>Sayfa yüklenirken hata</h1>
          <pre style={{
            background: "#fef2f2",
            padding: "1rem",
            borderRadius: "8px",
            overflow: "auto",
            fontSize: "14px",
          }}>
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: "1rem", color: "#666" }}>
            Tarayıcı konsolunda (F12) daha fazla ayrıntı görebilirsiniz.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
