import { 
  type User, type UpsertUser,
  type Project, type InsertProject, type UpdateProject,
  type Chapter, type InsertChapter, type UpdateChapter,
  type Character, type InsertCharacter, type UpdateCharacter,
  type AISuggestion, type InsertAISuggestion,
  type AIChatMessage, type InsertAIChatMessage,
  type HistoricalResearchMessage, type InsertHistoricalResearchMessage,
  type CharacterDevelopmentTimeline, type InsertCharacterDevelopmentTimeline, type UpdateCharacterDevelopmentTimeline,
  type CharacterRelationship, type InsertCharacterRelationship, type UpdateCharacterRelationship,
  type SupportTicket, type InsertSupportTicket,
  type SupportTicketMessage, type InsertSupportTicketMessage,
  type Audiobook, type InsertAudiobook,
  type CopyrightInfo, type InsertCopyrightInfo,
  type ChapterReorderRequest, type ChapterType, type ChapterSection,
  users, projects, chapters, characters, aiSuggestions, aiChatMessages, historicalResearchMessages,
  characterDevelopmentTimeline, characterRelationships, supportTickets, supportTicketMessages, audiobooks, copyrightInfo
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users (supports both Replit Auth and Google OAuth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUserGoogleId(id: string, googleId: string): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Projects
  getProjects(userId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: UpdateProject): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Chapters
  getChaptersByProject(projectId: string): Promise<Chapter[]>;
  getChapterMetadataByProject(projectId: string): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: string, chapter: UpdateChapter): Promise<Chapter | undefined>;
  deleteChapter(id: string): Promise<boolean>;
  
  // Enhanced chapter management
  reorderChapter(chapterId: string, newOrder: number, newSection?: string): Promise<boolean>;
  reorderChapters(projectId: string, chapterUpdates: Array<{id: string, order: number, section?: string}>): Promise<boolean>;
  createDefaultFrontMatter(projectId: string): Promise<Chapter[]>;
  getChaptersBySection(projectId: string, section: string): Promise<Chapter[]>;
  
  // Copyright management
  getCopyrightInfo(projectId: string): Promise<CopyrightInfo | undefined>;
  createCopyrightInfo(data: InsertCopyrightInfo): Promise<CopyrightInfo>;
  updateCopyrightInfo(projectId: string, data: Partial<InsertCopyrightInfo>): Promise<CopyrightInfo | undefined>;
  upsertCopyrightInfo(data: InsertCopyrightInfo): Promise<CopyrightInfo>;
  
  // Table of contents management
  generateTableOfContents(projectId: string): Promise<string>;
  updateTableOfContents(projectId: string): Promise<void>;

  // Characters
  getCharactersByProject(projectId: string): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, character: UpdateCharacter): Promise<Character | undefined>;
  deleteCharacter(id: string): Promise<boolean>;

  // AI Suggestions
  getAISuggestionsByProject(projectId: string): Promise<AISuggestion[]>;
  getAISuggestionsByChapter(chapterId: string): Promise<AISuggestion[]>;
  createAISuggestion(suggestion: InsertAISuggestion): Promise<AISuggestion>;
  updateAISuggestion(id: string, applied: number): Promise<AISuggestion | undefined>;

  // AI Chat Messages
  getChatMessagesByProject(projectId: string): Promise<AIChatMessage[]>;
  getChatMessagesByChapter(chapterId: string): Promise<AIChatMessage[]>;
  createChatMessage(message: InsertAIChatMessage): Promise<AIChatMessage>;
  deleteChatMessagesByProject(projectId: string): Promise<boolean>;

  // Historical Research Messages
  getHistoricalResearchByProject(projectId: string): Promise<HistoricalResearchMessage[]>;
  createHistoricalResearchMessage(message: InsertHistoricalResearchMessage): Promise<HistoricalResearchMessage>;

  // Subscription Management
  updateUserSubscription(userId: string, subscriptionData: {
    subscriptionTier: string;
    subscriptionStatus: string;
    paypalSubscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<User | undefined>;
  incrementUserAiUsage(userId: string): Promise<User | undefined>;
  resetMonthlyUsage(userId: string): Promise<User | undefined>;
  checkUsageLimit(userId: string): Promise<boolean>;
  
  // Admin Methods
  getAllUsers(): Promise<User[]>;
  getAdminStats(): Promise<{
    totalUsers: number;
    totalSubscribers: number;
    freeUsers: number;
    basicUsers: number;
    proUsers: number;
    monthlyRevenue: number;
    totalRevenue: number;
  }>;
  cleanupInvalidProTiers(): Promise<number>;
  
  // Character Development Timeline
  getCharacterTimeline(characterId: string): Promise<CharacterDevelopmentTimeline[]>;
  createTimelineEntry(entry: InsertCharacterDevelopmentTimeline): Promise<CharacterDevelopmentTimeline>;
  updateTimelineEntry(id: string, entry: UpdateCharacterDevelopmentTimeline): Promise<CharacterDevelopmentTimeline | undefined>;
  deleteTimelineEntry(id: string): Promise<boolean>;

  // Character Relationships
  getProjectRelationships(projectId: string): Promise<CharacterRelationship[]>;
  getCharacterRelationships(characterId: string): Promise<CharacterRelationship[]>;
  createCharacterRelationship(relationship: InsertCharacterRelationship): Promise<CharacterRelationship>;
  updateCharacterRelationship(id: string, relationship: UpdateCharacterRelationship): Promise<CharacterRelationship | undefined>;
  deleteCharacterRelationship(id: string): Promise<boolean>;

  // Support Tickets
  getSupportTickets(userId: string): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined>;

  // Support Ticket Messages
  getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]>;
  createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage>;

  // Audiobooks
  getAudiobooksByProject(projectId: string): Promise<Audiobook[]>;
  getAudiobook(id: string): Promise<Audiobook | undefined>;
  createAudiobook(audiobook: InsertAudiobook): Promise<Audiobook>;
  updateAudiobook(id: string, updates: Partial<Audiobook>): Promise<Audiobook | undefined>;
  deleteAudiobook(id: string): Promise<boolean>;

  // Admin Methods
  getAllUsers(): Promise<User[]>;
  getAdminStats(): Promise<{
    totalUsers: number;
    totalSubscribers: number;
    freeUsers: number;
    basicUsers: number;
    proUsers: number;
    monthlyRevenue: number;
    totalRevenue: number;
  }>;
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // Helper to count words - strips HTML tags and entities for accurate count
  private countWords(text: string): number {
    // Create a temporary DOM element to strip HTML tags and decode entities
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    } else {
      // Server-side fallback: basic HTML tag removal
      const plainText = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
      return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  // Users (supports both Replit Auth and Google OAuth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserGoogleId(id: string, googleId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ googleId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    console.log(`=== UPSERT USER START ===`);
    console.log(`Email: ${userData.email}`);
    console.log(`User ID: ${userData.id}`);
    console.log(`Names: ${userData.firstName} ${userData.lastName}`);
    
    // Give admin Pro subscription automatically - ONLY for main admin account
    if (userData.email === 'campbellinoz@gmail.com') {
      userData = {
        ...userData,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active'
      };
    } else {
      // Ensure all other new users default to free tier
      userData = {
        ...userData,
        subscriptionTier: userData.subscriptionTier || 'free',
        subscriptionStatus: userData.subscriptionStatus || 'active'
      };
    }

    console.log(`Final user data for DB:`, {
      id: userData.id,
      email: userData.email,
      subscriptionTier: userData.subscriptionTier,
      subscriptionStatus: userData.subscriptionStatus
    });

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    console.log(`=== USER UPSERTED SUCCESSFULLY ===`);
    console.log(`User created/updated:`, {
      id: user.id,
      email: user.email,
      tier: user.subscriptionTier,
      status: user.subscriptionStatus
    });
    console.log(`=== UPSERT USER END ===`);
    
    return user;
  }

  // Projects
  async getProjects(userId?: string): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({
        ...insertProject,
        description: insertProject.description ?? null,
        targetWordCount: insertProject.targetWordCount ?? null
      })
      .returning();
    return project;
  }

  async updateProject(id: string, updateProject: UpdateProject): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updateProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Chapters
  async getChaptersByProject(projectId: string): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(chapters.order);
  }

  // Optimized method - loads only metadata, excludes heavy content field
  async getChapterMetadataByProject(projectId: string): Promise<Chapter[]> {
    return await db
      .select({
        id: chapters.id,
        projectId: chapters.projectId,
        title: chapters.title,
        content: sql<string>`''`, // Empty string for performance
        order: chapters.order,
        wordCount: chapters.wordCount,
        chapterType: chapters.chapterType,
        section: chapters.section,
        isSystemGenerated: chapters.isSystemGenerated,
        synopsis: chapters.synopsis,
        plotPoints: chapters.plotPoints,
        storyBeats: chapters.storyBeats,
        conflicts: chapters.conflicts,
        characterArcs: chapters.characterArcs,
        povCharacter: chapters.povCharacter,
        chapterPurpose: chapters.chapterPurpose,
        themes: chapters.themes,
        foreshadowing: chapters.foreshadowing,
        sceneCount: chapters.sceneCount,
        setting: chapters.setting,
        bellSequenceType: chapters.bellSequenceType,
        containsMirrorMoment: chapters.containsMirrorMoment,
        chapterStakes: chapters.chapterStakes,
        conflictLevel: chapters.conflictLevel,
        reactionBeat: chapters.reactionBeat,
        nextActionHook: chapters.nextActionHook,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(chapters.section, chapters.order);
  }

  async getChapter(id: string): Promise<Chapter | undefined> {
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id));
    return chapter || undefined;
  }

  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const wordCount = this.countWords(insertChapter.content || "");
    
    const [chapter] = await db
      .insert(chapters)
      .values({ 
        ...insertChapter, 
        content: insertChapter.content ?? null,
        wordCount 
      })
      .returning();
    
    // Update project word count
    await this.updateProjectWordCount(insertChapter.projectId);
    
    return chapter;
  }

  async updateChapter(id: string, updateChapter: UpdateChapter): Promise<Chapter | undefined> {
    const wordCount = updateChapter.content !== undefined 
      ? this.countWords(updateChapter.content || "") 
      : undefined;

    const updateData: any = { ...updateChapter, updatedAt: new Date() };
    if (wordCount !== undefined) {
      updateData.wordCount = wordCount;
    }

    const [chapter] = await db
      .update(chapters)
      .set(updateData)
      .where(eq(chapters.id, id))
      .returning();
    
    if (chapter) {
      // Update project word count
      await this.updateProjectWordCount(chapter.projectId);
      // Automatically update table of contents whenever any chapter is saved
      await this.updateTableOfContents(chapter.projectId);
    }
    
    return chapter || undefined;
  }

  async deleteChapter(id: string): Promise<boolean> {
    try {
      console.log(`Storage: Attempting to delete chapter ${id}`);
      
      const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
      console.log(`Storage: Chapter found:`, chapter ? `${chapter.title} (${chapter.id})` : 'Not found');
      
      if (!chapter) {
        console.log(`Storage: Chapter ${id} not found in database`);
        return false;
      }
      
      // First, handle any audiobooks that reference this chapter
      console.log(`Storage: Checking for audiobooks referencing this chapter...`);
      try {
        // Update audiobooks to remove reference to this chapter
        const audiobookList = await db.select().from(audiobooks).where(eq(audiobooks.selectedChapterId, id));
        console.log(`Storage: Found ${audiobookList.length} audiobooks referencing this chapter`);
        
        if (audiobookList.length > 0) {
          console.log(`Storage: Updating audiobooks to remove chapter reference...`);
          await db.update(audiobooks)
            .set({ selectedChapterId: null })
            .where(eq(audiobooks.selectedChapterId, id));
          console.log(`Storage: Updated audiobooks to remove chapter reference`);
        }
      } catch (audioError) {
        console.log(`Storage: Error handling audiobook references (will continue):`, audioError);
      }
      
      console.log(`Storage: Deleting chapter from database...`);
      const result = await db.delete(chapters).where(eq(chapters.id, id));
      console.log(`Storage: Delete result:`, result);
      
      const deletedCount = result.rowCount ?? 0;
      console.log(`Storage: Deleted ${deletedCount} rows`);
      
      if (deletedCount > 0) {
        console.log(`Storage: Updating project word count for project ${chapter.projectId}`);
        await this.updateProjectWordCount(chapter.projectId);
        console.log(`Storage: Project word count updated`);
        
        // Also update table of contents after chapter deletion
        console.log(`Storage: Updating table of contents for project ${chapter.projectId}`);
        await this.updateTableOfContents(chapter.projectId);
        console.log(`Storage: Table of contents updated`);
      }
      
      console.log(`Storage: Chapter deletion completed successfully`);
      return deletedCount > 0;
    } catch (error) {
      console.error(`Storage: Error deleting chapter ${id}:`, error);
      console.error(`Storage: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  private async updateProjectWordCount(projectId: string): Promise<void> {
    const projectChapters = await this.getChaptersByProject(projectId);
    const totalWordCount = projectChapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0);
    
    await db
      .update(projects)
      .set({ wordCount: totalWordCount, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  // Enhanced chapter management methods
  async reorderChapter(chapterId: string, newOrder: number, newSection?: string): Promise<boolean> {
    const updateData: any = { order: newOrder, updatedAt: new Date() };
    if (newSection) {
      updateData.section = newSection;
    }

    const result = await db
      .update(chapters)
      .set(updateData)
      .where(eq(chapters.id, chapterId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async reorderChapters(projectId: string, chapterUpdates: Array<{id: string, order: number, section?: string}>): Promise<boolean> {
    try {
      // Use a transaction to ensure all updates succeed or none do
      await db.transaction(async (tx) => {
        for (const update of chapterUpdates) {
          const updateData: any = { order: update.order, updatedAt: new Date() };
          if (update.section) {
            updateData.section = update.section;
          }

          await tx
            .update(chapters)
            .set(updateData)
            .where(eq(chapters.id, update.id));
        }
      });
      return true;
    } catch (error) {
      console.error('Error reordering chapters:', error);
      return false;
    }
  }

  async createDefaultFrontMatter(projectId: string): Promise<Chapter[]> {
    const frontMatterSections = [
      { chapterType: 'copyright', title: 'Copyright', order: 1 },
      { chapterType: 'dedication', title: 'Dedication', order: 2 },
      { chapterType: 'epigraph', title: 'Epigraph', order: 3 },
      { chapterType: 'table_of_contents', title: 'Table of Contents', order: 4, isSystemGenerated: true },
      { chapterType: 'preface', title: 'Preface', order: 5 },
    ];

    const createdChapters: Chapter[] = [];
    
    for (const section of frontMatterSections) {
      const [chapter] = await db
        .insert(chapters)
        .values({
          projectId,
          title: section.title,
          content: '',
          chapterType: section.chapterType,
          section: 'front_matter',
          order: section.order,
          wordCount: 0,
          isSystemGenerated: section.isSystemGenerated || false,
        })
        .returning();
      
      createdChapters.push(chapter);
    }

    return createdChapters;
  }

  async getChaptersBySection(projectId: string, section: string): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(sql`${chapters.projectId} = ${projectId} AND ${chapters.section} = ${section}`)
      .orderBy(chapters.order);
  }

  // Copyright management methods
  async getCopyrightInfo(projectId: string): Promise<CopyrightInfo | undefined> {
    const [copyrightRecord] = await db
      .select()
      .from(copyrightInfo)
      .where(eq(copyrightInfo.projectId, projectId));
    return copyrightRecord;
  }

  async createCopyrightInfo(data: InsertCopyrightInfo): Promise<CopyrightInfo> {
    const [copyright] = await db
      .insert(copyrightInfo)
      .values(data)
      .returning();
    return copyright;
  }

  async updateCopyrightInfo(projectId: string, data: Partial<InsertCopyrightInfo>): Promise<CopyrightInfo | undefined> {
    const [copyright] = await db
      .update(copyrightInfo)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(copyrightInfo.projectId, projectId))
      .returning();
    return copyright;
  }

  async upsertCopyrightInfo(data: InsertCopyrightInfo): Promise<CopyrightInfo> {
    const [copyright] = await db
      .insert(copyrightInfo)
      .values(data)
      .onConflictDoUpdate({
        target: copyrightInfo.projectId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return copyright;
  }

  // Table of contents generation
  async generateTableOfContents(projectId: string): Promise<string> {
    const chapters = await this.getChaptersByProject(projectId);
    const bodyChapters = chapters.filter(ch => ch.section === 'body' && ch.chapterType === 'chapter');
    
    let tocContent = '<div class="table-of-contents">\n';
    tocContent += '<h2 style="text-align: center; margin-bottom: 2em;">Table of Contents</h2>\n\n';
    
    bodyChapters.forEach((chapter, index) => {
      const chapterNumber = index + 1;
      const pageNumber = chapterNumber * 15; // Estimated page numbers
      tocContent += `<div style="display: flex; justify-content: space-between; margin-bottom: 0.5em;">\n`;
      tocContent += `  <span>Chapter ${chapterNumber}: ${chapter.title}</span>\n`;
      tocContent += `  <span>${pageNumber}</span>\n`;
      tocContent += `</div>\n`;
    });
    
    tocContent += '</div>';
    return tocContent;
  }

  async updateTableOfContents(projectId: string): Promise<void> {
    // Find the table of contents chapter
    const tocChapter = await db
      .select()
      .from(chapters)
      .where(sql`${chapters.projectId} = ${projectId} AND ${chapters.chapterType} = 'table_of_contents'`)
      .limit(1);

    if (tocChapter.length > 0) {
      const generatedToc = await this.generateTableOfContents(projectId);
      
      await db
        .update(chapters)
        .set({ 
          content: generatedToc, 
          updatedAt: new Date(),
          wordCount: generatedToc.split(/\s+/).length 
        })
        .where(eq(chapters.id, tocChapter[0].id));
    }
  }

  // Characters - optimized for fast listing (exclude ALL heavy JSONB fields)
  async getCharactersByProject(projectId: string): Promise<Character[]> {
    return await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(characters.name);
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const [character] = await db
      .insert(characters)
      .values({
        ...insertCharacter,
        description: insertCharacter.description ?? null,
        traits: insertCharacter.traits ?? {}
      })
      .returning();
    return character;
  }

  async updateCharacter(id: string, updateCharacter: UpdateCharacter): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set({ ...updateCharacter, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return character || undefined;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const result = await db.delete(characters).where(eq(characters.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // AI Suggestions
  async getAISuggestionsByProject(projectId: string): Promise<AISuggestion[]> {
    return await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.projectId, projectId))
      .orderBy(desc(aiSuggestions.createdAt));
  }

  async getAISuggestionsByChapter(chapterId: string): Promise<AISuggestion[]> {
    return await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.chapterId, chapterId))
      .orderBy(desc(aiSuggestions.createdAt));
  }

  async createAISuggestion(insertSuggestion: InsertAISuggestion): Promise<AISuggestion> {
    const [suggestion] = await db
      .insert(aiSuggestions)
      .values({
        ...insertSuggestion,
        projectId: insertSuggestion.projectId ?? null,
        chapterId: insertSuggestion.chapterId ?? null
      })
      .returning();
    return suggestion;
  }

  async updateAISuggestion(id: string, applied: number): Promise<AISuggestion | undefined> {
    const [suggestion] = await db
      .update(aiSuggestions)
      .set({ applied })
      .where(eq(aiSuggestions.id, id))
      .returning();
    return suggestion || undefined;
  }

  // AI Chat Messages
  async getChatMessagesByProject(projectId: string): Promise<AIChatMessage[]> {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.projectId, projectId))
      .orderBy(aiChatMessages.createdAt);
  }

  async getChatMessagesByChapter(chapterId: string): Promise<AIChatMessage[]> {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.chapterId, chapterId))
      .orderBy(aiChatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertAIChatMessage): Promise<AIChatMessage> {
    const [message] = await db
      .insert(aiChatMessages)
      .values({
        ...insertMessage,
        projectId: insertMessage.projectId ?? null,
        chapterId: insertMessage.chapterId ?? null
      })
      .returning();
    return message;
  }

  async deleteChatMessagesByProject(projectId: string): Promise<boolean> {
    const result = await db.delete(aiChatMessages).where(eq(aiChatMessages.projectId, projectId));
    return (result.rowCount ?? 0) > 0;
  }

  // Historical Research Messages
  async getHistoricalResearchByProject(projectId: string): Promise<HistoricalResearchMessage[]> {
    return await db
      .select()
      .from(historicalResearchMessages)
      .where(eq(historicalResearchMessages.projectId, projectId))
      .orderBy(historicalResearchMessages.createdAt);
  }

  async createHistoricalResearchMessage(insertMessage: InsertHistoricalResearchMessage): Promise<HistoricalResearchMessage> {
    const [message] = await db
      .insert(historicalResearchMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // Subscription Management
  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionTier: string;
    subscriptionStatus: string;
    paypalSubscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date | null;
  }): Promise<User | undefined> {
    // Handle undefined values by explicitly setting them to null for database
    const updateData: any = {
      subscriptionTier: subscriptionData.subscriptionTier,
      subscriptionStatus: subscriptionData.subscriptionStatus,
      updatedAt: new Date()
    };
    
    // Only set optional fields if they are provided
    if (subscriptionData.paypalSubscriptionId !== undefined) {
      updateData.paypalSubscriptionId = subscriptionData.paypalSubscriptionId || null;
    }
    if (subscriptionData.subscriptionStartDate !== undefined) {
      updateData.subscriptionStartDate = subscriptionData.subscriptionStartDate || null;
    }
    // Always update subscription end date when provided (including null to clear it)
    if ('subscriptionEndDate' in subscriptionData) {
      updateData.subscriptionEndDate = subscriptionData.subscriptionEndDate;
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async incrementUserAiUsage(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    // Check if we need to reset monthly usage
    const now = new Date();
    const resetDate = user.monthlyResetDate || new Date();
    const shouldReset = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear();

    if (shouldReset) {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          monthlyAiQueries: 1,
          monthlyResetDate: now,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser || undefined;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          monthlyAiQueries: (user.monthlyAiQueries || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser || undefined;
    }
  }

  async resetMonthlyUsage(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        monthlyAiQueries: 0,
        monthlyResetDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async checkUsageLimit(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // Admin gets unlimited access
    if (user.email === 'campbellinoz@gmail.com') return true;

    const limits = {
      free: 10,
      basic: 100,
      pro: 1000
    };

    const userLimit = limits[user.subscriptionTier as keyof typeof limits] || limits.free;
    const currentUsage = user.monthlyAiQueries || 0;

    return currentUsage < userLimit;
  }

  // Admin Methods
  async getAllUsers(): Promise<User[]> {
    console.log("getAllUsers: Fetching all users from database...");
    try {
      const userRecords = await db.select().from(users).orderBy(desc(users.createdAt));
      console.log(`getAllUsers: Found ${userRecords.length} users`);
      console.log("getAllUsers: User emails:", userRecords.map(u => u.email));
      return userRecords;
    } catch (error) {
      console.error("getAllUsers: Database error:", error);
      throw error;
    }
  }



  // Character Development Timeline Methods
  async getCharacterTimeline(characterId: string): Promise<CharacterDevelopmentTimeline[]> {
    return await db
      .select()
      .from(characterDevelopmentTimeline)
      .where(eq(characterDevelopmentTimeline.characterId, characterId))
      .orderBy(characterDevelopmentTimeline.timelinePosition);
  }

  async createTimelineEntry(insertEntry: InsertCharacterDevelopmentTimeline): Promise<CharacterDevelopmentTimeline> {
    const [entry] = await db
      .insert(characterDevelopmentTimeline)
      .values({
        ...insertEntry,
        description: insertEntry.description ?? null,
        emotionalState: insertEntry.emotionalState ?? null,
        relationshipChanges: insertEntry.relationshipChanges ?? {},
        visualNotes: insertEntry.visualNotes ?? null,
        storyboardImage: insertEntry.storyboardImage ?? null
      })
      .returning();
    return entry;
  }

  async updateTimelineEntry(id: string, updateEntry: UpdateCharacterDevelopmentTimeline): Promise<CharacterDevelopmentTimeline | undefined> {
    const [entry] = await db
      .update(characterDevelopmentTimeline)
      .set({ ...updateEntry, updatedAt: new Date() })
      .where(eq(characterDevelopmentTimeline.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteTimelineEntry(id: string): Promise<boolean> {
    const result = await db.delete(characterDevelopmentTimeline).where(eq(characterDevelopmentTimeline.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Character Relationships Methods
  async getProjectRelationships(projectId: string): Promise<CharacterRelationship[]> {
    return await db
      .select()
      .from(characterRelationships)
      .where(eq(characterRelationships.projectId, projectId))
      .orderBy(characterRelationships.createdAt);
  }

  async getCharacterRelationships(characterId: string): Promise<CharacterRelationship[]> {
    return await db
      .select()
      .from(characterRelationships)
      .where(
        sql`${characterRelationships.characterAId} = ${characterId} OR ${characterRelationships.characterBId} = ${characterId}`
      )
      .orderBy(characterRelationships.createdAt);
  }

  async createCharacterRelationship(insertRelationship: InsertCharacterRelationship): Promise<CharacterRelationship> {
    const [relationship] = await db
      .insert(characterRelationships)
      .values({
        ...insertRelationship,
        description: insertRelationship.description ?? null,
        dynamicProgression: insertRelationship.dynamicProgression ?? [],
        conflictPoints: insertRelationship.conflictPoints ?? [],
        bondingMoments: insertRelationship.bondingMoments ?? [],
        currentStatus: insertRelationship.currentStatus ?? null
      })
      .returning();
    return relationship;
  }

  async updateCharacterRelationship(id: string, updateRelationship: UpdateCharacterRelationship): Promise<CharacterRelationship | undefined> {
    const [relationship] = await db
      .update(characterRelationships)
      .set({ ...updateRelationship, updatedAt: new Date() })
      .where(eq(characterRelationships.id, id))
      .returning();
    return relationship || undefined;
  }

  async deleteCharacterRelationship(id: string): Promise<boolean> {
    const result = await db.delete(characterRelationships).where(eq(characterRelationships.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Support Tickets
  async getSupportTickets(userId: string): Promise<SupportTicket[]> {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
    return tickets;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  // Support Ticket Messages
  async getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    const messages = await db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(supportTicketMessages.createdAt);
    return messages;
  }

  async createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const [newMessage] = await db
      .insert(supportTicketMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Admin Stats
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalSubscribers: number;
    freeUsers: number;
    basicUsers: number;
    proUsers: number;
    monthlyRevenue: number;
    totalRevenue: number;
  }> {
    console.log("Getting admin stats...");
    const allUsers = await this.getAllUsers();
    console.log(`Found ${allUsers.length} users in database`);
    
    const totalUsers = allUsers.length;
    const freeUsers = allUsers.filter((u: User) => (u.subscriptionTier || 'free') === 'free').length;
    const basicUsers = allUsers.filter((u: User) => u.subscriptionTier === 'basic').length;
    const proUsers = allUsers.filter((u: User) => u.subscriptionTier === 'pro').length;
    const totalSubscribers = basicUsers + proUsers;
    
    console.log(`User breakdown: Free: ${freeUsers}, Basic: ${basicUsers}, Pro: ${proUsers}`);
    
    // Calculate revenue (simplified - assumes monthly billing)
    const monthlyRevenue = (basicUsers * 9.99) + (proUsers * 19.99);
    const totalRevenue = monthlyRevenue; // For now, same as monthly
    
    return {
      totalUsers,
      totalSubscribers,
      freeUsers,
      basicUsers,
      proUsers,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    };
  }

  // Clean up incorrectly assigned Pro tiers (security fix)
  async cleanupInvalidProTiers(): Promise<number> {
    const invalidProUsers = await db
      .select()
      .from(users)
      .where(
        sql`subscription_tier = 'pro' 
            AND email != 'campbellinoz@gmail.com' 
            AND (paypal_subscription_id IS NULL OR subscription_status != 'active')`
      );

    if (invalidProUsers.length > 0) {
      await db
        .update(users)
        .set({ 
          subscriptionTier: 'free',
          updatedAt: new Date()
        })
        .where(
          sql`subscription_tier = 'pro' 
              AND email != 'campbellinoz@gmail.com' 
              AND (paypal_subscription_id IS NULL OR subscription_status != 'active')`
        );
      
      console.log(`Cleaned up ${invalidProUsers.length} users with invalid Pro tier assignments`);
    }
    
    return invalidProUsers.length;
  }

  // Audiobooks
  async getAudiobooksByProject(projectId: string): Promise<Audiobook[]> {
    return await db
      .select()
      .from(audiobooks)
      .where(eq(audiobooks.projectId, projectId))
      .orderBy(desc(audiobooks.createdAt));
  }

  async getAudiobook(id: string): Promise<Audiobook | undefined> {
    const [audiobook] = await db
      .select()
      .from(audiobooks)
      .where(eq(audiobooks.id, id));
    return audiobook;
  }

  async createAudiobook(insertAudiobook: InsertAudiobook): Promise<Audiobook> {
    const [audiobook] = await db
      .insert(audiobooks)
      .values({
        ...insertAudiobook,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return audiobook;
  }

  async updateAudiobook(id: string, updates: Partial<Audiobook>): Promise<Audiobook | undefined> {
    const [audiobook] = await db
      .update(audiobooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(audiobooks.id, id))
      .returning();
    return audiobook;
  }

  async deleteAudiobook(id: string): Promise<boolean> {
    const result = await db.delete(audiobooks).where(eq(audiobooks.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
