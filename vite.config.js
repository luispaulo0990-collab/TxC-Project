import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            // Silencia o erro no terminal quando o backend local na porta 5000 não estiver rodando
            if (!res.headersSent && res.writeHead) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend local indisponível" }));
            }
          });
        },
      },
    },
  },
});
