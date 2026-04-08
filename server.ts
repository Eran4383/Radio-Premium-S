import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy route
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      const response = await fetch(targetUrl);
      const data = await response.text();
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch" });
    }
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  console.log(`DEBUG: Server starting in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

  if (!isProd) {
    console.log("DEBUG: Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    console.log(`DEBUG: Serving static files from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
