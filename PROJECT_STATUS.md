# Social Poster - Project Status & Learnings

**Last Updated:** April 4, 2026  
**Current Version:** 4d46c77b  
**Status:** In Active Development

---

## Project Overview

Social Poster is a multi-brand social media content management and publishing platform. It enables users to:
- Manage multiple brands with separate configurations
- Upload and organize content assets
- Generate AI-powered social media posts with Gemini vision and Claude copywriting
- Schedule and queue posts for publishing
- Configure social media API credentials per brand
- Export content in multiple formats (WordPress-compatible)

---

## Architecture Overview

### Technology Stack
- **Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11 + Drizzle ORM
- **Database:** MySQL/TiDB with Drizzle migrations
- **Authentication:** Manus OAuth
- **AI Integration:** Gemini 3 (vision), Claude Sonnet 4.5 (copywriting)
- **Storage:** S3 (via Manus built-in storage)

### Key Modules

#### Frontend (`client/src/`)
- **Pages:** Dashboard, QueuePage, BrandSettingsPage, AllBrandsPage, DraftsPage, etc.
- **Components:** DraftPreview, AssetUpload, DashboardLayout, AIChatBox, Map
- **Hooks:** useAuth, custom tRPC hooks
- **Contexts:** ThemeContext, Auth context

#### Backend (`server/`)
- **Routers:** brands, ingestion, content, queue, export, analytics, bulk-schedule, templates, credentials
- **Database:** Drizzle schema with 11 tables (users, brands, categories, partners, agents, contentAssets, drafts, posts, leads, feedbackLogs, brandCredentials)
- **Core:** OAuth, context, LLM integration, voice transcription, image generation, storage helpers

---

## Skills & Patterns Learned

### 1. **Multi-Tenant Brand Management**
- Implemented brand-scoped data isolation using `brandId` foreign keys
- Learned to structure UI for brand switching (tab-based navigation)
- Pattern: Brand context flows through all queries and mutations

### 2. **Encrypted Credential Storage**
- Created `brandCredentials` table for storing API tokens per brand/platform
- Implemented JSON serialization for flexible credential storage
- Pattern: Store metadata (accountId, accountName) separately from encrypted credentials
- Learning: Credentials should be verified on save and status tracked (pending/verified/failed)

### 3. **Tab-Based Navigation Architecture**
- Restructured brand tabs to use TabsTrigger with special values ("settings", "new")
- Pattern: Use onValueChange to route to different pages based on tab selection
- Learning: Settings as last tab is cleaner UX than floating buttons

### 4. **Grid-Based Brand Management Page**
- Created AllBrandsPage with responsive card grid (1 col mobile, 2 col tablet, 3 col desktop)
- Each card has multiple action buttons (Open, Settings, Delete)
- Pattern: Use AlertDialog for destructive actions with confirmation

### 5. **Dialog-Based Forms**
- Implemented create brand dialog with form validation
- Pattern: Dialog wrapper around form content for reusability
- Learning: Dialog state management (open/close) should be separate from form state

### 6. **tRPC Router Organization**
- Split routers into feature modules (brands, credentials, content, etc.)
- Pattern: Each router file handles one domain with CRUD operations
- Learning: Procedures should validate input with Zod schemas

### 7. **Database Schema Evolution**
- Used Drizzle migrations for schema changes
- Pattern: Generate migration SQL, review, then execute
- Learning: Always use `CREATE TABLE IF NOT EXISTS` for safety

### 8. **Error Handling & User Feedback**
- Implemented toast notifications for success/error states
- Pattern: Use `onSuccess` and `onError` callbacks in mutations
- Learning: Show specific error messages from server responses

### 9. **Type Safety End-to-End**
- tRPC provides type inference from server to client automatically
- Pattern: Define input/output schemas with Zod, types flow automatically
- Learning: No need for separate API contract files

### 10. **Asset & Media Management**
- S3 storage with structured naming: `brand/{brandId}/category/{categoryId}/images/{filename}`
- Pattern: Store S3 URL in database, reference via CDN
- Learning: Never store file bytes in database, always use object storage

---

## Current Feature Status

### ✅ Completed
- User authentication (Manus OAuth)
- Brand CRUD operations
- Category management
- Partner & Agent management
- Asset ingestion (drag-drop, folder upload, URL scraping)
- Gemini vision analysis for property images
- Claude copywriting with platform-specific variations
- Draft generation and approval workflow
- Queue scheduling with drag-and-drop reordering
- WordPress export (HTML, JSON, XML formats)
- Brand credentials storage (Instagram, X, LinkedIn, Facebook)
- All Brands management page
- Brand Settings page for credentials

### 🟡 In Progress
- Credential verification (API testing)
- Publish workflow integration with stored credentials
- Lead capture system

### ⏳ Not Started
- Scheduled posting via background jobs
- Lead management dashboard
- Agent notifications
- Cost dashboard for AI usage
- Rate limiting
- Comprehensive accessibility audit

---

## Code Quality Metrics

- **Test Coverage:** 140 tests passing (15 test files)
- **TypeScript Errors:** 0
- **Build Errors:** 0
- **Linting:** Configured (ESLint ready)
- **Code Files:** ~892 TypeScript/TSX files

---

## Known Issues & Limitations

1. **X API Authentication:** Currently using OAuth 2.0 Application-Only, but X requires OAuth 1.0a User Context for posting. Needs credential flow update.

2. **Credential Encryption:** Currently using JSON.stringify for credentials (not encrypted). Should implement proper encryption before production.

3. **Thumbnail Display:** Asset images in queue list not displaying. Likely S3 URL issue or asset lookup logic needs debugging.

4. **Publish Workflow:** Currently uses placeholder code. Needs integration with stored credentials and actual API calls.

---

## Database Schema

### Core Tables
- **users** - Authentication and user profiles
- **brands** - Multi-tenant brand data
- **categories** - Content categories per brand
- **contentAssets** - Uploaded images/media
- **drafts** - Generated social media posts
- **posts** - Published/scheduled posts
- **brandCredentials** - Encrypted API credentials per brand/platform

### Supporting Tables
- **partners** - Partner information
- **agents** - Agent profiles
- **leads** - Lead capture data
- **feedbackLogs** - AI feedback for model improvement

---

## Performance Considerations

1. **Query Optimization:** Use Drizzle select() with specific columns, not *
2. **Pagination:** Large asset lists should be paginated
3. **Image Optimization:** Consider lazy loading for asset carousels
4. **API Rate Limiting:** Implement rate limiting on tRPC procedures
5. **Caching:** Consider caching brand/category data with invalidation

---

## Security Checklist

- [x] OAuth authentication implemented
- [x] Protected procedures with protectedProcedure
- [x] Input validation with Zod schemas
- [ ] Credential encryption (TODO)
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] SQL injection prevention (Drizzle handles this)
- [ ] XSS prevention (React handles this)

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] S3 bucket configured
- [ ] OAuth credentials set up
- [ ] API rate limiting configured
- [ ] Error monitoring (Sentry/similar)
- [ ] Performance monitoring
- [ ] Backup strategy

---

## Next Priority Features

1. **Credential Verification:** Test API credentials on save
2. **Publish Integration:** Use stored credentials for actual posting
3. **Lead Capture:** Implement inquiry form system
4. **Scheduled Jobs:** Background task for scheduled posting
5. **Analytics Dashboard:** Track post performance metrics

---

## Development Notes

### Common Patterns Used

```typescript
// tRPC Procedure Pattern
export const myRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),
});

// Query Pattern
const { data, isLoading } = trpc.feature.list.useQuery();

// Mutation Pattern
const mutation = trpc.feature.create.useMutation({
  onSuccess: () => utils.feature.list.invalidate(),
  onError: (error) => toast.error(error.message),
});

// Component Pattern
export default function MyPage() {
  const [state, setState] = useState();
  const { data } = trpc.feature.list.useQuery();
  const mutation = trpc.feature.create.useMutation();
  return <div>...</div>;
}
```

### File Organization

```
client/src/
  ├── pages/          # Page components (Dashboard, QueuePage, etc.)
  ├── components/     # Reusable UI components
  ├── contexts/       # React contexts
  ├── hooks/          # Custom hooks
  ├── lib/            # Utilities (trpc client, etc.)
  └── index.css       # Global styles

server/
  ├── routers/        # Feature routers (brands, content, etc.)
  ├── db.ts           # Database helpers
  ├── routers.ts      # Main router export
  └── _core/          # Framework code (OAuth, context, etc.)

drizzle/
  ├── schema.ts       # Database schema
  └── *.sql           # Migration files
```

---

## Backup Information

- **Last Checkpoint:** 4d46c77b
- **Backup Location:** Manus checkpoint system
- **Database:** Recoverable from Manus managed database
- **S3 Assets:** Stored in Manus S3 bucket

---

## Contact & Support

For issues or questions about the codebase, refer to:
- Template README.md for framework documentation
- Individual router files for API specifications
- Component files for UI patterns
