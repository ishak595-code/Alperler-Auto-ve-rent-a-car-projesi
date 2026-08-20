import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const distPath = path.join(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  next();
});

app.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send("OK");
});

app.use(express.static(distPath, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    }
  },
}));

app.get(/.*/, (_req, res) => {
  if (!fs.existsSync(indexPath)) {
    res.status(404).send("Application not built.");
    return;
  }
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.sendFile(indexPath);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Alperler Auto static server is listening on port ${port}`);
});
