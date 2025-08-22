# MyNovelCraft - AI-Powered Novel Writing Application

## Overview
MyNovelCraft is a full-stack novel writing application designed to empower writers with comprehensive tools and AI-powered assistance. Its core purpose is to streamline the writing process, from organizing ideas to refining prose, by integrating intelligent suggestions and robust content management. The project aims to provide a competitive edge in the digital writing tools market by offering a seamless blend of traditional writing functionalities with cutting-edge AI capabilities, fostering creativity and productivity for novelists.

## Recent Changes (August 2025)
- ✅ Fixed subscription tier display for Studio users (shows "Studio Plan (Admin)" correctly)
- ✅ Removed inappropriate "Upgrade to Premium" button for Studio tier users  
- ✅ Corrected chapter drag-and-drop to allow bidirectional movement (both up and down)
- ✅ Fixed verification script user count expectation (1 user instead of 2)
- ✅ **RESOLVED: Database configuration reset issue during deployments**
  - Problem: Individual database environment variables (PGHOST, PGPASSWORD, PGUSER, PGDATABASE) conflicted with DATABASE_URL during redeployments
  - Solution: Removed individual variables, kept only DATABASE_URL pointing to holy-river Neon database
  - Result: Production deployments now maintain correct database connection consistently
- ✅ **RESOLVED: Admin subscription management database updates**
  - Problem: Subscription end date changes were not persisting to the database despite successful API responses
  - Root Cause: Storage layer treated undefined values as "don't update" instead of handling null values for field clearing
  - Solution: Updated storage interface to accept Date | null, fixed field clearing logic, enhanced real-time UI updates
  - Result: Admin can now successfully update subscription tiers, set/clear end dates, with immediate form feedback and database persistence
- ✅ **Enhanced chapter writing validation and navigation**
  - Added "Start Writing" button validation with toast notifications to prevent opening editor without selected chapter
  - Improved admin dashboard back navigation to use browser history instead of hardcoded main dashboard link
  - Applied same browser history navigation fix to audiobook generator exit button
  - Enhanced user guidance for chapter creation and selection workflows
- ✅ **Fixed synonym replacement in text editor**
  - Resolved issue where clicking synonyms after double-clicking words didn't replace the highlighted text
  - Updated replaceSelectedWord function to use proper word boundary regex matching
  - Added error handling and user feedback for successful/failed replacements
- 🔄 Custom domain verification in progress: mynovelcraft.com added to deployment (05:05 UTC), DNS/SSL working, final routing configuration pending
  - **08:01 UTC**: Comprehensive support case submitted to Replit with technical documentation after 9+ hour delay
  - **CRITICAL**: 48+ hours delay, but support finally responded - working with Replit to resolve routing issue
- ✅ Enhanced monitoring with domain diagnostic capabilities

## User Preferences
- Preferred communication style: Simple, everyday language
- Cost transparency: Always inform user about cost implications of monitoring or extended operations before proceeding
- Problem-solving approach: Apply systematic debugging with comprehensive logging, direct database testing, and methodical issue isolation when fixing complex problems

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query
- **Build Tool**: Vite
- **UI/UX Decisions**: Consistent design leveraging shadcn/ui components; intuitive navigation with sidebar; dedicated panels for AI interactions and writing tools; modals for specific tasks; advanced text editor with customizable themes, distraction-free modes, and multi-monitor support; rich text mode with visual formatting. Branding includes "MyNovelCraft" with "My" in blue and a BookOpen icon, using the tagline "Written by writers for writers".

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Design**: RESTful API with structured error handling.
- **Data Validation**: Zod schemas for runtime type validation.
- **Authentication**: Replit Auth for user authentication, protecting all API routes and ensuring secure, user-specific private workspaces.

### Data Storage Solutions
- **Database**: PostgreSQL for persistent relational data storage.
- **ORM**: Drizzle ORM for type-safe database operations.
- **Connection**: Environment-specific databases - Replit PostgreSQL for development, Neon Database for production.
- **Schema Management**: Drizzle Kit for database migrations.
- **Storage Implementation**: DatabaseStorage class, replacing in-memory storage for full persistence.
- **Environment Separation**: Production (mynovelcraft.com) uses dedicated Neon database, development uses Replit PostgreSQL to prevent data conflicts.

### Key Components & Features
- **Core Domain Models**: Projects, Chapters, Characters, AI Suggestions, AI Chat Messages, Historical Research Messages, Support Tickets.
- **AI Integration**: Utilizes OpenAI GPT-4o for various writing assistance features including context-aware writing suggestions, plot/character development, general writing query assistance, historical research, AI Literary Editor, AI Writer Consultant, AI Ghostwriter (with "Novel Writer Mode"), AI Detection, spell checking, grammar checking, and thesaurus integration.
- **User Interface Components**:
    - **Rich Text Editor**: Custom editor with auto-save, formatting tools, find/replace, undo/redo, writing statistics, session targets, and export capabilities (MS Word, PDF). Supports custom fonts and automatic paragraph indentation.
    - **Sidebar Navigation**: For project management and navigation.
    - **AI Panel**: For AI interactions, suggestions, and chat history.
    - **Writing Tools Panel**: Includes thesaurus, grammar checker, and spell checker.
    - **Project Management**: Creation, editing, and organization of projects with metadata.
    - **User Documentation**: Comprehensive in-app documentation with feature guides and quick start tutorials.
    - **Interactive Character Development**: Visual timeline, relationship mapping, storyboard view, and development tracking.
    - **Support Ticket System**: Complete ticket creation, tracking, and conversation management with database integration.
    - **Admin Dashboard**: Comprehensive interface for viewing and managing subscriber data, including revenue tracking, user distribution, and subscription management.
    - **Export System**: Overhauled functionality to include comprehensive manuscript structure with front matter (copyright page with logo, table of contents, dedication, epigraph, preface), body chapters, and back matter (about author, appendix, bibliography).
    - **Audiobook System**: Comprehensive pipeline for generating audiobooks from chapter content, including auto-prepending chapter titles, with various voice options.

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o model for all AI-powered writing assistance, content generation, and historical research.

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production deployments.

### Authentication Services
- **Replit Auth**: Integrated for user authentication and session management.

### Payment Processing
- **PayPal**: Fully integrated subscription system with four-tier pricing: Free ($0), Basic ($7), Premium ($15), Studio ($35) and a functional demo mode for testing.
- **Usage Tracking**: Full implementation for monitoring AI service costs (audiobook generation, translations) with monthly limits and pay-per-use overages.

### Utility & Export Libraries
- **Puppeteer**: Used for robust PDF generation.
- **jsPDF**: Fallback PDF generation library.