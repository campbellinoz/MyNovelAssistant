import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import type { Request, Response, NextFunction } from 'express';

// Google OAuth Configuration - only throw error if we're trying to use Google Auth
export function validateGoogleAuthConfig() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Environment variable GOOGLE_CLIENT_ID not provided");
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Environment variable GOOGLE_CLIENT_SECRET not provided");
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  console.log('Session configuration:', {
    sessionSecret: !!process.env.SESSION_SECRET,
    databaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
  
  // Production-specific session configuration
  const replitDomains = process.env.REPLIT_DOMAINS || '';
  const isCustomDomain = replitDomains.includes('mynovelcraft.com');
  const isProductionReplit = replitDomains.includes('replit.app');
  const isDevelopment = process.env.NODE_ENV === 'development' && !isProductionReplit;
  
  console.log('Session environment detection:', {
    replitDomains,
    isCustomDomain,
    isProductionReplit, 
    isDevelopment,
    nodeEnv: process.env.NODE_ENV
  });
  
  // Configure cookies for different environments
  const cookieConfig = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: sessionTtl,
    // Set domain for production custom domain only
    ...(isCustomDomain && !isDevelopment ? { domain: '.mynovelcraft.com' } : {})
  };
  
  console.log('Cookie configuration:', {
    isCustomDomain,
    isDevelopment,
    cookieConfig
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    proxy: true,
    cookie: cookieConfig,
  });
}

export async function setupGoogleAuth(app: Express) {
  // Validate configuration before proceeding
  validateGoogleAuthConfig();
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Use a middleware to capture the actual request host for OAuth callback
  let actualHost = '';
  app.use((req, res, next) => {
    if (!actualHost && req.get('host')) {
      actualHost = req.get('host')!;
      console.log('Detected actual host:', actualHost);
    }
    next();
  });
  
  // Determine callback URL dynamically based on actual request host
  const getCallbackURL = () => {
    // Check if we have detected the actual host
    if (actualHost) {
      if (actualHost.includes('picard.replit.dev')) {
        return `https://${actualHost}/api/auth/google/callback`;
      } else if (actualHost.includes('replit.app')) {
        return `https://${actualHost}/api/auth/google/callback`;
      } else if (actualHost.includes('mynovelcraft.com')) {
        return "https://mynovelcraft.com/api/auth/google/callback";
      }
    }
    
    // Fallback logic based on environment variables
    const currentDomain = process.env.REPLIT_DOMAINS || '';
    const isCustomDomain = currentDomain.includes('mynovelcraft.com');
    const isProductionReplit = currentDomain.includes('replit.app');
    const isDevelopment = process.env.NODE_ENV === 'development' && !isProductionReplit;
    
    if (isDevelopment) {
      return "https://40dac315-c4e9-409c-9b84-90e95e968041-00-1e7mkzesg3xe5.picard.replit.dev/api/auth/google/callback";
    } else if (isCustomDomain) {
      return "https://mynovelcraft.com/api/auth/google/callback";
    } else {
      return "https://my-novel-craft-campbellinoz.replit.app/api/auth/google/callback";
    }
  };
  
  const callbackURL = getCallbackURL();
  console.log('Google OAuth callback URL:', callbackURL);

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('=== GOOGLE OAUTH CALLBACK START (PRODUCTION) ===');
      console.log('Google OAuth profile:', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName
      });
      console.log('Environment:', process.env.NODE_ENV);

      // Check if user already exists by Google ID
      console.log('Step 1: Checking for existing user by Google ID...');
      console.log('Google profile.id:', profile.id, 'Type:', typeof profile.id);
      
      // Ensure Google ID is string (database stores as varchar)
      const googleIdString = String(profile.id);
      console.log('Looking for Google ID as string:', googleIdString);
      
      let user;
      try {
        user = await storage.getUserByGoogleId(googleIdString);
        console.log('User found by Google ID:', user ? 'YES' : 'NO');
        if (user) {
          console.log('Found user details:', { id: user.id, email: user.email, googleId: user.googleId, googleIdType: typeof user.googleId });
        }
      } catch (error: any) {
        console.error('CRITICAL ERROR in getUserByGoogleId:', {
          message: error.message,
          stack: error.stack,
          googleId: googleIdString,
          originalGoogleId: profile.id
        });
        throw error;
      }
      
      if (!user) {
        // Create new user
        const email = profile.emails?.[0]?.value;
        if (!email) {
          console.error('No email provided by Google');
          return done(new Error('No email provided by Google'), undefined);
        }

        console.log('Step 2: Checking for existing user by email...');
        try {
          const existingUser = await storage.getUserByEmail(email);
          console.log('User found by email:', existingUser ? 'YES' : 'NO');
          
          if (existingUser) {
            // Update existing user with Google ID
            console.log('Step 3a: Updating existing user with Google ID...');
            user = await storage.updateUserGoogleId(existingUser.id, googleIdString);
            console.log('User updated successfully');
          } else {
            // Create completely new user
            console.log('Step 3b: Creating new user...');
            const userData = {
              googleId: googleIdString,
              email: email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              profileImageUrl: profile.photos?.[0]?.value || '',
              subscriptionTier: 'free',
              subscriptionStatus: 'active',
              monthlyAiQueries: 0,
              maxMonthlyQueries: 10
            };
            console.log('Creating user with data:', userData);
            user = await storage.createUser(userData);
            console.log('User created successfully:', { id: user.id, email: user.email });
          }
        } catch (error) {
          console.error('Error in email check or user creation:', error);
          throw error;
        }
      }

      console.log('=== GOOGLE OAUTH CALLBACK SUCCESS (PRODUCTION) ===');
      return done(null, user);
    } catch (error: any) {
      console.error('=== GOOGLE OAUTH CALLBACK ERROR (PRODUCTION) ===');
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        environment: process.env.NODE_ENV
      });
      return done(error, undefined);
    }
  }));

  passport.serializeUser((user: any, done) => {
    try {
      console.log('=== SERIALIZE USER START ===');
      console.log('Serializing user:', { id: user.id, email: user.email });
      done(null, user.id);
      console.log('=== SERIALIZE USER SUCCESS ===');
    } catch (error) {
      console.error('=== SERIALIZE USER ERROR ===', error);
      done(error, null);
    }
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('=== DESERIALIZE USER START ===');
      console.log('Deserializing user ID:', id);
      const user = await storage.getUser(id);
      console.log('Deserialized user:', user ? { id: user.id, email: user.email } : 'null');
      console.log('=== DESERIALIZE USER SUCCESS ===');
      // Always call done(null, user) - even if user is null/undefined
      // This indicates "no error, but user not found" rather than an actual error
      done(null, user || null);
    } catch (error: any) {
      console.error('=== DESERIALIZE USER ERROR ===');
      console.error('Deserialization error:', {
        message: error.message,
        stack: error.stack,
        userId: id
      });
      // Only call done with error if there was an actual database/system error
      done(null, null); // Treat as "user not found" rather than system error
    }
  });

  // Google OAuth routes with dynamic callback URL detection
  app.get('/api/auth/google', (req, res, next) => {
    // Update callback URL based on current request host
    const host = req.get('host');
    let newCallbackURL;
    
    if (host?.includes('picard.replit.dev')) {
      newCallbackURL = `https://${host}/api/auth/google/callback`;
    } else if (host?.includes('replit.app')) {
      newCallbackURL = `https://${host}/api/auth/google/callback`;
    } else if (host?.includes('mynovelcraft.com')) {
      newCallbackURL = "https://mynovelcraft.com/api/auth/google/callback";
    } else {
      newCallbackURL = callbackURL; // fallback to original
    }
    
    console.log('OAuth request from host:', host);
    console.log('Using callback URL:', newCallbackURL);
    
    // Note: Callback URL is handled at the strategy level, this logging helps track which domain is being used
    
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get('/api/auth/google/callback', 
    (req: Request, res: Response, next: NextFunction) => {
      console.log('=== OAUTH CALLBACK RECEIVED ===');
      console.log('Host:', req.get('host'));
      console.log('Query params:', req.query);
      console.log('Environment:', process.env.NODE_ENV);
      
      passport.authenticate('google', { 
        failureRedirect: '/?error=auth_failed',
        session: true
      }, (err: any, user: any, info: any) => {
        console.log('=== PASSPORT AUTHENTICATE RESULT ===');
        console.log('Error:', err);
        console.log('User:', user ? { id: user.id, email: user.email } : 'null');
        console.log('Info:', info);
        
        if (err) {
          console.error('=== OAUTH CALLBACK ERROR ===');
          console.error('Authentication error:', err);
          return res.status(500).json({ 
            error: 'Authentication failed', 
            details: err.message,
            timestamp: new Date().toISOString()
          });
        }
        
        if (!user) {
          console.log('=== OAUTH CALLBACK NO USER ===');
          return res.redirect('/?error=auth_failed');
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error('=== LOGIN ERROR ===');
            console.error('Login error:', loginErr);
            return res.status(500).json({ 
              error: 'Login failed', 
              details: loginErr.message,
              timestamp: new Date().toISOString()
            });
          }
          
          console.log('=== OAUTH CALLBACK SUCCESS ===');
          console.log('User logged in successfully:', { id: user.id, email: user.email });
          res.redirect('/');
        });
      })(req, res, next);
    }
  );

  app.get('/api/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid');
        res.clearCookie('mynovelcraft.session');
        res.redirect('/');
      });
    });
  });
}

// Authentication middleware for Google OAuth
export const isAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('Authentication check:', {
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'no isAuthenticated method',
    user: req.user ? { id: (req.user as any).id, email: (req.user as any).email } : 'no user',
    session: req.session ? { id: req.session.id } : 'no session',
    cookie: req.headers.cookie ? 'present' : 'none'
  });
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};