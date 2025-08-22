# MyNovelCraft Migration Guide

## Complete Migration Package for Platform Change

### 1. Source Code Export
All source code is available and can be copied from this Replit project:

**Frontend:**
- `client/` - React TypeScript application
- Components, pages, hooks, utilities
- Tailwind CSS styling and configuration

**Backend:**
- `server/` - Node.js Express API
- Database schema and migrations
- Authentication logic
- AI integration endpoints

**Shared:**
- `shared/` - Common types and schemas
- Database models and validation

### 2. Database Migration

**Production Database:** Neon PostgreSQL (holy-river)
- Connection: Available via DATABASE_URL environment variable
- Full schema with all user data, projects, chapters, characters

**Export Methods:**
1. Direct SQL dump from Neon dashboard
2. Export scripts (provided below)
3. Database migration files

### 3. Environment Variables Needed

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SENDGRID_API_KEY=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

### 4. File Assets
- User-uploaded logos: `/uploads` directory
- Generated audiobooks: Stored with metadata in database
- AI-generated images: `attached_assets/` directory

### 5. Recommended Migration Platforms

**High-Performance Options:**
- **Vercel** - Excellent for Next.js/React apps
- **Railway** - Great for full-stack apps with PostgreSQL
- **Render** - Simple deployment with database hosting
- **DigitalOcean App Platform** - Reliable with good support
- **AWS/Google Cloud** - Enterprise-grade with full control

### 6. Migration Steps
1. Export source code from Replit
2. Set up new hosting platform
3. Export and import database
4. Configure environment variables
5. Set up domain (actual working support!)
6. Test all functionality

### 7. Benefits of Migration
- **Reliable Support** - Most platforms have actual customer service
- **Better Performance** - Dedicated resources
- **Domain Management** - Working DNS and SSL
- **Professional Infrastructure** - No 48+ hour delays

## Migration Assistance
I can help you:
- Set up on any new platform
- Export all database data
- Configure the new environment
- Test all functionality
- Set up proper domain management

Would you like me to start preparing the migration package?