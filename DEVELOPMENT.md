# Social Poster - Development Status & Architecture Guide

**Last Updated:** April 3, 2026  
**Version:** 851c9113  
**Status:** Stable with new features in progress

---

## Project Overview

Social Poster is an AI-powered content creation platform for multi-brand real estate marketing. It allows users to:
- Manage multiple brands with unique voice profiles
- Upload property images/assets
- Generate platform-specific social media content (Instagram, LinkedIn, Facebook, X)
- Schedule and queue posts with intelligent timing
- Track content performance analytics

---

## Current Feature Status

### ✅ Completed Features

**Brand Management**
- Create, edit, delete brands
- Brand voice/tone configuration
- Brand detail pages with asset management

**Asset Ingestion**
- Upload property images
- Organize assets by brand
- S3 storage integration with CDN URLs

**Content Generation**
- AI-powered copywriting (Gemini + Claude)
- Platform-specific content optimization
- Support for Instagram, LinkedIn, Facebook, X platforms
- Carousel image selection with keyboard shortcuts
- Persistent platform selection across carousel navigation
- Brand name display above carousel

**Draft Management**
- Generate drafts for multiple platforms in one action
- View generated drafts immediately on Create page
- Edit draft content inline
- Copy, export, and queue drafts
- Draft status tracking (draft/reviewed/published)

**Queue & Scheduling**
- Queue drafts for scheduled posting
- Intelligent 3-hour staggered scheduling
- Drag-to-reorder posts (updates timing)
- View all scheduled posts across brands
- Brand filter dropdown on Queue page
- Asset thumbnails on Queue page

**Analytics**
- Track platform performance by engagement
- Engagement metrics (impressions, clicks, comments)
- Performance analytics router with filtering

**Templates**
- Save draft formulas as reusable templates
- Filter templates by property type
- Template usage statistics

**Bulk Operations**
- Bulk schedule with staggered timing
- Bulk scheduling across multiple platforms

### 🚧 In Progress

**Platform-Specific Previews**
- Created `platformPreview.ts` helper with realistic dimensions:
  - Instagram: 1080x1080 (square)
  - LinkedIn: 1200x628 (landscape)
  - Facebook: 1200x628 (landscape)
  - X: 506x506 (square)
  - Website: 1200x800 (landscape)
- Created `DraftPreview.tsx` component for rendering
- **Next:** Add simple platform filter buttons to drafts list

### 📋 Planned Features

1. **Platform Preview Filters** - Toggle between viewing Instagram/LinkedIn/Facebook/X posts
2. **Realistic Draft Previews** - Show drafts at platform-specific dimensions with proper text positioning
3. **Export Queue as CSV** - Download scheduled posts for external reporting
4. **Bulk Reschedule** - Shift multiple posts by X hours/days
5. **Post Conflict Detection** - Warn when posts are scheduled too close together
6. **Calendar View** - Visual grid of scheduled posts by date/time
7. **Platform Performance Badges** - Quick engagement stats on queued posts

---

## Architecture Decisions

### Frontend Structure

**Page Organization:**
- `Home.tsx` - Landing page with feature overview
- `BrandsPage.tsx` - Brand list and management
- `BrandDetailPage.tsx` - Brand settings and asset management
- `DraftsPage.tsx` (Create) - Asset carousel, draft generation, and review
- `IngestionPage.tsx` (Upload) - Asset upload interface
- `QueuePage.tsx` - Scheduling queue with all-brands view

**Component Reusability:**
- `DashboardLayout.tsx` - Sidebar navigation wrapper
- `DraftPreview.tsx` - Reusable draft card with platform-specific rendering
- `Map.tsx` - Google Maps integration (available but not yet used)
- `AIChatBox.tsx` - Chat interface (available but not yet used)

### Backend Architecture

**tRPC Routers:**
- `brands.ts` - Brand CRUD and management
- `ingestion.ts` - Asset upload and listing
- `content.ts` - Draft generation with AI
- `queue.ts` - Queue management and scheduling
- `analytics.ts` - Performance tracking
- `templates.ts` - Template management
- `bulk-schedule.ts` - Bulk operations

**Database Schema:**
- `brands` - Brand profiles with voice configuration
- `assets` - Uploaded images with S3 URLs
- `drafts` - Generated content with platform/status
- `posts` - Scheduled posts with timing and platform
- `feedbackLogs` - User feedback and analytics

**LLM Integration:**
- Gemini for initial content generation
- Claude for refinement and tone adjustment
- Structured JSON responses for platform-specific formatting

### Data Flow

```
User Upload Assets
    ↓
Select Asset + Platforms
    ↓
AI Generates Platform-Specific Content
    ↓
User Reviews Drafts (can edit)
    ↓
Queue Drafts (auto-calculates 3hr stagger)
    ↓
Posts Scheduled for Publishing
```

---

## Key Learnings & Best Practices

### ✅ What Worked Well

1. **Persistent Platform Selection** - Maintaining selected platforms across carousel navigation improved UX significantly
2. **Auto-Select First Asset** - Enabling Create button by default reduced friction
3. **Inline Draft Editing** - Users can edit content without leaving the page
4. **All-Brands Queue View** - Showing all scheduled posts with brand filter is more useful than per-brand view
5. **Drag-to-Reorder with Timing** - Reordering posts automatically recalculates scheduling times
6. **Platform-Specific Prompts** - Different character limits and formatting for each platform improves quality

### ⚠️ Challenges & Solutions

**Challenge: JSX Refactoring Complexity**
- **Problem:** Large existing components are hard to refactor without breaking JSX structure
- **Solution:** Create new components separately, then integrate gradually with feature flags
- **Lesson:** For complex pages, plan component extraction early rather than retrofitting

**Challenge: Multiple Drafts from Single Asset**
- **Problem:** 5 images × 3 platforms = 15 drafts, making list view cluttered
- **Solution:** Add platform filter buttons to toggle between views
- **Lesson:** Filtering is more scalable than showing everything at once

**Challenge: Platform-Specific Preview Dimensions**
- **Problem:** Drafts need to show at realistic platform sizes (Instagram 1:1, LinkedIn 16:9, etc.)
- **Solution:** Created `platformPreview.ts` helper with config for each platform
- **Lesson:** Centralize platform specs to avoid duplication

**Challenge: X Platform Support**
- **Problem:** X (formerly Twitter) not in database schema enum
- **Solution:** Added X to all platform enums and created migration
- **Lesson:** Always verify platform support across schema, routers, and UI

### 🎯 Design Patterns Used

1. **Platform Configuration Pattern** - Centralized platform specs in `platformPreview.ts`
2. **Component Composition** - Reusable `DraftPreview` component for consistent rendering
3. **State Filtering** - Use state to filter rendered items rather than querying backend
4. **Optimistic Updates** - Queue mutations update UI immediately, then sync with server
5. **Batch Operations** - Bulk scheduling calculates all timings in one operation

---

## Testing Strategy

**Test Coverage:** 132 tests across 14 test files

**Test Categories:**
- Unit tests for content generation (platform-specific formatting)
- Integration tests for queue operations (scheduling, reordering)
- Analytics tests (engagement tracking)
- Template tests (CRUD and filtering)
- Bulk schedule tests (timing calculations)
- Brand management tests (CRUD operations)
- Auth tests (logout flow)

**Running Tests:**
```bash
pnpm test                    # Run all tests
pnpm test server/            # Run server tests only
pnpm test --watch           # Watch mode
```

---

## Performance Considerations

1. **Asset Image Loading** - Lazy load thumbnails, cache in state
2. **Draft Generation** - Show loading state during AI generation (5-20 seconds typical)
3. **Queue Rendering** - Filter on client-side to avoid extra server calls
4. **Database Queries** - Use indexes on brandId, platform, status fields
5. **S3 Storage** - All images stored in S3, referenced by URL (no local storage)

---

## Security & Privacy

1. **Authentication** - Manus OAuth with JWT session cookies
2. **Authorization** - Brand access scoped to owner via user context
3. **API Keys** - LLM and S3 credentials stored server-side only
4. **Data Isolation** - All queries filtered by current user's brands
5. **No File Storage** - Assets stored in S3, not in project directory

---

## Deployment Notes

**Before Publishing:**
1. Create checkpoint via Management UI
2. Verify all 132 tests pass
3. Test key flows: brand creation → asset upload → draft generation → queue
4. Check platform-specific content quality

**Environment Variables:**
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session signing key
- `VITE_APP_ID` - Manus OAuth app ID
- `OAUTH_SERVER_URL` - OAuth backend URL
- `BUILT_IN_FORGE_API_KEY` - LLM and storage API key
- `BUILT_IN_FORGE_API_URL` - Manus built-in APIs endpoint

---

## Next Steps (Priority Order)

1. **Platform Filter Buttons** (Current) - Add simple toggle between platforms on Create page
2. **Realistic Draft Previews** - Integrate DraftPreview component one platform at a time
3. **Export Queue as CSV** - Download scheduled posts for reporting
4. **Bulk Reschedule** - Shift multiple posts by time offset
5. **Calendar View** - Visual grid of scheduled posts

---

## Useful Commands

```bash
# Development
pnpm dev                     # Start dev server
pnpm build                   # Production build
pnpm test                    # Run tests
pnpm test --watch           # Watch mode

# Database
pnpm drizzle-kit generate   # Generate migrations
pnpm drizzle-kit push       # Apply migrations

# Code Quality
pnpm lint                   # Check linting
pnpm format                 # Format code
```

---

## File Structure Reference

```
/home/ubuntu/social-poster/
├── client/
│   ├── src/
│   │   ├── pages/           ← Page components
│   │   ├── components/      ← Reusable components
│   │   ├── lib/             ← Utilities (trpc, platformPreview)
│   │   └── App.tsx          ← Routes and layout
│   └── index.html
├── server/
│   ├── routers/             ← tRPC procedure definitions
│   ├── db.ts                ← Database query helpers
│   └── _core/               ← Framework internals (don't edit)
├── drizzle/
│   ├── schema.ts            ← Database table definitions
│   └── migrations/          ← SQL migration files
└── DEVELOPMENT.md           ← This file
```

---

## Contact & Questions

For questions about architecture, design decisions, or implementation details, refer to:
- Code comments in key files
- Test files for usage examples
- This documentation for high-level overview
