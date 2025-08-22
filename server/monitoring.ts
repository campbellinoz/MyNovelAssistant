import { Request, Response } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

// Health check endpoint
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: { status: 'unknown', responseTime: 0, error: null as string | null },
      environment: { status: 'unknown', missingVars: [] as string[] },
      openai: { status: 'unknown', error: null as string | null },
      domain: { status: 'unknown', currentDomain: req.get('host'), isCustomDomain: false }
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || 'unknown'
  };

  try {
    // Database check
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    health.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
      error: null
    };
  } catch (error: any) {
    health.checks.database = {
      status: 'error',
      responseTime: Date.now() - startTime,
      error: error?.message || 'Unknown database error'
    };
    health.status = 'unhealthy';
  }

  // Environment variables check
  const requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY', 
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  health.checks.environment = {
    status: missingVars.length === 0 ? 'healthy' : 'warning',
    missingVars
  };

  // OpenAI API check (basic connectivity)
  try {
    // Just check if API key is present and formatted correctly
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
    health.checks.openai = { status: 'healthy', error: null };
  } catch (error: any) {
    health.checks.openai = { status: 'error', error: error?.message || 'Unknown OpenAI error' };
    health.status = 'unhealthy';
  }

  // Domain check
  const currentDomain = req.get('host');
  const isCustomDomain = currentDomain?.includes('mynovelcraft.com');
  health.checks.domain = {
    status: 'healthy',
    currentDomain,
    isCustomDomain: isCustomDomain || false
  };

  const responseTime = Date.now() - startTime;
  
  // Log health check results
  console.log(`[HEALTH CHECK] Status: ${health.status}, Response Time: ${responseTime}ms, Domain: ${currentDomain}`);
  
  if (health.status === 'unhealthy') {
    console.error('[HEALTH CHECK] Unhealthy components:', JSON.stringify(health.checks, null, 2));
  }

  res.status(health.status === 'healthy' ? 200 : 503).json({
    ...health,
    responseTime
  });
}

// System monitoring endpoint
export async function systemMonitor(req: Request, res: Response) {
  try {
    // Get system metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        connected: false,
        userCount: 0,
        connectionTest: null as string | null
      },
      domain: {
        current: req.get('host'),
        userAgent: req.get('user-agent'),
        isCustomDomain: req.get('host')?.includes('mynovelcraft.com')
      }
    };

    // Test database and get user count
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(users);
      metrics.database.connected = true;
      metrics.database.userCount = Number(result[0]?.count) || 0;
      metrics.database.connectionTest = 'success';
    } catch (error: any) {
      metrics.database.connectionTest = error?.message || 'Unknown database error';
    }

    res.json(metrics);
  } catch (error: any) {
    console.error('[SYSTEM MONITOR] Error:', error);
    res.status(500).json({ error: 'Monitoring system error', details: error?.message || 'Unknown error' });
  }
}

// Store recent errors in memory for debugging
const recentErrors: any[] = [];

// Error logger middleware
export function errorLogger(error: Error, req: Request, res: Response, next: any) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        host: req.get('host'),
        userAgent: req.get('user-agent'),
        referer: req.get('referer')
      },
      body: req.method !== 'GET' ? req.body : undefined
    },
    user: req.user ? { id: (req.user as any).id } : null
  };

  // Store in memory (keep last 20 errors)
  recentErrors.push(errorInfo);
  if (recentErrors.length > 20) {
    recentErrors.shift();
  }

  console.error('[APPLICATION ERROR]', JSON.stringify(errorInfo, null, 2));
  
  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    timestamp: errorInfo.timestamp,
    requestId: req.get('x-request-id') || 'unknown'
  });
}

// Recent errors endpoint for debugging
export function getRecentErrors(req: Request, res: Response) {
  res.json({
    errors: recentErrors.slice(-10), // Last 10 errors
    count: recentErrors.length,
    timestamp: new Date().toISOString()
  });
}

// Performance monitoring middleware
export function performanceMonitor(req: Request, res: Response, next: any) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      domain: req.get('host'),
      userAgent: req.get('user-agent')?.substring(0, 100),
      slow: duration > 5000 // Flag slow requests (>5s)
    };

    if (duration > 2000) {
      console.warn('[SLOW REQUEST]', JSON.stringify(logData, null, 2));
    } else if (duration > 5000) {
      console.error('[VERY SLOW REQUEST]', JSON.stringify(logData, null, 2));
    }

    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[REQUEST] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });
  
  next();
}

// Domain verification checker
export async function domainCheck(req: Request, res: Response) {
  const currentDomain = req.get('host');
  const isCustomDomain = currentDomain?.includes('mynovelcraft.com');
  const isHttps = req.secure || req.get('x-forwarded-proto') === 'https';
  
  const domainInfo = {
    timestamp: new Date().toISOString(),
    currentDomain,
    isCustomDomain,
    isHttps,
    protocol: req.protocol,
    headers: {
      host: req.get('host'),
      xForwardedProto: req.get('x-forwarded-proto'),
      xForwardedHost: req.get('x-forwarded-host')
    },
    url: {
      full: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      base: `${req.protocol}://${req.get('host')}`
    },
    ssl: {
      secure: req.secure,
      encrypted: (req.connection as any).encrypted || false
    },
    environment: {
      replitDomains: process.env.REPLIT_DOMAINS,
      nodeEnv: process.env.NODE_ENV
    },
    diagnosis: {
      expectedDomain: 'mynovelcraft.com',
      workingUrl: 'https://my-novel-craft-campbellinoz.replit.app/',
      issue: isCustomDomain ? 'Domain configured correctly' : 'Custom domain not detected - may need DNS configuration'
    }
  };

  console.log('[DOMAIN CHECK]', JSON.stringify(domainInfo, null, 2));
  
  res.json(domainInfo);
}