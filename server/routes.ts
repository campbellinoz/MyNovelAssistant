import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Auth imports removed for testing
// import { setupAuth, isAuthenticated } from "./replitAuth";
// import { setupGoogleAuth, isAuthenticated as googleAuthMiddleware } from "./googleAuth";
import { generateChapterAudio, type OpenAITTSOptions, OPENAI_VOICE_OPTIONS } from "./openai-tts";
import { 
  insertProjectSchema, updateProjectSchema,
  insertChapterSchema, updateChapterSchema,
  insertCharacterSchema, updateCharacterSchema,
  insertAISuggestionSchema,
  insertAIChatMessageSchema,
  insertHistoricalResearchMessageSchema,
  insertCharacterDevelopmentTimelineSchema, updateCharacterDevelopmentTimelineSchema,
  insertCharacterRelationshipSchema, updateCharacterRelationshipSchema,
  insertAudiobookSchema
} from "@shared/schema";
import { 
  generateWritingSuggestions, 
  generatePlotIdeas, 
  generateCharacterTraits, 
  generateStoryProgressionSuggestions,
  answerWritingQuery,
  generateHistoricalResearch,
  openai
} from "./openai";
import { exportProjectToDocx, exportProjectToPdf } from "./export";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { sendSupportTicketNotification, sendTicketReplyNotification } from "./email-service";
import { healthCheck, systemMonitor, domainCheck, performanceMonitor, errorLogger, getRecentErrors } from "./monitoring";

import { setupGoogleAuth, isAuthenticated } from "./googleAuth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import multer from "multer";
import express from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Starting route registration...'); // Force deployment restart with DB fix
  
  // Add performance monitoring middleware
  app.use(performanceMonitor);
  
  // Configure multer for file uploads
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'publisher-logos');
      // Create directory if it doesn't exist
      fs.mkdirSync(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'logo-' + uniqueSuffix + ext);
    }
  });

  const upload = multer({
    storage: storage_config,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });
  
  // Set up Google authentication
  await setupGoogleAuth(app);
  console.log('Google authentication enabled');
  
  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  }, express.static(path.join(process.cwd(), 'uploads')));
  
  // Add a basic test route to verify Express routing works
  app.get('/simple-test', (req, res) => {
    console.log('Simple test route hit!');
    res.json({ message: 'Express routing works', timestamp: new Date().toISOString() });
  });



  // Monitoring endpoints (no auth required for health checks)
  app.get('/api/health', healthCheck);
  // Test Google ID lookup - TEMPORARY DEBUG for authentication issue
  app.get("/api/debug/google-lookup/:googleId", async (req, res) => {
    try {
      const googleId = req.params.googleId;
      console.log('Testing Google ID lookup for:', googleId, typeof googleId);
      
      const user = await storage.getUserByGoogleId(googleId);
      console.log('User found:', user ? 'YES' : 'NO', user);
      
      // Also test as string explicitly
      const userAsString = await storage.getUserByGoogleId(String(googleId));
      console.log('User found as string:', userAsString ? 'YES' : 'NO');
      
      res.json({
        googleId,
        googleIdType: typeof googleId,
        userFound: !!user,
        userFoundAsString: !!userAsString,
        user: user ? { id: user.id, email: user.email, googleId: user.googleId, googleIdType: typeof user.googleId } : null
      });
    } catch (error: any) {
      console.error('Google ID lookup error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  app.get('/api/monitor', systemMonitor);
  app.get('/api/domain-check', domainCheck);
  app.get('/api/recent-errors', getRecentErrors);

  // Debug auth endpoint (no auth required for debugging)
  app.get('/api/auth/debug', (req: any, res) => {
    console.log('Debug endpoint hit - this should appear in logs');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      session: req.session ? { id: req.session.id } : null,
      cookies: req.headers.cookie || 'none',
      authType: 'disabled-for-testing',
      timestamp: new Date().toISOString()
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Google OAuth stores user directly, not in claims
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Projects
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      console.log(`Fetching projects for user ID: ${userId}`);
      const projects = await storage.getProjects(userId);
      console.log(`Found ${projects.length} projects for user ${userId}`);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      // Ensure user owns this project
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      console.log('Creating project - userId:', userId);
      console.log('Request body:', req.body);
      
      const dataToValidate = { ...req.body, userId };
      console.log('Data being validated:', dataToValidate);
      
      const projectData = insertProjectSchema.parse(dataToValidate);
      console.log('Validated project data:', projectData);
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Project creation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      res.status(400).json({ message: "Invalid project data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectData = updateProjectSchema.parse(req.body);
      const project = await storage.updateProject(req.params.id, projectData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Chapters
  app.get("/api/projects/:projectId/chapters", isAuthenticated, async (req, res) => {
    try {
      const chapters = await storage.getChaptersByProject(req.params.projectId);
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  // Optimized endpoint - only loads metadata (no content field)
  app.get("/api/projects/:projectId/chapters/metadata", isAuthenticated, async (req, res) => {
    try {
      const chapters = await storage.getChapterMetadataByProject(req.params.projectId);
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapter metadata" });
    }
  });

  app.get("/api/chapters/:id", isAuthenticated, async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post("/api/chapters", isAuthenticated, async (req, res) => {
    try {
      const chapterData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter(chapterData);
      res.status(201).json(chapter);
    } catch (error) {
      console.error("Chapter creation error:", error);
      res.status(400).json({ message: "Invalid chapter data" });
    }
  });

  app.patch("/api/chapters/:id", isAuthenticated, async (req, res) => {
    try {
      const chapterData = updateChapterSchema.parse(req.body);
      const chapter = await storage.updateChapter(req.params.id, chapterData);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      res.status(400).json({ message: "Invalid chapter data" });
    }
  });

  app.delete("/api/chapters/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`=== DELETE CHAPTER REQUEST ===`);
      console.log(`Chapter ID: ${req.params.id}`);
      console.log(`User:`, req.user);
      
      const deleted = await storage.deleteChapter(req.params.id);
      console.log(`Deletion result: ${deleted}`);
      
      if (!deleted) {
        console.log(`Chapter not found or already deleted`);
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      console.log(`Chapter deleted successfully`);
      res.json({ message: "Chapter deleted" });
    } catch (error) {
      console.error(`=== DELETE CHAPTER ERROR ===`);
      console.error(`Chapter ID: ${req.params.id}`);
      console.error(`Error:`, error);
      console.error(`Stack:`, error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to delete chapter", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Enhanced chapter management routes
  app.put("/api/chapters/:id/reorder", isAuthenticated, async (req, res) => {
    try {
      const { order, section } = req.body;
      if (typeof order !== 'number') {
        return res.status(400).json({ message: "Order must be a number" });
      }
      
      const success = await storage.reorderChapter(req.params.id, order, section);
      if (!success) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json({ message: "Chapter reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder chapter" });
    }
  });

  app.put("/api/projects/:projectId/chapters/reorder", isAuthenticated, async (req, res) => {
    try {
      const { chapters } = req.body;
      if (!Array.isArray(chapters)) {
        return res.status(400).json({ message: "Chapters must be an array" });
      }
      
      const success = await storage.reorderChapters(req.params.projectId, chapters);
      if (!success) {
        return res.status(500).json({ message: "Failed to reorder chapters" });
      }
      res.json({ message: "Chapters reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder chapters" });
    }
  });

  app.post("/api/projects/:projectId/front-matter", isAuthenticated, async (req, res) => {
    try {
      const frontMatterChapters = await storage.createDefaultFrontMatter(req.params.projectId);
      res.status(201).json(frontMatterChapters);
    } catch (error) {
      res.status(500).json({ message: "Failed to create front matter sections" });
    }
  });

  app.get("/api/projects/:projectId/chapters/section/:section", isAuthenticated, async (req, res) => {
    try {
      const chapters = await storage.getChaptersBySection(req.params.projectId, req.params.section);
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapters by section" });
    }
  });

  // Copyright management routes
  app.get("/api/projects/:projectId/copyright", isAuthenticated, async (req, res) => {
    try {
      const copyrightInfo = await storage.getCopyrightInfo(req.params.projectId);
      res.json(copyrightInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch copyright information" });
    }
  });

  app.post("/api/projects/:projectId/copyright", isAuthenticated, async (req, res) => {
    try {
      const copyrightData = { ...req.body, projectId: req.params.projectId };
      const copyrightInfo = await storage.upsertCopyrightInfo(copyrightData);
      res.json(copyrightInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to save copyright information" });
    }
  });

  // Publisher logo upload endpoint
  app.post("/api/projects/:projectId/copyright/upload-logo", isAuthenticated, upload.single('logo'), async (req, res) => {
    try {
      console.log('Logo upload attempt:', {
        projectId: req.params.projectId,
        hasFile: !!req.file,
        user: req.user ? { id: (req.user as any).id, email: (req.user as any).email } : 'no user'
      });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      // Create relative path to the uploaded file
      const logoPath = `/uploads/publisher-logos/${req.file.filename}`;
      
      // Update the copyright info with the new logo path
      const currentCopyright = await storage.getCopyrightInfo(req.params.projectId);
      const updatedCopyright = await storage.upsertCopyrightInfo({
        ...currentCopyright,
        projectId: req.params.projectId,
        publisherLogo: logoPath
      });

      console.log('Logo upload successful:', {
        logoPath,
        filename: req.file.filename,
        size: req.file.size
      });

      res.json({
        logoUrl: logoPath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Publisher logo upload error:', error);
      res.status(500).json({ message: "Failed to upload publisher logo", error: (error as Error).message });
    }
  });

  // Table of contents management
  app.post("/api/projects/:projectId/table-of-contents/update", isAuthenticated, async (req, res) => {
    try {
      await storage.updateTableOfContents(req.params.projectId);
      res.json({ message: "Table of contents updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update table of contents" });
    }
  });

  // Characters
  app.get("/api/projects/:projectId/characters", isAuthenticated, async (req, res) => {
    try {
      const characters = await storage.getCharactersByProject(req.params.projectId);
      res.json(characters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  app.get("/api/characters/:id", isAuthenticated, async (req, res) => {
    try {
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character" });
    }
  });

  app.post("/api/characters", isAuthenticated, async (req, res) => {
    try {
      const characterData = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter(characterData);
      res.status(201).json(character);
    } catch (error) {
      res.status(400).json({ message: "Invalid character data" });
    }
  });

  app.patch("/api/characters/:id", isAuthenticated, async (req, res) => {
    try {
      const characterData = updateCharacterSchema.parse(req.body);
      const character = await storage.updateCharacter(req.params.id, characterData);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      res.status(400).json({ message: "Invalid character data" });
    }
  });

  app.delete("/api/characters/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCharacter(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Character not found" });
      }
      res.json({ message: "Character deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete character" });
    }
  });

  // Character Development Timeline Routes
  app.get("/api/characters/:characterId/timeline", isAuthenticated, async (req, res) => {
    try {
      const timeline = await storage.getCharacterTimeline(req.params.characterId);
      res.json(timeline);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character timeline" });
    }
  });

  app.post("/api/character-timeline", isAuthenticated, async (req, res) => {
    try {
      const timelineData = insertCharacterDevelopmentTimelineSchema.parse(req.body);
      const entry = await storage.createTimelineEntry(timelineData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid timeline data" });
    }
  });

  app.patch("/api/character-timeline/:id", isAuthenticated, async (req, res) => {
    try {
      const timelineData = updateCharacterDevelopmentTimelineSchema.parse(req.body);
      const entry = await storage.updateTimelineEntry(req.params.id, timelineData);
      if (!entry) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid timeline data" });
    }
  });

  app.delete("/api/character-timeline/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteTimelineEntry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      res.json({ message: "Timeline entry deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete timeline entry" });
    }
  });

  // Character Relationships Routes
  app.get("/api/projects/:projectId/relationships", isAuthenticated, async (req, res) => {
    try {
      const relationships = await storage.getProjectRelationships(req.params.projectId);
      res.json(relationships);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch relationships" });
    }
  });

  app.get("/api/characters/:characterId/relationships", isAuthenticated, async (req, res) => {
    try {
      const relationships = await storage.getCharacterRelationships(req.params.characterId);
      res.json(relationships);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character relationships" });
    }
  });

  app.post("/api/character-relationships", isAuthenticated, async (req, res) => {
    try {
      const relationshipData = insertCharacterRelationshipSchema.parse(req.body);
      const relationship = await storage.createCharacterRelationship(relationshipData);
      res.status(201).json(relationship);
    } catch (error) {
      res.status(400).json({ message: "Invalid relationship data" });
    }
  });

  app.patch("/api/character-relationships/:id", isAuthenticated, async (req, res) => {
    try {
      const relationshipData = updateCharacterRelationshipSchema.parse(req.body);
      const relationship = await storage.updateCharacterRelationship(req.params.id, relationshipData);
      if (!relationship) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      res.json(relationship);
    } catch (error) {
      res.status(400).json({ message: "Invalid relationship data" });
    }
  });

  app.delete("/api/character-relationships/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCharacterRelationship(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      res.json({ message: "Relationship deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete relationship" });
    }
  });

  // AI Suggestions
  app.get("/api/projects/:projectId/ai-suggestions", isAuthenticated, async (req, res) => {
    try {
      const suggestions = await storage.getAISuggestionsByProject(req.params.projectId);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI suggestions" });
    }
  });

  app.get("/api/chapters/:chapterId/ai-suggestions", isAuthenticated, async (req, res) => {
    try {
      const suggestions = await storage.getAISuggestionsByChapter(req.params.chapterId);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI suggestions" });
    }
  });

  app.post("/api/ai/generate-suggestions", isAuthenticated, async (req, res) => {
    try {
      const { projectTitle, chapterTitle, currentContent, characters, projectId, chapterId } = req.body;
      
      const suggestions = await generateWritingSuggestions({
        projectTitle,
        chapterTitle,
        currentContent,
        characters
      });

      // Store suggestions in database
      const storedSuggestions = await Promise.all(
        suggestions.map(suggestion =>
          storage.createAISuggestion({
            projectId,
            chapterId,
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content
          })
        )
      );

      res.json(storedSuggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  app.post("/api/ai/generate-plot-ideas", isAuthenticated, async (req, res) => {
    try {
      const { projectTitle, genre, currentPlot, projectId } = req.body;
      
      const suggestions = await generatePlotIdeas({
        projectTitle,
        genre,
        currentPlot
      });

      const storedSuggestions = await Promise.all(
        suggestions.map(suggestion =>
          storage.createAISuggestion({
            projectId,
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content
          })
        )
      );

      res.json(storedSuggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate plot ideas" });
    }
  });

  app.post("/api/ai/generate-character-traits", isAuthenticated, async (req, res) => {
    try {
      const { characterName, role, projectContext, projectId } = req.body;
      
      const suggestions = await generateCharacterTraits({
        characterName,
        role,
        projectContext
      });

      const storedSuggestions = await Promise.all(
        suggestions.map(suggestion =>
          storage.createAISuggestion({
            projectId,
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content
          })
        )
      );

      res.json(storedSuggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate character traits" });
    }
  });

  app.post("/api/ai/story-progression", isAuthenticated, async (req, res) => {
    try {
      const { projectId, chapterId, projectTitle, chapterTitle, currentContent, characters, setting, timeEra } = req.body;
      
      const suggestions = await generateStoryProgressionSuggestions({
        projectTitle,
        chapterTitle: chapterTitle || "",
        currentContent: currentContent || "",
        characters: characters || [],
        setting,
        timeEra
      });

      const storedSuggestions = await Promise.all(
        suggestions.map(suggestion =>
          storage.createAISuggestion({
            projectId,
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content
          })
        )
      );

      res.json(storedSuggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate story progression suggestions" });
    }
  });

  app.post("/api/ai/query", isAuthenticated, async (req: any, res) => {
    try {
      const { query, context } = req.body;
      const { projectId, chapterId } = context || {};
      const userId = req.user.id || req.user.claims?.sub;
      
      // Check usage limits
      const canUseAI = await storage.checkUsageLimit(userId);
      if (!canUseAI) {
        return res.status(429).json({ 
          message: "Monthly AI query limit reached. Please upgrade your plan to continue using AI features.",
          error: "USAGE_LIMIT_EXCEEDED"
        });
      }
      
      // Increment usage counter
      await storage.incrementUserAiUsage(userId);
      
      // Store user message
      if (projectId) {
        await storage.createChatMessage({
          projectId,
          chapterId: chapterId || null,
          role: "user",
          content: query
        });
      }
      
      // Get chapter content if available for context
      let contextContent = '';
      if (projectId && chapterId) {
        try {
          const chapter = await storage.getChapter(chapterId);
          if (chapter && chapter.projectId === projectId) {
            contextContent = chapter.content || '';
          }
        } catch (error) {
          console.error("Error fetching chapter for context:", error);
        }
      }
      
      const response = await answerWritingQuery(query, contextContent);
      
      // Store AI response
      if (projectId) {
        await storage.createChatMessage({
          projectId,
          chapterId: chapterId || null,
          role: "assistant", 
          content: response.response
        });
      }
      
      res.json(response);
    } catch (error: unknown) {
      console.error("AI query error:", error);
      res.status(500).json({ message: "Failed to process AI query" });
    }
  });

  app.post("/api/ai/chat", isAuthenticated, async (req, res) => {
    try {
      const { message, type, projectId, chapterId } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const context = {
        projectId,
        chapterId,
        type
      };
      
      const response = await answerWritingQuery(message, JSON.stringify(context));
      
      res.json(response);
    } catch (error) {
      console.error("Literary Editor error:", error);
      res.status(500).json({ message: "Failed to process literary analysis" });
    }
  });

  app.patch("/api/ai-suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const { applied } = req.body;
      const suggestion = await storage.updateAISuggestion(req.params.id, applied);
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to update suggestion" });
    }
  });

  // Chat messages routes
  app.get("/api/projects/:projectId/chat-messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessagesByProject(req.params.projectId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.get("/api/chapters/:chapterId/chat-messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessagesByChapter(req.params.chapterId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/projects/:projectId/chat-messages", isAuthenticated, async (req, res) => {
    try {
      const { query, metadata } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Handle different types of AI requests based on metadata
      if (metadata?.type === 'literary_analysis') {
        // Import the literary analysis function
        const { analyzeLiteraryContent } = await import("./openai");
        
        // Extract chapter title and content from the query
        const titleMatch = query.match(/Chapter Title: ([^\n]+)/);
        const contentMatch = query.match(/Chapter Content: ([\s\S]+)$/);
        
        const chapterTitle = titleMatch ? titleMatch[1] : "Unknown Chapter";
        const content = contentMatch ? contentMatch[1] : query;
        
        const analysis = await analyzeLiteraryContent({
          chapterTitle,
          content,
          analysisType: 'comprehensive'
        });

        // Store the user query
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "user",
          content: query
        });

        // Store the AI response
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "assistant",
          content: analysis
        });

        res.json({ response: analysis });
      } 
      else if (metadata?.type === 'ai_detection') {
        // Import the AI detection function
        const { detectAIContent } = await import("./openai");
        
        // Extract content from the query
        const contentMatch = query.match(/Text to analyze: "([^"]+)"$/);
        const content = contentMatch ? contentMatch[1] : query.replace(/^[\s\S]*Text to analyze: "/, '').replace(/"$/, '');
        
        const detectionResult = await detectAIContent(content);

        // Store the user query
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "user",
          content: query
        });

        // Store the AI response
        const resultJson = JSON.stringify(detectionResult);
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "assistant",  
          content: resultJson
        });

        res.json({ response: resultJson });
      }
      else {
        // Handle regular chat messages
        const { answerWritingQuery } = await import("./openai");
        const response = await answerWritingQuery(query);

        // Store the user query
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "user",
          content: query
        });

        // Store the AI response
        await storage.createChatMessage({
          projectId: req.params.projectId,
          role: "assistant",
          content: response.response
        });

        res.json(response);
      }
    } catch (error) {
      console.error("Chat message processing error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.delete("/api/projects/:projectId/chat-messages", isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const deleted = await storage.deleteChatMessagesByProject(projectId);
      if (deleted) {
        res.json({ message: "Chat history cleared successfully" });
      } else {
        res.json({ message: "No chat history to clear" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  // Historical Research routes
  app.get("/api/projects/:projectId/research-history", isAuthenticated, async (req, res) => {
    try {
      const researchHistory = await storage.getHistoricalResearchByProject(req.params.projectId);
      res.json(researchHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research history" });
    }
  });

  app.post("/api/ai/historical-research", isAuthenticated, async (req, res) => {
    try {
      const { projectId, projectTitle, timeEra, setting, query, topic } = req.body;
      
      const researchContent = await generateHistoricalResearch({
        projectTitle,
        timeEra,
        setting,
        query,
        topic
      });
      
      // Store user query
      await storage.createHistoricalResearchMessage({
        projectId,
        role: "user",
        content: query,
        topic,
        timeEra,
        setting
      });
      
      // Store AI response
      await storage.createHistoricalResearchMessage({
        projectId,
        role: "assistant",
        content: researchContent,
        topic,
        timeEra,
        setting
      });

      res.json({ content: researchContent });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate historical research" });
    }
  });



  // Thesaurus API endpoint
  app.get('/api/thesaurus/:word', isAuthenticated, async (req, res) => {
    try {
      const { word } = req.params;
      
      if (!word || word.length < 2) {
        return res.status(400).json({ message: "Word must be at least 2 characters long" });
      }

      // First try external API, then fall back to local database
      let synonyms: string[] = [];
      
      try {
        // Use Datamuse API (free, no key required)
        const apiResponse = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word.toLowerCase())}&max=10`);
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          synonyms = data.map((item: { word: string; score: number }) => item.word) || [];
        }
      } catch (apiError) {
        console.log("External API failed, using local database");
      }

      // Fallback to comprehensive local database if external API fails or returns no results
      if (synonyms.length === 0) {
        const synonymsMap: Record<string, string[]> = {
        // Basic adjectives
        "good": ["excellent", "great", "wonderful", "fantastic", "superb", "outstanding", "remarkable"],
        "bad": ["terrible", "awful", "horrible", "dreadful", "poor", "inadequate", "disappointing"],
        "big": ["large", "huge", "enormous", "massive", "gigantic", "vast", "immense"],
        "small": ["tiny", "little", "petite", "miniature", "minute", "compact", "modest"],
        "fast": ["quick", "rapid", "swift", "speedy", "hasty", "brisk", "prompt"],
        "slow": ["sluggish", "gradual", "leisurely", "unhurried", "deliberate", "steady"],
        "happy": ["joyful", "cheerful", "delighted", "elated", "pleased", "content", "euphoric"],
        "sad": ["sorrowful", "melancholy", "dejected", "despondent", "gloomy", "mournful"],
        "beautiful": ["gorgeous", "stunning", "lovely", "attractive", "elegant", "graceful"],
        "ugly": ["hideous", "repulsive", "unsightly", "grotesque", "unattractive"],
        "old": ["ancient", "elderly", "aged", "mature", "vintage", "antique"],
        "new": ["fresh", "recent", "modern", "contemporary", "novel", "latest"],
        "hot": ["warm", "scorching", "blazing", "burning", "sweltering"],
        "cold": ["chilly", "freezing", "icy", "frigid", "cool"],
        "smart": ["intelligent", "clever", "brilliant", "wise", "shrewd"],
        "stupid": ["foolish", "ignorant", "dense", "dim", "dull"],
        "strong": ["powerful", "mighty", "robust", "sturdy", "muscular"],
        "weak": ["feeble", "frail", "fragile", "delicate", "vulnerable"],
        
        // Emotions and feelings
        "love": ["adore", "cherish", "treasure", "worship", "devotion"],
        "hate": ["despise", "loathe", "detest", "abhor", "resent"],
        "angry": ["furious", "irate", "livid", "enraged", "indignant"],
        "excited": ["thrilled", "elated", "enthusiastic", "eager", "animated"],
        "scared": ["frightened", "terrified", "alarmed", "petrified", "anxious"],
        "surprised": ["astonished", "amazed", "startled", "stunned", "flabbergasted"],
        
        // Common verbs - dialogue tags
        "said": ["stated", "declared", "announced", "mentioned", "remarked", "expressed", "uttered", "proclaimed", "whispered", "murmured", "shouted", "exclaimed"],
        "asked": ["inquired", "questioned", "demanded", "requested", "queried"],
        "replied": ["responded", "answered", "retorted", "returned", "acknowledged"],
        "laughed": ["chuckled", "giggled", "snickered", "guffawed", "cackled"],
        "cried": ["wept", "sobbed", "bawled", "wailed", "whimpered"],
        
        // Movement verbs
        "went": ["traveled", "journeyed", "departed", "proceeded", "ventured", "moved", "headed"],
        "walked": ["strolled", "wandered", "marched", "paced", "strode", "ambled", "sauntered", "trudged"],
        "ran": ["sprinted", "dashed", "rushed", "hurried", "bolted", "fled", "jogged", "scurried"],
        "jumped": ["leaped", "bounded", "vaulted", "hopped", "sprang"],
        "climbed": ["ascended", "scaled", "mounted", "clambered"],
        "fell": ["tumbled", "plummeted", "dropped", "collapsed", "toppled"],
        "galloped": ["raced", "charged", "thundered", "careered", "bolted"],
        "traverse": ["cross", "navigate", "journey", "travel", "pass"],
        
        // Observation verbs
        "looked": ["gazed", "stared", "glanced", "observed", "examined", "watched", "peered", "glimpsed"],
        "saw": ["noticed", "spotted", "observed", "witnessed", "glimpsed", "beheld"],
        "heard": ["listened", "detected", "perceived", "caught", "overheard"],
        "felt": ["sensed", "experienced", "perceived", "touched", "detected"],
        
        // Common nouns
        "house": ["home", "residence", "dwelling", "abode", "mansion", "cottage", "estate"],
        "car": ["vehicle", "automobile", "sedan", "coupe", "truck", "van"],
        "food": ["meal", "cuisine", "dish", "nourishment", "sustenance", "fare"],
        "water": ["liquid", "fluid", "moisture", "aqua", "beverage"],
        "money": ["cash", "currency", "funds", "capital", "wealth", "income"],
        "work": ["job", "employment", "occupation", "profession", "career", "labor"],
        "time": ["moment", "period", "duration", "interval", "era", "epoch"],
        "people": ["individuals", "persons", "humans", "folk", "citizens"],
        "friend": ["companion", "buddy", "pal", "ally", "confidant", "associate"],
        "enemy": ["foe", "adversary", "opponent", "rival", "antagonist"],
        "place": ["location", "spot", "site", "position", "area", "region"],
        "thing": ["object", "item", "article", "entity", "element"],
        "way": ["method", "manner", "approach", "technique", "path", "route"],
        "day": ["period", "time", "era", "age", "moment"],
        "night": ["evening", "dusk", "twilight", "darkness", "nightfall"],
        "morning": ["dawn", "daybreak", "sunrise", "early", "beginning"],
        "history": ["past", "chronicle", "record", "heritage", "legacy", "annals"],
        
        // Thinking and knowing
        "think": ["believe", "consider", "ponder", "contemplate", "reflect", "suppose", "assume"],
        "know": ["understand", "comprehend", "realize", "recognize", "acknowledge", "grasp"],
        "remember": ["recall", "recollect", "reminisce", "retain", "retrieve"],
        "forget": ["overlook", "neglect", "omit", "disregard", "ignore"],
        
        // Wanting and getting
        "want": ["desire", "wish", "crave", "yearn", "long", "covet", "need"],
        "need": ["require", "demand", "necessitate", "want", "lack"],
        "like": ["enjoy", "appreciate", "favor", "prefer", "relish"],
        "dislike": ["hate", "despise", "detest", "loathe", "abhor"],
        
        // Action verbs
        "make": ["create", "produce", "manufacture", "construct", "build", "craft", "form"],
        "break": ["shatter", "fracture", "smash", "destroy", "demolish"],
        "fix": ["repair", "mend", "restore", "correct", "adjust"],
        "open": ["unlock", "unfasten", "uncover", "reveal", "expose"],
        "close": ["shut", "seal", "lock", "fasten", "secure"],
        "start": ["begin", "commence", "initiate", "launch", "embark"],
        "stop": ["cease", "halt", "end", "conclude", "terminate"],
        "continue": ["proceed", "persist", "carry", "maintain", "sustain"],
        "change": ["alter", "modify", "transform", "convert", "adjust"],
        "turn": ["rotate", "spin", "twist", "pivot", "revolve"],
        "pull": ["drag", "tug", "yank", "draw", "haul"],
        "push": ["shove", "thrust", "press", "propel", "drive"],
        "hold": ["grasp", "grip", "clutch", "embrace", "contain"],
        "throw": ["hurl", "toss", "cast", "fling", "pitch"],
        "catch": ["grab", "snatch", "capture", "seize", "intercept"],
        "buy": ["purchase", "acquire", "obtain", "procure", "invest"],
        "sell": ["market", "trade", "exchange", "offer", "vend"],
        "win": ["triumph", "succeed", "prevail", "conquer", "achieve"],
        "lose": ["forfeit", "surrender", "misplace", "fail", "squander"],
        "find": ["discover", "locate", "uncover", "detect", "encounter"],
        "show": ["display", "demonstrate", "reveal", "exhibit", "present"],
        "hide": ["conceal", "cover", "mask", "disguise", "bury"],
        "tell": ["inform", "notify", "relate", "communicate", "reveal"],
        "ask": ["inquire", "question", "request", "demand", "query"],
        "answer": ["reply", "respond", "return", "acknowledge", "clarify"],
        "play": ["perform", "act", "compete", "participate", "engage"],
        "live": ["exist", "reside", "dwell", "inhabit", "survive"],
        "die": ["perish", "expire", "pass", "succumb", "depart"],
        "kill": ["murder", "slay", "eliminate", "destroy", "assassinate"],
        "eat": ["consume", "devour", "feast", "dine", "ingest"],
        "drink": ["sip", "gulp", "swallow", "imbibe", "consume"],
        "sleep": ["slumber", "rest", "doze", "nap", "snooze"],
        "wake": ["awaken", "arise", "rouse", "stir", "emerge"],
        "sit": ["settle", "rest", "perch", "position", "place"],
        "stand": ["rise", "erect", "position", "remain", "endure"],
        "lie": ["recline", "rest", "stretch", "deceive", "fabricate"],
        "give": ["provide", "offer", "present", "donate", "contribute", "supply", "grant"],
        "take": ["grab", "seize", "capture", "obtain", "acquire", "secure", "accept"],
        "get": ["receive", "obtain", "acquire", "gain", "earn", "achieve", "fetch"],
        "put": ["place", "position", "set", "locate", "install"],
        "bring": ["carry", "transport", "deliver", "fetch", "convey"],
        "come": ["arrive", "approach", "reach", "enter", "visit", "attend"],
        "go": ["leave", "depart", "exit", "travel", "journey", "proceed", "venture"],
        
        // Additional words users tried
        "gust": ["breeze", "wind", "draft", "blast", "puff", "squall"],
        "snapped": ["broke", "cracked", "fractured", "split", "burst", "popped"],
        "damp": ["moist", "wet", "humid", "soggy", "clammy", "dewy"],
        "misty": ["foggy", "hazy", "cloudy", "vaporous", "murky"],
        "crisp": ["fresh", "clear", "sharp", "brisk", "cool"],
        "gentle": ["soft", "mild", "tender", "calm", "peaceful"],
        "fierce": ["intense", "violent", "savage", "brutal", "aggressive"],
        "whisper": ["murmur", "mutter", "breathe", "sigh", "hint"],
        "shout": ["yell", "scream", "roar", "bellow", "holler"],
        "glance": ["peek", "glimpse", "look", "peer", "gaze"],
        "stare": ["gaze", "look", "peer", "observe", "watch"],
        "stumble": ["trip", "falter", "stagger", "fumble", "blunder"],
        "rush": ["hurry", "dash", "race", "sprint", "bolt"],
        "creep": ["crawl", "sneak", "steal", "slink", "tiptoe"],
        "leap": ["jump", "bound", "spring", "vault", "hop"],
        "grasp": ["grip", "hold", "clutch", "seize", "grab"],
        "release": ["free", "let", "drop", "abandon", "discharge"],
        "examine": ["inspect", "study", "investigate", "analyze", "review"],
        "discover": ["find", "uncover", "reveal", "detect", "locate"],
        "create": ["make", "build", "form", "produce", "generate"],
        "destroy": ["ruin", "demolish", "wreck", "devastate", "obliterate"],
        "protect": ["guard", "shield", "defend", "safeguard", "preserve"],
        "attack": ["assault", "strike", "hit", "charge", "raid"],
        "escape": ["flee", "run", "evade", "avoid", "elude"],
        "capture": ["catch", "seize", "trap", "snare", "apprehend"],
        "follow": ["pursue", "chase", "track", "trail", "shadow"],
        "lead": ["guide", "direct", "head", "conduct", "pilot"],
        "ignore": ["disregard", "overlook", "neglect", "dismiss", "omit"],
        "notice": ["observe", "see", "spot", "detect", "perceive"],
        "hope": ["wish", "expect", "trust", "believe", "anticipate"],
        "fear": ["dread", "worry", "anxiety", "terror", "panic"],
        "doubt": ["question", "uncertainty", "skepticism", "mistrust"],
        "trust": ["faith", "confidence", "belief", "reliance", "hope"],
        "promise": ["pledge", "vow", "commitment", "guarantee", "assurance"],
        "threaten": ["menace", "intimidate", "warn", "endanger", "jeopardize"],
        "comfort": ["console", "soothe", "ease", "reassure", "calm"],
        "worry": ["concern", "anxiety", "trouble", "distress", "fret"],
        "celebrate": ["rejoice", "honor", "commemorate", "observe", "party"],
        "mourn": ["grieve", "lament", "weep", "sorrow", "regret"]
      };

        synonyms = synonymsMap[word.toLowerCase()] || [];
      }
      
      res.json({
        word: word.toLowerCase(),
        synonyms: synonyms
      });
    } catch (error) {
      console.error("Thesaurus API error:", error);
      res.status(500).json({ message: "Failed to lookup synonyms" });
    }
  });

  // Spell check API endpoint
  app.get('/api/spellcheck/:word', isAuthenticated, async (req, res) => {
    try {
      const { word } = req.params;
      
      if (!word || word.length < 2) {
        return res.status(400).json({ message: "Word must be at least 2 characters long" });
      }

      let isCorrect = false;
      let suggestions: string[] = [];
      
      try {
        // Use a more reliable spell checking approach
        // First try LanguageTool API (free, open source)
        const ltResponse = await fetch(`https://api.languagetool.org/v2/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `text=${encodeURIComponent(word)}&language=en-US`
        });
        
        if (ltResponse.ok) {
          const ltData = await ltResponse.json();
          
          if (ltData.matches && ltData.matches.length > 0) {
            // Found spelling errors
            isCorrect = false;
            // Extract suggestions from spelling errors only
            const spellErrors = ltData.matches.filter((match: any) => 
              match.rule && match.rule.category && 
              (match.rule.category.id === 'TYPOS' || match.rule.category.id === 'MISSPELLING')
            );
            
            if (spellErrors.length > 0 && spellErrors[0].replacements) {
              suggestions = spellErrors[0].replacements
                .map((rep: any) => rep.value)
                .slice(0, 6); // Limit to 6 suggestions
            }
          } else {
            // No errors found, word is likely correct
            isCorrect = true;
          }
        } else {
          // If LanguageTool fails, fall back to local validation
          throw new Error("LanguageTool API failed");
        }
      } catch (apiError) {
        console.log("External spell check failed, using enhanced local validation");
        
        // Enhanced fallback: comprehensive misspelling detection
        const commonMisspellings: Record<string, string[]> = {
          "recieve": ["receive"],
          "seperate": ["separate"], 
          "definately": ["definitely"],
          "occured": ["occurred"],
          "begining": ["beginning"],
          "goverment": ["government"],
          "neccessary": ["necessary"],
          "succesful": ["successful"],
          "accomodate": ["accommodate"],
          "embarass": ["embarrass"],
          "consciencious": ["conscientious"],
          "mispelled": ["misspelled"],
          "publically": ["publicly"],
          "untill": ["until"],
          "truely": ["truly"],
          "greatfull": ["grateful"],
          "wierd": ["weird"],
          "freind": ["friend"],
          "speach": ["speech"],
          "beleive": ["believe"],
          "acheive": ["achieve"],
          "peice": ["piece"],
          "occassion": ["occasion"],
          "adress": ["address"],
          "comittee": ["committee"],
          "excercise": ["exercise"],
          "maintainance": ["maintenance"],
          "perseverence": ["perseverance"],
          "priviledge": ["privilege"],
          "rythm": ["rhythm"],
          "seperation": ["separation"],
          "vaccuum": ["vacuum"],
          "shelterersz": ["shelterers", "shelters", "shelter"],
          "accompanieded": ["accompanied", "accompanied"],
          "teh": ["the"],
          "hte": ["the"],
          "adn": ["and"],
          "nad": ["and"],
          "youre": ["you're", "your"],
          "theyre": ["they're", "their"],
          "wont": ["won't", "want"],
          "cant": ["can't"],
          "dont": ["don't"],
          "isnt": ["isn't"],
          "wasnt": ["wasn't"],
          "werent": ["weren't"],
          "shouldnt": ["shouldn't"],
          "wouldnt": ["wouldn't"],
          "couldnt": ["couldn't"],
          "hasnt": ["hasn't"],
          "havent": ["haven't"],
          "didnt": ["didn't"],
          "doesnt": ["doesn't"]
        };
        
        // Dictionary of common English words (words that should be considered correct)
        const commonWords = new Set([
          "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
          "this", "but", "his", "by", "from", "they", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
          "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just",
          "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
          "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first",
          "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "is", "was", "are", "been",
          "has", "had", "were", "said", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out",
          "many", "then", "them", "these", "so", "some", "her", "would", "make", "like", "into", "him", "time", "has", "two", "more",
          "go", "no", "way", "could", "my", "than", "first", "water", "been", "call", "who", "its", "now", "find", "long", "down",
          "day", "did", "get", "come", "made", "may", "part", "over", "new", "sound", "take", "only", "little", "work", "know",
          "place", "year", "live", "me", "back", "give", "most", "very", "after", "thing", "our", "just", "name", "good", "sentence",
          "man", "think", "say", "great", "where", "help", "through", "much", "before", "line", "right", "too", "mean", "old", "any",
          "same", "tell", "boy", "follow", "came", "want", "show", "also", "around", "form", "three", "small", "set", "put", "end",
          "why", "again", "turn", "here", "off", "went", "old", "number", "great", "tell", "men", "say", "small", "every", "found",
          "still", "between", "mane", "should", "home", "big", "give", "air", "line", "set", "own", "under", "read", "last", "never",
          "us", "left", "end", "along", "while", "might", "next", "sound", "below", "saw", "something", "thought", "both", "few",
          "those", "always", "looked", "show", "large", "often", "together", "asked", "house", "don't", "world", "going", "want",
          "school", "important", "until", "form", "food", "keep", "children", "feet", "land", "side", "without", "boy", "once",
          "animal", "life", "enough", "took", "sometimes", "four", "head", "above", "kind", "began", "almost", "live", "page",
          "got", "earth", "need", "far", "hand", "high", "year", "mother", "light", "country", "father", "let", "night", "picture",
          "being", "study", "second", "book", "carry", "took", "science", "eat", "room", "friend", "began", "idea", "fish", "mountain",
          "north", "once", "base", "hear", "horse", "cut", "sure", "watch", "color", "face", "wood", "main", "enough", "plain",
          "girl", "usual", "young", "ready", "above", "ever", "red", "list", "though", "feel", "talk", "bird", "soon", "body",
          "dog", "family", "direct", "pose", "leave", "song", "measure", "door", "product", "black", "short", "numeral", "class",
          "wind", "question", "happen", "complete", "ship", "area", "half", "rock", "order", "fire", "south", "problem", "piece",
          "told", "knew", "pass", "since", "top", "whole", "king", "space", "heard", "best", "hour", "better", "during", "hundred",
          "five", "remember", "step", "early", "hold", "west", "ground", "interest", "reach", "fast", "verb", "sing", "listen",
          "six", "table", "travel", "less", "morning", "ten", "simple", "several", "vowel", "toward", "war", "lay", "against",
          "pattern", "slow", "center", "love", "person", "money", "serve", "appear", "road", "map", "rain", "rule", "govern",
          "pull", "cold", "notice", "voice", "unit", "power", "town", "fine", "certain", "fly", "fall", "lead", "cry", "dark",
          "machine", "note", "wait", "plan", "figure", "star", "box", "noun", "field", "rest", "correct", "able", "pound", "done",
          "beauty", "drive", "stood", "contain", "front", "teach", "week", "final", "gave", "green", "oh", "quick", "develop",
          "ocean", "warm", "free", "minute", "strong", "special", "mind", "behind", "clear", "tail", "produce", "fact", "street",
          "inch", "multiply", "nothing", "course", "stay", "wheel", "full", "force", "blue", "object", "decide", "surface",
          "deep", "moon", "island", "foot", "system", "busy", "test", "record", "boat", "common", "gold", "possible", "plane",
          "stead", "dry", "wonder", "laugh", "thousands", "ago", "ran", "check", "game", "shape", "equate", "hot", "miss",
          "brought", "heat", "snow", "tire", "bring", "yes", "distant", "fill", "east", "paint", "language", "among", "grand",
          "ball", "yet", "wave", "drop", "heart", "am", "present", "heavy", "dance", "engine", "position", "arm", "wide", "sail",
          "material", "size", "vary", "settle", "speak", "weight", "general", "ice", "matter", "circle", "pair", "include",
          "divide", "syllable", "felt", "perhaps", "pick", "sudden", "count", "square", "reason", "length", "represent", "art",
          "subject", "region", "energy", "hunt", "probable", "bed", "brother", "egg", "ride", "cell", "believe", "fraction",
          "forest", "sit", "race", "window", "store", "summer", "train", "sleep", "prove", "lone", "leg", "exercise", "wall",
          "catch", "mount", "wish", "sky", "board", "joy", "winter", "sat", "written", "wild", "instrument", "kept", "glass",
          "grass", "cow", "job", "edge", "sign", "visit", "past", "soft", "fun", "bright", "gas", "weather", "month", "million",
          "bear", "finish", "happy", "hope", "flower", "clothe", "strange", "gone", "jump", "baby", "eight", "village", "meet",
          "root", "buy", "raise", "solve", "metal", "whether", "push", "seven", "paragraph", "third", "shall", "held", "hair",
          "describe", "cook", "floor", "either", "result", "burn", "hill", "safe", "cat", "century", "consider", "type", "law",
          "bit", "coast", "copy", "phrase", "silent", "tall", "sand", "soil", "roll", "temperature", "finger", "industry",
          "value", "fight", "lie", "beat", "excite", "natural", "view", "sense", "ear", "else", "quite", "broke", "case",
          "middle", "kill", "son", "lake", "moment", "scale", "loud", "spring", "observe", "child", "straight", "consonant",
          "nation", "dictionary", "milk", "speed", "method", "organ", "pay", "age", "section", "dress", "cloud", "surprise",
          "quiet", "stone", "tiny", "climb", "bad", "oil", "blood", "touch", "grew", "cent", "mix", "team", "wire", "cost",
          "lost", "brown", "wear", "garden", "equal", "sent", "choose", "fell", "fit", "flow", "fair", "bank", "collect",
          "save", "control", "decimal", "gentle", "woman", "captain", "practice", "separate", "difficult", "doctor", "please",
          "protect", "noon", "whose", "locate", "ring", "character", "insect", "caught", "period", "indicate", "radio", "spoke",
          "atom", "human", "history", "effect", "electric", "expect", "crop", "modern", "element", "hit", "student", "corner",
          "party", "supply", "bone", "rail", "imagine", "provide", "agree", "thus", "capital", "won't", "chair", "danger",
          "fruit", "rich", "thick", "soldier", "process", "operate", "guess", "necessary", "sharp", "wing", "create", "neighbor",
          "wash", "bat", "rather", "crowd", "corn", "compare", "poem", "string", "bell", "depend", "meat", "rub", "tube",
          "famous", "dollar", "stream", "fear", "sight", "thin", "triangle", "planet", "hurry", "chief", "colony", "clock",
          "mine", "tie", "enter", "major", "fresh", "search", "send", "yellow", "gun", "allow", "print", "dead", "spot",
          "desert", "suit", "current", "lift", "rose", "continue", "block", "chart", "hat", "sell", "success", "company",
          "subtract", "event", "particular", "deal", "swim", "term", "opposite", "wife", "shoe", "shoulder", "spread", "arrange",
          "camp", "invent", "cotton", "born", "determine", "quart", "nine", "truck", "noise", "level", "chance", "gather",
          "shop", "stretch", "throw", "shine", "property", "column", "molecule", "select", "wrong", "gray", "repeat", "require",
          "broad", "prepare", "salt", "nose", "plural", "anger", "claim", "continent", "oxygen", "sugar", "death", "pretty",
          "skill", "women", "season", "solution", "magnet", "silver", "thank", "branch", "match", "suffix", "especially", "fig",
          "afraid", "huge", "sister", "steel", "discuss", "forward", "similar", "guide", "experience", "score", "apple", "bought",
          "led", "pitch", "coat", "mass", "card", "band", "rope", "slip", "win", "dream", "evening", "condition", "feed",
          "tool", "total", "basic", "smell", "valley", "nor", "double", "seat", "arrive", "master", "track", "parent", "shore",
          "division", "sheet", "substance", "favor", "connect", "post", "spend", "chord", "fat", "glad", "original", "share",
          "station", "dad", "bread", "charge", "proper", "bar", "offer", "segment", "slave", "duck", "instant", "market",
          "degree", "populate", "chick", "dear", "enemy", "reply", "drink", "occur", "support", "speech", "nature", "range",
          "steam", "motion", "path", "liquid", "log", "meant", "quotient", "teeth", "shell", "neck"
        ]);
        
        const lowerWord = word.toLowerCase();
        
        // Check known misspellings first
        if (commonMisspellings[lowerWord]) {
          isCorrect = false;
          suggestions = commonMisspellings[lowerWord];
        } 
        // Check if word is in common words dictionary
        else if (commonWords.has(lowerWord)) {
          isCorrect = true;
        }
        // Check for obvious misspelling patterns
        else if (lowerWord.length < 2 || !/^[a-zA-Z]+$/.test(word)) {
          isCorrect = false;
          suggestions = [];
        }
        // Check for repeated letters (often misspellings)
        else if (/(.)\1{2,}/.test(lowerWord) || lowerWord.endsWith('z') && lowerWord.length > 4) {
          isCorrect = false;
          // Try to suggest corrections by removing extra letters
          suggestions = [lowerWord.replace(/(.)\1+/g, '$1')];
        }
        // For unknown words, lean towards being a misspelling if they have certain patterns
        else {
          const suspiciousPatterns = [
            /[aeiou]{3,}/, // Multiple vowels in a row
            /[bcdfghjklmnpqrstvwxyz]{4,}/, // Multiple consonants in a row
            /ed{2,}$/, // Words ending in multiple 'e' or 'd'
            /ing{2,}$/, // Words ending in multiple 'n' or 'g'
          ];
          
          const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(lowerWord));
          
          if (isSuspicious || lowerWord.length > 15) {
            isCorrect = false;
            suggestions = [];
          } else {
            // For short, reasonable-looking words not in dictionary, assume correct
            isCorrect = true;
          }
        }
      }
      
      res.json({
        word: word.toLowerCase(),
        isCorrect,
        suggestions
      });
    } catch (error) {
      console.error("Spell check API error:", error);
      res.status(500).json({ message: "Failed to check spelling" });
    }
  });

  // Export routes
  app.post("/api/projects/:id/export", isAuthenticated, async (req: any, res) => {
    console.log("=== EXPORT REQUEST STARTED ===");
    console.log("Request body:", req.body);
    
    try {
      const { format = 'docx', includeChapterNumbers = true, includeProjectInfo = true, pageBreakBetweenChapters = true } = req.body;
      
      console.log(`Export format: ${format}`);
      
      // Get project and chapters
      const project = await storage.getProject(req.params.id);
      if (!project) {
        console.log("Project not found");
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Found project: ${project.title}`);
      
      // Get all chapters including front and back matter
      const chapters = await storage.getChaptersByProject(req.params.id);
      const sortedChapters = chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Get copyright information for front matter
      const copyrightInfo = await storage.getCopyrightInfo(req.params.id);
      
      console.log(`Found ${chapters.length} chapters`);
      
      const options = {
        format,
        includeChapterNumbers,
        includeProjectInfo,
        pageBreakBetweenChapters,
        copyrightInfo
      };
      
      let buffer: Buffer;
      let contentType: string;
      let filename: string;
      
      console.log(`Exporting project "${project.title}" in ${format} format`);
      
      if (format === 'pdf') {
        console.log("Starting PDF export...");
        buffer = await exportProjectToPdf(project, sortedChapters, options);
        contentType = 'application/pdf';
        filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        console.log(`Generated PDF buffer of size: ${buffer.length} bytes`);
      } else {
        console.log("Starting DOCX export...");
        buffer = await exportProjectToDocx(project, sortedChapters, options);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
        console.log(`Generated DOCX buffer of size: ${buffer.length} bytes`);
      }
      
      console.log(`Setting headers - Content-Type: ${contentType}, filename: ${filename}`);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      console.log("Sending buffer...");
      res.send(buffer);
      console.log("=== EXPORT REQUEST COMPLETED ===");
    } catch (error) {
      console.error("=== EXPORT ERROR ===");
      console.error("Error details:", error);
      console.error("Error stack:", (error as Error).stack);
      res.status(500).json({ message: "Failed to export project", error: (error as Error).message });
    }
  });

  // Documentation PDF export
  app.post("/api/export/documentation-pdf", async (req, res) => {
    try {
      const { title } = req.body;
      console.log("Exporting documentation to PDF");
      
      const { exportDocumentationToPDF } = await import("./export");
      const result = await exportDocumentationToPDF(title || 'MyNovelCraft Documentation');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Documentation PDF export error:", error);
      res.status(500).json({ message: "Failed to export documentation" });
    }
  });

  // PayPal Payment Routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Subscription Routes - Using live PayPal APIs
  app.post("/api/subscription/create", isAuthenticated, async (req: any, res) => {
    try {
      const { tier, demo } = req.body;
      
      if (!tier || !['basic', 'pro', 'premium'].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      // Demo mode for testing without PayPal
      if (demo === true) {
        const demoOrderId = `DEMO_${Date.now()}_${tier.toUpperCase()}`;
        return res.json({
          id: demoOrderId,
          status: "CREATED",
          links: [
            {
              href: "#",
              rel: "self",
              method: "GET"
            },
            {
              href: `/subscription?success=true&token=${demoOrderId}`,
              rel: "approve",
              method: "GET"
            }
          ]
        });
      }

      // Define pricing for each tier
      const pricing = {
        basic: { amount: '9.99', currency: 'USD' },
        pro: { amount: '19.99', currency: 'USD' },
        premium: { amount: '39.99', currency: 'USD' }
      };

      const { amount, currency } = pricing[tier as keyof typeof pricing];
      
      // Use existing PayPal order creation function
      const orderRequest = {
        ...req,
        body: {
          amount,
          currency,
          intent: 'CAPTURE'
        }
      };
      
      await createPaypalOrder(orderRequest, res);
    } catch (error) {
      console.error("Subscription creation error:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.post("/api/subscription/complete", isAuthenticated, async (req: any, res) => {
    try {
      const { orderId, tier } = req.body;
      const userId = req.user.id || req.user.claims?.sub;
      
      if (!orderId || !tier) {
        return res.status(400).json({ error: "Order ID and tier are required" });
      }

      // Check if this is a demo order
      const isDemoOrder = orderId.startsWith('DEMO_');
      let captureSuccess = false;
      let captureError = null;
      
      if (isDemoOrder) {
        // Demo mode - skip PayPal capture and automatically succeed
        console.log(`Demo mode: Simulating successful payment for order ${orderId}`);
        captureSuccess = true;
      } else {
        // Live PayPal payment processing
        const captureRequest = {
          ...req,
          params: { orderID: orderId }
        };
        
        const mockRes = {
          status: (code: number) => ({
            json: (data: any) => {
              if (code === 200) {
                captureSuccess = true;
              } else {
                captureError = data;
              }
            }
          }),
          json: (data: any) => {
            if (data && !data.error) {
              captureSuccess = true;
            }
          }
        };

        await capturePaypalOrder(captureRequest, mockRes as any);
      }
      
      if (captureSuccess) {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        await storage.updateUserSubscription(userId, {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          paypalSubscriptionId: orderId,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate
        });
        
        await storage.resetMonthlyUsage(userId);
        res.json({ success: true, message: 'Subscription activated successfully' });
      } else {
        res.status(400).json({ error: captureError || 'Payment capture failed' });
      }
    } catch (error) {
      console.error("Error completing subscription:", error);
      res.status(500).json({ error: "Failed to complete subscription" });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.paypalSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      // Cancel subscription in PayPal (simplified - full implementation would need PayPal API call)
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: "cancelled",
        subscriptionTier: user.subscriptionTier || "free",
        paypalSubscriptionId: user.paypalSubscriptionId,
        subscriptionStartDate: user.subscriptionStartDate || undefined,
        subscriptionEndDate: user.subscriptionEndDate || undefined
      });

      res.json({ success: true, message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const canUseAI = await storage.checkUsageLimit(userId);

      // Validate subscription tier - only admin gets automatic Pro access
      let validatedTier = user.subscriptionTier || "free";
      
      // Extra security: ensure only legitimate Pro users have Pro access
      if (validatedTier === "pro" && user.email !== 'campbellinoz@gmail.com') {
        // For non-admin users, Pro access requires valid PayPal subscription
        if (!user.paypalSubscriptionId || user.subscriptionStatus !== 'active') {
          validatedTier = "free";
          console.log(`User ${userId} had Pro tier but no valid subscription - reverted to free`);
        }
      }

      res.json({
        tier: validatedTier,
        status: user.subscriptionStatus || "active",
        subscriptionId: user.paypalSubscriptionId,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        monthlyAiQueries: user.monthlyAiQueries || 0,
        canUseAI,
        limits: {
          free: 10,
          basic: 100,
          pro: 1000
        }
      });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Debug endpoint to check database connection
  app.get("/api/debug/db-info", async (req, res) => {
    try {
      const nodeEnv = process.env.NODE_ENV;
      const replitDomains = process.env.REPLIT_DOMAINS;
      
      // Force fresh database query - bypass all caching
      console.log('Forcing database cache clear...');
      const users = await storage.getAllUsers();
      const userCount = users.length;
      const userEmails = users.map(u => u.email);
      console.log('Fresh query results:', { userCount, userEmails });
      
      // Also get raw database connection info
      const dbUrlPrefix = process.env.DATABASE_URL?.substring(0, 30) || 'not set';
      
      // Get sample projects to identify which database  
      let projectTitles: string[] = [];
      try {
        if (userEmails.length > 0) {
          const userId = userEmails[0] === 'campbellinoz@gmail.com' ? 'd6e56d3f-c591-4b6a-997e-3b194032be40' : 'unknown';
          const sampleProjects = await storage.getProjects(userId);
          projectTitles = sampleProjects.slice(0, 3).map((p: any) => p.title);
        }
      } catch (error: any) {
        projectTitles = [`Error: ${error.message}`];
      }
      
      res.json({
        environment: {
          NODE_ENV: nodeEnv,
          REPLIT_DOMAINS: replitDomains,
          isProductionDomain: replitDomains && replitDomains.includes('mynovelcraft.com')
        },
        database: {
          userCount,
          userEmails,
          sampleProjectTitles: projectTitles,
          dbUrlPrefix: dbUrlPrefix,
          isNeonDatabase: dbUrlPrefix.includes('neondb'),
          fullDbHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
          dbName: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Database connection failed", details: error });
    }
  });

  // Force database connection pool restart
  app.post("/api/admin/restart-db-pool", async (req, res) => {
    try {
      console.log('=== RESTARTING DATABASE CONNECTION POOL ===');
      
      // End all current connections
      const { pool } = await import('./db');
      await pool.end();
      console.log('Old pool connections terminated');
      
      // Create new pool with fresh connections
      const { Pool: NewPool } = await import('@neondatabase/serverless');
      const newPool = new NewPool({ 
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      // Test new connection
      const testResult = await newPool.query('SELECT COUNT(*) FROM users');
      console.log('New pool test query result:', testResult.rows[0]);
      
      res.json({
        success: true,
        message: 'Database connection pool restarted',
        userCount: testResult.rows[0].count,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Pool restart failed:', error);
      res.status(500).json({
        error: 'Pool restart failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Force correct database connection
  app.post('/api/admin/force-correct-db', async (req, res) => {
    try {
      const correctDbUrl = 'postgresql://neondb_owner:npg_0nEfe7XFkupN@ep-holy-river-a76n65o9-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
      
      // Update environment variable
      process.env.DATABASE_URL = correctDbUrl;
      
      // Create new connection with correct database
      const { Pool: CorrectPool } = await import('@neondatabase/serverless');
      const correctPool = new CorrectPool({ connectionString: correctDbUrl });
      
      // Test connection to correct database
      const result = await correctPool.query('SELECT COUNT(*) as user_count FROM users');
      const userCount = result.rows[0].user_count;
      
      // Get sample user to verify it's the right database
      const userResult = await correctPool.query('SELECT email FROM users LIMIT 2');
      const emails = userResult.rows.map(u => u.email);
      
      await correctPool.end();
      
      res.json({
        success: true,
        message: 'Successfully connected to holy-river database',
        connection: {
          database: 'holy-river',
          userCount: parseInt(userCount),
          userEmails: emails
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Database connection diagnosis endpoint  
  app.get('/api/admin/db-diagnosis', async (req, res) => {
    try {
      const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
      const isNeonDb = dbUrl.includes('neondb');
      const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
      
      // Test connection and get sample data
      const users = await storage.getAllUsers();
      const { projects } = await import('@shared/schema');
      const projectResults = await db.select().from(projects).limit(3);
      
      res.json({
        connection: {
          isNeonDatabase: isNeonDb,
          host: dbHost,
          urlPrefix: dbUrl.substring(0, 50)
        },
        data: {
          userCount: users.length,
          userEmails: users.map(u => u.email),
          projectTitles: projectResults.map(p => p.title)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TEMPORARY: Database migration endpoint for production
  app.post("/api/admin/migrate-database", async (req, res) => {
    try {
      console.log('=== PRODUCTION DATABASE MIGRATION START ===');
      
      // Add missing columns if they don't exist
      const migrations = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_audio_characters integer DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_translation_characters integer DEFAULT 0`, 
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS audio_character_limit integer DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS translation_character_limit integer DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month_overage_charges integer DEFAULT 0`
      ];
      
      const results = [];
      for (const migration of migrations) {
        try {
          console.log('Running migration:', migration);
          const result = await db.execute(sql.raw(migration));
          results.push({ query: migration, status: 'success', result });
          console.log('Migration successful:', migration);
        } catch (error: any) {
          console.log('Migration error:', error.message);
          // Check if it's just a column already exists error
          if (error.message.includes('already exists')) {
            results.push({ query: migration, status: 'skipped', note: 'Column already exists' });
          } else {
            results.push({ query: migration, status: 'error', error: error.message });
          }
        }
      }
      
      console.log('=== PRODUCTION DATABASE MIGRATION COMPLETE ===');
      res.json({
        success: true,
        migrations: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Migration failed:', error);
      res.status(500).json({
        error: 'Migration failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Admin Routes - Add admin authentication check here
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) {
        console.log("Admin check failed: User not authenticated");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id || req.user.claims?.sub;
      const userEmail = req.user.email || req.user.claims?.email;
      console.log(`Admin check for user ID: ${userId}, Email: ${userEmail}`);
      
      // For now, check if user email matches admin email
      // In production, you'd want a proper admin role system
      const adminEmails = ['campbellinoz@gmail.com']; // Add your admin emails here
      const user = await storage.getUser(userId);
      console.log(`User found in database: ${user ? 'YES' : 'NO'}`);
      
      if (!user || !adminEmails.includes(user.email || '')) {
        console.log(`Admin access denied for ${userEmail} (${userId})`);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      console.log(`Admin access granted for ${userEmail}`);
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  };

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });

  app.post("/api/admin/cleanup-invalid-pro", isAdmin, async (req, res) => {
    try {
      const cleanedCount = await storage.cleanupInvalidProTiers();
      res.json({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} users with invalid Pro tier assignments`,
        cleanedCount 
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup invalid Pro tiers" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Add the route that the frontend expects
  app.get("/api/admin/users/all", isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      console.log(`Admin users/all request from user ID: ${userId}`);
      const users = await storage.getAllUsers();
      console.log(`Found ${users.length} users for admin dashboard`);
      res.json(users);
    } catch (error) {
      console.error("Admin users/all error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Alternative endpoint that frontend might be calling
  app.get("/api/admin/users/all", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      console.log(`Admin fetching all users: Found ${users.length} users`);
      users.forEach(user => {
        console.log(`User: ${user.email} - Tier: ${user.subscriptionTier || 'free'} - Status: ${user.subscriptionStatus || 'active'}`);
      });
      res.json(users);
    } catch (error) {
      console.error("Admin users/all error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.get("/api/admin/export", isAdmin, async (req, res) => {
    try {
      const format = req.query.format as string || 'csv';
      const users = await storage.getAllUsers();
      
      if (format === 'csv') {
        const csv = [
          'Email,First Name,Last Name,Subscription Tier,Status,Monthly Queries,Joined Date,PayPal ID',
          ...users.map(user => [
            user.email || '',
            user.firstName || '',
            user.lastName || '',
            user.subscriptionTier || 'free',
            user.subscriptionStatus || 'active',
            user.monthlyAiQueries || 0,
            new Date(user.createdAt!).toISOString().split('T')[0],
            user.paypalSubscriptionId || ''
          ].join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.json');
        res.json(users);
      }
    } catch (error) {
      console.error("Admin export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/admin/update-subscription", isAdmin, async (req, res) => {
    try {
      const { userId, tier, status, subscriptionEndDate } = req.body;
      
      console.log("Admin subscription update request:", { 
        userId, 
        tier, 
        status, 
        subscriptionEndDate, 
        subscriptionEndDateType: typeof subscriptionEndDate 
      });
      
      if (!userId || !tier || !status) {
        return res.status(400).json({ error: "User ID, tier, and status are required" });
      }
      
      const startDate = new Date();
      
      // Handle subscription end date
      let endDate;
      if (subscriptionEndDate === null || subscriptionEndDate === undefined || subscriptionEndDate === '') {
        // Admin explicitly wants no expiration date (permanent access)
        endDate = null;  // Use null instead of undefined for database
        console.log("Setting subscription end date to null (permanent access)");
      } else {
        // Admin provided a specific end date
        endDate = new Date(subscriptionEndDate);
        console.log("Setting subscription end date to:", endDate);
      }
      
      const updateData = {
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate  // Pass null directly, don't convert to undefined
      };
      
      console.log("Updating user subscription with data:", updateData);
      
      const updatedUser = await storage.updateUserSubscription(userId, updateData);
      
      console.log("Updated user subscription result:", updatedUser ? {
        id: updatedUser.id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionEndDate: updatedUser.subscriptionEndDate
      } : 'User not found');
      
      // Reset usage for upgraded users
      if (tier !== 'free') {
        await storage.resetMonthlyUsage(userId);
      }
      
      res.json({ 
        success: true, 
        message: 'Subscription updated successfully',
        updatedSubscription: {
          subscriptionTier: tier,
          subscriptionStatus: status,
          subscriptionEndDate: endDate
        }
      });
    } catch (error) {
      console.error("Admin update subscription error:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Agent Finder Routes
  app.post("/api/agent-finder/search", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this feature (Pro tier required)
      const user = await storage.getUser(userId);
      if (user?.subscriptionTier !== 'pro' && user?.email !== 'campbellinoz@gmail.com') {
        return res.status(403).json({ message: "This feature requires a Pro subscription" });
      }

      const { 
        type, 
        genre, 
        bookLength, 
        synopsis, 
        authorBio, 
        previousPublications, 
        editingType, 
        budget, 
        timeline,
        count = 10
      } = req.body;
      

      if (!genre) {
        return res.status(400).json({ message: "Genre is required" });
      }

      // Construct prompt based on search type
      let prompt: string;
      
      if (type === 'agents') {
        if (!synopsis) {
          return res.status(400).json({ message: "Synopsis is required for agent search" });
        }
        
        prompt = `Find ${count} literary agents who would be a good match for the following book:
        
Genre: ${genre}
Word Count: ${bookLength}
Synopsis: ${synopsis}
Author Bio: ${authorBio}
Previous Publications: ${previousPublications}

Please provide detailed, accurate information for each agent including:
- Name and agency
- Country/location where they are based
- Genres they represent
- Types of clients they prefer (debut vs established authors)
- Recent notable sales or deals
- Submission guidelines
- Query letter tips specific to this agent
- Website URL and contact email if publicly available
- A match score (1-100) and reasoning for why this agent is a good fit

Focus on real, currently active agents with publicly available contact information. Include their official agency websites and submission email addresses.

Return the results in JSON format as an array of objects with the following structure:
{
  "name": "Agent Name",
  "agency": "Agency Name",
  "country": "Country/Location",
  "genres": ["genre1", "genre2"],
  "clientTypes": ["type1", "type2"],
  "submissionGuidelines": "detailed guidelines",
  "queryLetterTips": "specific tips",
  "website": "https://agency-website.com",
  "email": "submissions@agency.com",
  "recentSales": "recent sales info",
  "matchScore": number,
  "reasoning": "why this is a good match"
}`;
      } else if (type === 'editors') {
        if (!editingType) {
          return res.status(400).json({ message: "Editing type is required for editor search" });
        }
        
        prompt = `Find ${count} professional literary editors who specialize in book and manuscript editing for the following project:
        
Genre: ${genre}
Word Count: ${bookLength}
Editing Type Needed: ${editingType}
Budget Range: ${budget}
Timeline: ${timeline}
Author Bio: ${authorBio}

Please provide detailed, accurate information for each literary editor including:
- Name
- Country/location where they are based
- Specializations (book genres/types of manuscripts)
- Types of literary editing offered (developmental, copy, line, proofreading)
- Years of experience in book/manuscript editing
- Estimated cost range for book editing
- Typical turnaround time for manuscripts
- Portfolio or website if available
- Contact information (email/website)
- A match score (1-100) and reasoning for why this editor is a good fit

Focus on real, currently active literary editors who specialize in books, novels, and manuscripts (NOT film, video, or media editors). Include their websites and professional email addresses.

Return the results in JSON format as an array of objects with the following structure:
{
  "name": "Editor Name",
  "country": "Country/Location",
  "specializations": ["spec1", "spec2"],
  "editingTypes": ["type1", "type2"],
  "experience": "experience description",
  "estimatedCost": "cost range",
  "turnaroundTime": "time estimate",
  "portfolio": "https://editor-website.com",
  "contact": "editor@email.com",
  "matchScore": number,
  "reasoning": "why this is a good match"
}`;
      } else if (type === 'publishers') {
        prompt = `Find ${count} reputable book publishers who would be a good match for the following manuscript:
        
Genre: ${genre}
Word Count: ${bookLength}
Synopsis: ${synopsis}
Author Bio: ${authorBio}

Please provide detailed, accurate information for each publisher including:
- Name of publishing house
- Country/location where they are based
- Genres they publish
- Whether they accept unsolicited manuscripts (true/false)
- Submission policy (agent-only, open submissions, etc.)
- Recent notable publications in this genre
- Submission guidelines
- Website or contact information if publicly available
- A match score (1-100) and reasoning for why this publisher is a good fit

Focus on real, currently active publishers who publish books in the specified genre. Include established independent publishers as well as larger publishing houses.

Return the results in JSON format as an array of objects with the following structure:
{
  "name": "Publisher Name",
  "country": "Country/Location", 
  "genres": ["genre1", "genre2"],
  "acceptsUnsolicitedMss": boolean,
  "submissionPolicy": "policy description",
  "recentPublications": "recent books/authors",
  "submissionGuidelines": "how to submit",
  "website": "https://publisher-website.com",
  "contact": "submissions@publisher.com",
  "matchScore": number,
  "reasoning": "why this is a good match"
}`;
      } else {
        return res.status(400).json({ message: "Invalid search type. Must be 'agents', 'editors', or 'publishers'" });
      }

      // Use OpenAI to generate results
      const { generateOpenAIResponse } = await import("./openai");
      const aiResponse = await generateOpenAIResponse(prompt);
      
      let results = [];
      try {
        // Try to parse the JSON response
        const parsed = JSON.parse(aiResponse);
        console.log("Parsed response has agents:", !!parsed.agents);
        console.log("Parsed response has editors:", !!parsed.editors);
        console.log("Parsed response has publishers:", !!parsed.publishers);
        
        // Handle different response structures
        if (Array.isArray(parsed)) {
          results = parsed;
          console.log("Using direct array, length:", results.length);
        } else if (parsed.agents && Array.isArray(parsed.agents)) {
          results = parsed.agents;
          console.log("Extracted agents array, length:", results.length);
        } else if (parsed.editors && Array.isArray(parsed.editors)) {
          results = parsed.editors; 
          console.log("Extracted editors array, length:", results.length);
        } else if (parsed.publishers && Array.isArray(parsed.publishers)) {
          results = parsed.publishers;
          console.log("Extracted publishers array, length:", results.length);
        } else if (parsed.results && Array.isArray(parsed.results)) {
          results = parsed.results;
          console.log("Extracted results array, length:", results.length);
        } else {
          results = [parsed];
          console.log("Wrapped single object as array");
        }
        
        console.log("Final results before property mapping:", results.length, "items");
        
        // Ensure all results have the required properties with defaults
        results = results.map((result: any) => ({
          ...result,
          genres: result.genres || [],
          clientTypes: result.clientTypes || [],
          specializations: result.specializations || [],
          editingTypes: result.editingTypes || [],
          matchScore: result.matchScore || 0
        }));

        // Filter out placeholder names and fictitious results
        const placeholderNames = [
          'jane doe', 'john doe', 'jane smith', 'john smith', 
          'mary jones', 'david jones', 'sarah johnson', 'michael johnson',
          'example editor', 'sample agent', 'test editor', 'demo agent'
        ];
        
        results = results.filter((result: any) => {
          const name = (result.name || '').toLowerCase();
          return !placeholderNames.some(placeholder => name.includes(placeholder));
        });
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.log("Raw AI response:", aiResponse);
        
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            results = Array.isArray(extracted) ? extracted : [extracted];
            console.log("Successfully extracted and parsed JSON");
          } catch (extractError) {
            console.error("Failed to parse extracted JSON:", extractError);
            results = [{
              name: "Search Error",
              agency: type === 'agents' ? "System" : undefined,
              specializations: type === 'editors' ? ["System"] : undefined,
              matchScore: 0,
              reasoning: "Unable to process search results. The AI service returned an unexpected format. Please try again."
            }];
          }
        } else {
          results = [{
            name: "Search Error", 
            agency: type === 'agents' ? "System" : undefined,
            specializations: type === 'editors' ? ["System"] : undefined,
            matchScore: 0,
            reasoning: "Unable to process search results. No valid data found in response. Please try again."
          }];
        }
      }

      res.json({ results });
    } catch (error) {
      console.error("Error in agent finder search:", error);
      res.status(500).json({ message: "Failed to search for agents/editors" });
    }
  });

  // Support Ticket Routes
  app.get("/api/support/tickets", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const tickets = await storage.getSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.post("/api/support/tickets", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { subject, message, category, priority } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }

      const ticket = await storage.createSupportTicket({
        userId,
        subject,
        message,
        category: category || "general",
        priority: priority || "medium",
        status: "open",
      });

      // Send email notification
      try {
        // Get user details for email
        const user = await storage.getUser(userId);
        if (user && user.email) {
          const emailSent = await sendSupportTicketNotification({
            ticket,
            userEmail: user.email,
            userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
          });
          console.log(`Support ticket email notification ${emailSent ? 'sent' : 'failed'} for ticket ${ticket.id}`);
        } else {
          console.log(`No user email found for user ${userId}, email notification skipped`);
        }
      } catch (emailError) {
        // Don't fail ticket creation if email fails
        console.error('Support ticket email notification failed:', emailError);
      }

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get("/api/support/tickets/:ticketId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      const { ticketId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify ticket belongs to user
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket || ticket.userId !== userId) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const messages = await storage.getSupportTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
      res.status(500).json({ message: "Failed to fetch ticket messages" });
    }
  });

  app.post("/api/support/tickets/:ticketId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      const { ticketId } = req.params;
      const { message } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Verify ticket belongs to user
      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket || ticket.userId !== userId) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const newMessage = await storage.createSupportTicketMessage({
        ticketId,
        userId,
        message,
        isAdmin: false,
      });

      // Send email notification for user reply
      try {
        const user = await storage.getUser(userId);
        if (user && user.email) {
          const emailSent = await sendTicketReplyNotification(
            ticket,
            user.email,
            user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
            message,
            false // isFromAdmin = false (user reply)
          );
          console.log(`Ticket reply email notification ${emailSent ? 'sent' : 'failed'} for ticket ${ticket.id}`);
        }
      } catch (emailError) {
        console.error('Ticket reply email notification failed:', emailError);
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating ticket message:", error);
      res.status(500).json({ message: "Failed to create ticket message" });
    }
  });

  // Audiobook routes
  // Subscription and usage management routes
  app.get("/api/subscription/usage-summary", isAuthenticated, async (req: any, res) => {
    try {
      const { subscriptionManager } = await import("./subscription-manager");
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const summary = await subscriptionManager.getUserUsageSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Usage summary error:", error);
      res.status(500).json({ message: "Failed to fetch usage summary" });
    }
  });

  app.post("/api/subscription/check-usage", isAuthenticated, async (req: any, res) => {
    try {
      const { subscriptionManager } = await import("./subscription-manager");
      const { serviceType, characterCount } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const result = await subscriptionManager.canPerformAction(userId, serviceType, characterCount);
      res.json(result);
    } catch (error) {
      console.error("Usage check error:", error);
      res.status(500).json({ message: "Failed to check usage limits" });
    }
  });

  app.get("/api/projects/:id/audiobooks", isAuthenticated, async (req: any, res) => {
    try {
      const audiobooks = await storage.getAudiobooksByProject(req.params.id);
      res.json(audiobooks);
    } catch (error) {
      console.error("Error fetching audiobooks:", error);
      res.status(500).json({ message: "Failed to fetch audiobooks" });
    }
  });

  // Get available OpenAI TTS voices
  app.get("/api/tts/voices", isAuthenticated, async (req: any, res) => {
    try {
      res.json(OPENAI_VOICE_OPTIONS);
    } catch (error) {
      console.error("Error fetching TTS voices:", error);
      res.status(500).json({ message: "Failed to fetch TTS voices" });
    }
  });

  // TTS Voice Preview endpoint using OpenAI TTS
  app.post("/api/tts/preview", isAuthenticated, async (req: any, res) => {
    try {
      const { text, voice, quality, speed } = req.body;
      
      if (!text || !voice) {
        return res.status(400).json({ message: "Text and voice are required" });
      }

      // Use OpenAI TTS voice preview function
      const { generateVoicePreview } = await import("./openai-tts");
      const result = await generateVoicePreview(voice, text);
      
      if (!result.success || !result.audioUrl) {
        return res.status(500).json({ message: result.error || "Failed to generate voice preview" });
      }
      
      res.json({ audioUrl: result.audioUrl });
    } catch (error) {
      console.error("Error generating OpenAI TTS voice preview:", error);
      res.status(500).json({ message: "Failed to generate voice preview" });
    }
  });

  app.delete("/api/audiobooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ message: "Audiobook not found" });
      }

      // Check if user has access to this audiobook's project
      const project = await storage.getProject(audiobook.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete the audiobook file if it exists
      const audioFilePath = audiobook.filePath || (audiobook as any).file_path;
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        try {
          fs.unlinkSync(audioFilePath);
          console.log(`Deleted audiobook file: ${audioFilePath}`);
        } catch (error) {
          console.error("Error deleting audiobook file:", error);
        }
      }

      // Delete from database
      await storage.deleteAudiobook(req.params.id);
      
      res.json({ message: "Audiobook deleted successfully" });
    } catch (error) {
      console.error("Error deleting audiobook:", error);
      res.status(500).json({ message: "Failed to delete audiobook" });
    }
  });

  app.get("/api/audiobooks/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      
      // Handle both possible property names (filePath vs file_path)
      const audioFilePath = audiobook?.filePath || (audiobook as any)?.file_path;
      
      if (!audiobook || !audioFilePath) {
        console.log("Download debug - missing audiobook or file path:", { 
          hasAudiobook: !!audiobook, 
          filePath: audiobook?.filePath,
          file_path: (audiobook as any)?.file_path,
          allKeys: audiobook ? Object.keys(audiobook) : []
        });
        return res.status(404).json({ message: "Audiobook file not found" });
      }

      // Check if user has access to this audiobook's project
      const project = await storage.getProject(audiobook.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filePath = path.resolve(audioFilePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio file not found on disk" });
      }

      // Sanitize filename for HTTP header
      const sanitizedTitle = (audiobook.title || 'audiobook')
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '_')     // Replace spaces with underscores
        .substring(0, 100);       // Limit length
      
      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp3"`);
      res.setHeader('Content-Type', 'audio/mpeg');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading audiobook:", error);
      res.status(500).json({ message: "Failed to download audiobook" });
    }
  });

  app.post("/api/projects/:id/audiobooks", isAuthenticated, async (req: any, res) => {
    try {
      console.log("=== AUDIOBOOK GENERATION REQUEST START ===");
      const projectId = req.params.id;
      const userId = req.user.id;
      
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Project ID:", projectId);
      console.log("User ID:", userId);
      console.log("insertAudiobookSchema available:", typeof insertAudiobookSchema);
      
      // Prepare validation data
      const validationData = {
        ...req.body,
        projectId,
        userId
      };
      console.log("Data for validation:", JSON.stringify(validationData, null, 2));
      
      // Validate request body
      console.log("Starting schema validation...");
      const validationResult = insertAudiobookSchema.safeParse(validationData);
      
      console.log("Validation success:", validationResult.success);
      if (!validationResult.success) {
        console.error("Validation errors:", JSON.stringify(validationResult.error.issues, null, 2));
        return res.status(400).json({ 
          message: "Invalid audiobook data", 
          errors: validationResult.error.issues 
        });
      }
      
      console.log("Validation passed! Validated data:", JSON.stringify(validationResult.data, null, 2));
      
      // Check if user has access to this project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Enhanced content cleaning for TTS (fixed HTML tag removal)
      const cleanContentForTTS = (rawContent: string): string => {
        let cleaned = rawContent;
        
        // Remove ALL HTML tags more aggressively (handle nested and malformed tags)
        // First pass: Remove standard HTML tags
        cleaned = cleaned.replace(/<[^>]*>/g, ' ');
        // Second pass: Remove any remaining angle bracket content
        cleaned = cleaned.replace(/<[^>]*$/g, ''); // Handle incomplete tags at end
        cleaned = cleaned.replace(/^[^<]*>/g, ''); // Handle incomplete tags at start
        
        // Decode common HTML entities
        cleaned = cleaned.replace(/&nbsp;/g, ' ');
        cleaned = cleaned.replace(/&amp;/g, '&');
        cleaned = cleaned.replace(/&lt;/g, '<');
        cleaned = cleaned.replace(/&gt;/g, '>');
        cleaned = cleaned.replace(/&quot;/g, '"');
        cleaned = cleaned.replace(/&#39;/g, "'");
        cleaned = cleaned.replace(/&apos;/g, "'");
        
        // Clean up extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();
        
        console.log(`🧹 Content cleaning: ${rawContent.length} chars → ${cleaned.length} chars`);
        return cleaned;
      };

      // Fetch content based on scope and clean it for TTS
      let content = '';
      if (validationResult.data.scope === 'chapter' && validationResult.data.selectedChapterId) {
        const chapter = await storage.getChapter(validationResult.data.selectedChapterId);
        if (!chapter) {
          return res.status(404).json({ message: "Selected chapter not found" });
        }
        content = `${chapter.title}. ${cleanContentForTTS(chapter.content || '')}`;
      } else {
        // Full book - get all chapters
        const chapters = await storage.getChaptersByProject(projectId);
        content = chapters.map(ch => `${ch.title}. ${cleanContentForTTS(ch.content || '')}`).join('\n\n');
      }
      
      // Create audiobook record with content
      const audiobookData = {
        ...validationResult.data,
        content
      };
      const audiobook = await storage.createAudiobook(audiobookData);
      
      // Start generation process asynchronously
      setImmediate(async () => {
        try {
          console.log(`Starting audiobook generation for project ${projectId}`);
          
          // Update status to generating
          await storage.updateAudiobook(audiobook.id, { 
            status: 'generating'
          });
          
          // Get chapters based on scope
          let chapters = await storage.getChaptersByProject(projectId);
          if (chapters.length === 0) {
            await storage.updateAudiobook(audiobook.id, { 
              status: 'failed',
              error: 'No chapters found for this project'
            });
            return;
          }
          
          // Filter chapters based on scope
          console.log(`Audiobook scope: "${audiobook.scope}", selectedChapterId: "${audiobook.selectedChapterId}"`);
          console.log(`Available chapters: ${chapters.map(ch => `${ch.id}:${ch.title}`).join(', ')}`);
          
          if (audiobook.scope === 'chapter' && audiobook.selectedChapterId) {
            console.log(`Looking for chapter with ID: ${audiobook.selectedChapterId}`);
            const selectedChapter = chapters.find(ch => ch.id === audiobook.selectedChapterId);
            if (!selectedChapter) {
              console.error(`Selected chapter not found! Looking for: ${audiobook.selectedChapterId}`);
              await storage.updateAudiobook(audiobook.id, { 
                status: 'failed',
                error: 'Selected chapter not found'
              });
              return;
            }
            chapters = [selectedChapter];
            console.log(`✅ Single chapter mode: processing ONLY "${selectedChapter.title}" (${selectedChapter.id})`);
            console.log(`Filtered chapters array length: ${chapters.length}`);
          } else {
            console.log(`❌ Full book mode: processing ${chapters.length} chapters`);
          }
          
          // Prepare OpenAI TTS options
          const voiceConfig = OPENAI_VOICE_OPTIONS.find(v => v.id === audiobook.voice);
          const ttsOptions: OpenAITTSOptions = {
            voice: audiobook.voice,
            speed: 1.0, // Default speed for OpenAI TTS
            quality: voiceConfig?.quality || 'standard',
            model: voiceConfig?.quality === 'hd' ? 'tts-1-hd' : 'tts-1'
          };
          
          // Define progress interface locally
          interface AudiobookProgress {
            chapterIndex: number;
            totalChapters: number;
            chapterTitle: string;
            progress: number;
          }
          
          // Basic content cleaning for TTS processing (reverted from aggressive version)
          const cleanContentForTTS = (rawContent: string): string => {
            return rawContent
              // Remove HTML tags but preserve content
              .replace(/<[^>]*>/g, ' ')
              // Decode common HTML entities
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&apos;/g, "'")
              // Clean up extra whitespace
              .replace(/\s+/g, ' ')
              .trim();
          };

          // Generate audiobook using direct import with content cleaning debugging
          const { generateFullAudiobook } = await import("./openai-audiobook");
          
          const result = await generateFullAudiobook(
            projectId,
            chapters.map(ch => ({ 
              id: ch.id, 
              title: ch.title, 
              content: cleanContentForTTS(ch.content || "") 
            })),
            ttsOptions,
            async (progress: AudiobookProgress) => {
              console.log(`Audiobook progress: ${progress.progress}% - ${progress.chapterTitle}`);
              // Note: Progress tracking fields need to be added to schema
            }
          );
          
          if (result.success) {
            await storage.updateAudiobook(audiobook.id, {
              status: 'completed',
              filePath: result.filePaths?.[0] || null,
              duration: result.totalDuration || 0
            });
            console.log(`Audiobook generation completed for project ${projectId}`);
          } else {
            // Convert technical errors to user-friendly messages
            const getUserFriendlyError = (error: string): string => {
              if (!error) return 'Unable to generate audiobook. Please try again or contact support.';
              
              // OpenAI quota/billing errors
              if (error.includes('exceeded your current quota')) {
                return 'Audio generation is temporarily unavailable due to service limits. Please try again later or contact support if this persists.';
              }
              
              // OpenAI rate limit errors
              if (error.includes('rate_limit_exceeded')) {
                return 'Too many requests at once. Please wait a moment and try again.';
              }
              
              // OpenAI authentication errors
              if (error.includes('invalid_api_key') || error.includes('authentication')) {
                return 'Audio service temporarily unavailable. Please contact support.';
              }
              
              // Network/connection errors
              if (error.includes('network') || error.includes('timeout') || error.includes('ENOTFOUND')) {
                return 'Network connection issue. Please check your internet connection and try again.';
              }
              
              // Generic fallback
              return 'Unable to generate audiobook. Please try again or contact support if the problem continues.';
            };

            await storage.updateAudiobook(audiobook.id, {
              status: 'failed',
              error: getUserFriendlyError(result.error || '')
            });
            console.error(`Audiobook generation failed for project ${projectId}:`, result.error);
          }
        } catch (error) {
          console.error(`Error in audiobook generation for project ${projectId}:`, error);
          
          // Convert technical errors to user-friendly messages
          const getUserFriendlyError = (error: any): string => {
            const errorMessage = error.message || '';
            
            // OpenAI quota/billing errors
            if (errorMessage.includes('exceeded your current quota')) {
              return 'Audio generation is temporarily unavailable due to service limits. Please try again later or contact support if this persists.';
            }
            
            // OpenAI rate limit errors
            if (errorMessage.includes('rate_limit_exceeded')) {
              return 'Too many requests at once. Please wait a moment and try again.';
            }
            
            // OpenAI authentication errors
            if (errorMessage.includes('invalid_api_key') || errorMessage.includes('authentication')) {
              return 'Audio service temporarily unavailable. Please contact support.';
            }
            
            // Network/connection errors
            if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ENOTFOUND')) {
              return 'Network connection issue. Please check your internet connection and try again.';
            }
            
            // File system errors
            if (errorMessage.includes('ENOSPC')) {
              return 'Insufficient storage space. Please contact support.';
            }
            
            if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
              return 'File access error. Please contact support.';
            }
            
            // Generic fallback for other errors
            return 'Unable to generate audiobook. Please try again or contact support if the problem continues.';
          };

          await storage.updateAudiobook(audiobook.id, {
            status: 'failed',
            error: getUserFriendlyError(error)
          });
        }
      });
      
      res.status(201).json(audiobook);
      
    } catch (error) {
      console.error("Error creating audiobook:", error);
      res.status(500).json({ message: "Failed to create audiobook" });
    }
  });

  app.get("/api/audiobooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ message: "Audiobook not found" });
      }
      
      // Verify user has access to this audiobook
      const project = await storage.getProject(audiobook.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(audiobook);
    } catch (error) {
      console.error("Error fetching audiobook:", error);
      res.status(500).json({ message: "Failed to fetch audiobook" });
    }
  });

  app.delete("/api/audiobooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ message: "Audiobook not found" });
      }
      
      // Verify user has access to this audiobook
      const project = await storage.getProject(audiobook.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete audio file if it exists
      if (audiobook.filePath) {
        const fs = await import('fs/promises');
        try {
          await fs.unlink(audiobook.filePath);
        } catch (error) {
          console.warn(`Failed to delete audio file: ${audiobook.filePath}`, error);
        }
      }
      
      const deleted = await storage.deleteAudiobook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Audiobook not found" });
      }
      
      res.json({ message: "Audiobook deleted successfully" });
    } catch (error) {
      console.error("Error deleting audiobook:", error);
      res.status(500).json({ message: "Failed to delete audiobook" });
    }
  });

  // Add error logging middleware
  app.use(errorLogger);

  const httpServer = createServer(app);
  return httpServer;
}
