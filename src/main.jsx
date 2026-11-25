import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { PopupLoginMicrosoft } from "./components/views/PopupLoginMicrosoft";
import { modoPopupLogin } from "./utils/authMicrosoft";
import "./index.css";

// Janela de login aberta pelo app dentro do iframe do portal: mostra só a tela do pop-up
const modoPopup = modoPopupLogin();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {modoPopup ? <PopupLoginMicrosoft modo={modoPopup} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);

