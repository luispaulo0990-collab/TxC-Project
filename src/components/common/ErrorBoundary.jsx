import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ORANGE, BLACK, FONT } from "../../constants/theme";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#141211",
            color: "#F8F7F6",
            fontFamily: FONT,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              background: "#1A1817",
              border: "1px solid #35312F",
              borderRadius: 16,
              padding: "32px 24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(198, 40, 40, 0.15)",
                color: "#E57373",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              Ocorreu um problema ao carregar a tela
            </h2>
            <p style={{ fontSize: 13, color: "#A19B96", margin: "0 0 24px" }}>
              {this.state.error?.message || "Erro inesperado na aplicação."}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: ORANGE,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
