import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// PRODUCTION FIX: Force deployment restart to connect to correct database
console.log('SERVER RESTART: Forcing deployment to use correct database connection');

const app = express();
// Increase body parser limits to handle large story imports (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Log ALL incoming requests to debug routing issues
  console.log(`[REQUEST] ${req.method} ${req.path} from ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
  console.log(`[HEADERS] Host: ${req.headers.host}, Cookie: ${req.headers.cookie ? 'present' : 'none'}`);
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Use production mode when deployed
  const useProductionMode = app.get("env") === "production";
  
  console.log(`Server mode: ${useProductionMode ? 'PRODUCTION' : 'DEVELOPMENT'} (env: ${app.get("env")}, domain: ${process.env.REPLIT_DOMAINS})`);
  
  if (useProductionMode) {
    // In production mode, ensure API routes work by adding a simple test endpoint first
    app.get('/api/test', (req, res) => {
      res.json({ message: 'API routes working', timestamp: new Date().toISOString() });
    });
    console.log('Added test API route for production');
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
