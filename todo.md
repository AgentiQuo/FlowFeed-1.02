# Social Poster - Project TODO

## Phase 1: Project Setup & Foundation
- [x] Configure database schema with users, brands, categories, partners, agents tables
- [x] Set up Supabase RLS policies for multi-tenant data isolation
- [x] Create dashboard layout with sidebar navigation
- [x] Implement dark mode support and theme switching
- [x] Set up S3 storage helpers with structured bucket organization
- [x] Create base components and styling system

## Phase 2: Brand Management & Data Models
- [x] Build Brand CRUD pages (list, create, edit, delete)
- [x] Implement Voice Bible upload and storage in S3
- [x] Create Category management interface
- [x] Build Partner and Agent management interfaces
- [x] Add brand-specific settings and configuration page
- [x] Implement RLS policies for brand data access

## Phase 3: Asset Ingestion (Complete)
- [x] Implement drag-and-drop image upload interface
- [x] Create folder upload support
- [x] Build "Quick Add URL" feature with optimistic UI
- [x] Implement URL scraping for real estate listings (text-first extraction)
- [x] Set up background job for async image processing
- [x] Create content category selection interface
- [x] Implement S3 storage with structured naming (brand-id/category-id/asset-type/filename)

## Phase 4: AI Copywriter & Drafts (Complete)
- [x] Integrate Gemini 3 API for vision and metadata extraction
- [x] Integrate Claude Sonnet 4.5 API for creative copywriting
- [x] Build AI orchestration layer for routing tasks
- [x] Implement prompt templates for different content categories
- [x] Create draft generation interface with platform-specific variations
- [x] Build draft review screen with source reference badges
- [x] Implement RAG feedback loop (save user edits to feedback_logs table)
- [x] Create "Teach AI" interface for brand voice refinement

## Phase 5: Queue, Scheduling & Leads (Partial)
- [x] Build smart scheduling queue interface with drag-and-drop reordering
- [x] Implement scheduling logic (daytime only, 2-3 hour random gaps)
- [ ] Create lead capture system with inquiry forms
- [ ] Build agent notification system for new leads
- [x] Implement WordPress-friendly export format (moved to Phase 6)
- [ ] Create lead management dashboard
- [ ] Set up scheduled posting via Edge Functions

## Phase 6: WordPress Export & Production Readiness (Partial)
- [x] Implement WordPress export functionality (HTML, JSON, XML formats)
- [x] Add export UI to DraftsPage with format selection
- [x] Implement download/copy functionality for approved drafts
- [x] Write comprehensive vitest tests for export router
- [ ] Implement comprehensive error handling and user feedback
- [ ] Add loading states and skeleton screens throughout
- [ ] Create cost dashboard for AI API usage monitoring
- [ ] Implement rate limiting on API routes
- [ ] Add accessibility features and keyboard navigation
- [ ] Write integration tests for key workflows
- [ ] Create user documentation and onboarding guide
- [ ] Perform security audit and finalize RLS policies
- [ ] Optimize performance and database queries

## Bugs & Issues
- [x] Partners add button not working - FIXED: Added query invalidation
- [x] Categories not displaying after creation - FIXED: Added query invalidation and toast notifications
- [x] Listings/Categories tab - VERIFIED: All working correctly

## Completed Features
(None yet)


## File Upload Implementation (Complete)
- [x] Create uploadAsset tRPC procedure with file validation
- [x] Implement S3 upload with structured naming (brand/{brandId}/category/{categoryId}/images/{filename})
- [x] Create getAssets and deleteAsset procedures
- [x] Build drag-and-drop upload component with Dropzone
- [x] Add file validation (size, type, dimensions)
- [x] Implement upload progress tracking
- [x] Create asset listing display with thumbnails
- [x] Add image preview functionality
- [x] Implement delete functionality with confirmation
- [x] Test all upload features and verify S3 integration


## Gemini Vision Integration (Complete)
- [x] Create analyzePropertyImage tRPC procedure
- [x] Implement Gemini 3 vision API call with structured JSON response
- [x] Extract property details (bedrooms, bathrooms, square footage, style, condition)
- [x] Integrate analysis into upload workflow (automatic background processing)
- [x] Display extracted metadata in asset listing with full details
- [ ] Add manual metadata editing capability
- [ ] Test with sample property images


## WordPress Export Feature (Complete)
- [x] Create exportDraft tRPC procedure with multiple format support (HTML, JSON, XML)
- [x] Implement WordPress REST API compatible JSON format
- [x] Add HTML export with proper formatting and metadata
- [x] Create batch export functionality for multiple drafts
- [x] Build export UI with format selection
- [x] Add download/copy functionality
- [x] Test WordPress import compatibility
- [x] Write and pass comprehensive vitest tests for all export formats


## Bug Fixes
- [x] Queue button grayed out after draft approval - FIXED: Updated brandId extraction regex to work from any dashboard page, not just /dashboard/brands/[brandId]


## Move to Queue Feature (Complete)
- [x] Create moveToQueue tRPC procedure in queue router
- [x] Add Move to Queue button to approved drafts in DraftsPage
- [x] Implement automatic scheduling when moving to queue
- [x] Add success toast notification
- [x] Test end-to-end workflow with comprehensive vitest tests (5 tests passing)


## Already Queued Indicator Feature (Complete)
- [x] Create checkDraftQueued query in queue router
- [x] Add visual indicator badge to approved drafts
- [x] Show queue status with scheduled time
- [x] Test indicator with queued and non-queued drafts (4 tests passing)


## UI/UX Improvements (Partial)
- [x] Rename "AI Copywriter" tab to "CREATE" for consistency
- [x] Add platform-specific guidelines documentation (text length, hashtags, image ratios)
- [ ] Create platform guidelines table in database
- [x] Build realistic draft preview with image above text
- [ ] Add carousel preview for multi-image posts
- [x] Add "Edit" button for manual tweaks to generated content
- [x] Add "Improve" button with AI rewrite instructions
- [ ] Implement AI feedback loop to learn user preferences
- [x] Add X.com (Twitter) as a platform option
- [x] Add "ALL" button to generate for all platforms at once
- [x] Reorganize platform selection as buttons in the generate section


## Real Image Integration (Complete)
- [x] Fetch asset image data and create image URL helper
- [x] Update preview component to display real images
- [x] Add image loading states and error handling
- [x] Test image preview functionality (6 tests passing)


## Delete Brand Feature (Complete)
- [x] Add delete button to Brand card
- [x] Implement confirmation dialog for deletion
- [x] Create deleteBrand tRPC procedure (already existed)
- [x] Add cascade delete for related data (categories, assets, drafts)
- [x] Test delete functionality end-to-end (8 tests passing)


## Image Carousel Redesign (Complete)
- [x] Build carousel component showing unprocessed assets
- [x] Add left/right navigation arrows
- [x] Display platform selection buttons under each image
- [x] Rename "Generate" button to "Create"
- [x] Test carousel navigation and platform selection


## Carousel Enhancement - Keyboard & Thumbnails (Complete)
- [x] Add keyboard event listener for arrow keys
- [x] Implement left/right arrow key navigation
- [x] Build thumbnail strip component below carousel
- [x] Add click-to-jump functionality for thumbnails
- [x] Test keyboard navigation and thumbnail selection (13 tests passing)
- [x] Maintain platform selections across carousel navigation
- [x] Show platform count in Create button
- [x] Add helpful UI feedback about persistent selections





## Brand Settings & Credentials Management (In Progress)
- [x] Create brandCredentials database table with encrypted credential storage
- [x] Create credentials router with save, list, get, delete, and verify procedures
- [x] Build Brand Settings page accessible from Brands tab
- [x] Create credential input forms for Instagram, X, LinkedIn, Facebook
- [x] Restructure brand tabs: move settings icon to last tab position (replace + button)
- [x] Create AllBrandsPage showing all brands with + button to add new ones
- [x] Update Dashboard to navigate to AllBrandsPage when settings tab clicked
- [ ] Integrate credentials into publish workflow
- [ ] Test credential storage and retrieval end-to-end


## Upload System Integration (Complete)
- [x] Link existing AssetUpload component to + button next to Create button
- [x] Verify upload functionality works with existing system
- [x] Test drag-and-drop and folder upload features


## Asset Management & Image Generation (In Progress)
- [x] Create deleteAsset API endpoint in ingestion router
- [x] Implement long-press delete button between navigation arrows in Dashboard
- [x] Add delete confirmation dialog with visual feedback
- [ ] Add text-to-image generation dialog in upload section
- [ ] Integrate image generation API with asset upload
- [x] Test long-press delete functionality
- [ ] Test text-to-image generation and asset creation


## Posting Schedule System (Complete)
- [x] Create postingSchedules database table with medium-specific intervals
- [x] Add schedule management API endpoints (get, update defaults)
- [x] Implement slot-based queue logic per brand+media combination
- [x] Update queue.addToQueue to use brand+media slot scheduling
- [x] Initialize default schedules for Instagram, X, LinkedIn, Facebook
- [x] Test queue scheduling with multiple brands and media


## Instagram Credentials Form Update (Complete)
- [x] Update BrandSettingsPage Instagram form with Access Token (required, marked with *) first
- [x] Add App Secret field (optional) with proper Instagram naming
- [x] Credentials router already handles App Secret storage
- [x] Test credential storage and retrieval with both fields


## Queue Display & Scheduling Bugs (In Progress)
- [ ] Debug missing queue thumbnail images - check asset URL retrieval
- [x] Fix post scheduling logic - first posts should schedule within next few hours, not tomorrow - FIXED: getLastScheduledPost now orders by DESC
- [ ] Verify asset-to-post relationship is correct
- [ ] Test scheduling with multiple posts
