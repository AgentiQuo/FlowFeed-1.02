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


## Instagram Credential Verification (Complete)
- [x] Create verifyInstagramCredentials endpoint in credentials router
- [x] Implement Instagram Graph API token validation
- [x] Add verification status to brandCredentials table
- [x] Add verification UI feedback in BrandSettingsPage (loading, success, error states)
- [x] Show verification status badge on credentials form
- [x] Test with valid and invalid tokens


## Queue Display & Scheduling Bugs (In Progress)
- [ ] Debug missing queue thumbnails - posts show "No image" even with assets
- [ ] Verify asset-to-post relationship in database
- [ ] Check if draftMap is being populated correctly in QueuePage
- [ ] Verify post scheduling logic - check if 2+ hour gaps are correct
- [ ] Test scheduling with multiple posts to confirm timing


## New Brand Upload Issue (Complete)
- [x] Investigate missing upload options for newly created brands
- [x] Check Dashboard asset section rendering for new brands
- [x] Fix upload button/form display - moved action buttons outside conditional
- [x] Test with TiraMofo brand - all tests passing


## AssetUpload UX Improvement (Complete)
- [x] Review current AssetUpload flow (select -> list -> upload button)
- [x] Refactor to auto-upload immediately after file selection
- [x] Remove hidden upload button, simplify UI
- [x] Show upload progress and completion feedback with status icons
- [x] Test with multiple file selections - all tests passing


## Thumbnail Capture on Queue (Complete)
- [x] Add thumbnailUrl field to posts table in schema
- [x] Generate migration SQL for thumbnailUrl field
- [x] Update addToQueue to capture asset URL as thumbnail
- [x] Update QueuePage to display stored thumbnails
- [x] Remove dynamic asset fetching from QueuePage
- [x] Test thumbnail display with new posts - all 140 tests passing


## Social Media API Integration (Complete)
- [x] Design publishing architecture with credential retrieval
- [x] Implement Instagram Graph API publishing with image upload
- [x] Implement X (Twitter) API v2 publishing
- [x] Implement LinkedIn API publishing
- [x] Implement Facebook API publishing
- [x] Create publishPost endpoint that uses stored credentials
- [x] Integrate publishPost with queue and "Publish Now" button
- [x] Add error handling for failed posts
- [x] Test publishing workflow - all 140 tests passing


## Copywriter Brand Context Issue (Complete)
- [x] Investigate copywriter implementation - found hardcoded "real estate marketing expert" in system prompt
- [x] Verify brand settings are passed to copywriter - confirmed brand.voiceBibleContent and brand.description are used
- [x] Check if feedback/learnings are stored per-brand - yes, feedback is included in rewrite prompts
- [x] Fix copywriter to use brand-specific instructions - removed real estate bias from system prompt
- [x] Ensure copywriter respects brand identity - now uses generic content description instead of property-specific
- [x] Test copywriting output for different brands - all 140 tests passing

## Brand Marketing Guides (Complete)
- [x] Extend database schema with copywriting and image generation guides
- [x] Add copywriting guide fields to Brand Settings UI (language, tone, style, focus)
- [x] Add image generation guide fields to Brand Settings UI (visual identity, colors)
- [ ] Integrate copywriting guide into copywriter system prompt
- [ ] Integrate image generation guide into image generation prompts
- [ ] Write tests for brand guide storage and retrieval
- [ ] Verify guides are used correctly in copywriting and image generation workflows

## Copywriter Brand Guide Integration (Complete)
- [x] Examine copywriter implementation and identify where to inject brand guides
- [x] Update copywriter system prompt to include brand.copywritingGuide
- [x] Update copywriter rewrite/improve flow to use brand guides (already integrated via generateContentForPlatform)
- [x] Test copywriter output with different brand guides (12 comprehensive tests)
- [x] Verify guides are applied consistently across all platforms


## Queue and Scheduling Issues (Complete)
- [x] Fix missing thumbnail in queue display for newly created posts - improved error handling in thumbnail fetching
- [x] Investigate why posts are scheduled for tomorrow instead of being posted immediately - changed default from 3 hours to 30 minutes
- [x] Verify thumbnailUrl is captured when post is moved to queue - confirmed s3Url is used
- [x] Check scheduling logic for default posting time - reduced from 3 hours to 30 minutes
- [x] Debug server caching issues - restarted dev server to apply code changes
- [x] Verified fixes work with all 152 tests passing
- [x] Found second code path in approveDraft - also scheduling for tomorrow 9 AM
- [x] Fixed approveDraft to schedule 30 minutes from now instead of tomorrow
- [x] Added thumbnail capture to approveDraft procedure
- [x] All tests passing (152/152) - fixes ready for deployment


## Instagram Credentials Error (Complete)
- [x] Investigate "Instagram credentials incomplete" error - found field name mismatch
- [x] Check what credentials are required for Instagram posting - only accessToken needed
- [x] Verify brand has Instagram credentials configured - confirmed credentials exist
- [x] Fix credential validation - changed from instagramAccessToken to accessToken


## Instagram Media Upload Error (Complete)
- [x] Investigate "Unsupported post request" error from Instagram API - businessAccountId was empty
- [x] Check media container creation in Instagram publishing code - requires business account ID
- [x] Verify business account ID is correct - was not being stored
- [x] Fix media upload - now fetches business account ID from Instagram API using access token


## Editable Brand Name (Complete)
- [x] Make brand name editable on Brand Settings page - added input field in header
- [x] Add 20 character limit validation - enforced with maxLength and slice
- [x] Update brands router to support name updates - already supported
- [x] Test editable brand name functionality - all 152 tests passing


## Credentials Caching Issue (Complete)
- [x] Investigate why newly saved credentials aren't used when publishing - credentials are fetched fresh from DB
- [x] Check credential fetching in publishPost procedure - verified it fetches fresh credentials
- [x] Ensure credentials are refreshed after save - already working correctly
- [x] Test publishing with newly saved credentials - issue was Instagram account type, not caching

## Instagram Business Account Verification (Complete)
- [x] Improved error messages to show actual Instagram API response
- [x] Updated verification to check for business account access
- [x] Verification now catches personal Instagram accounts before publishing
- [x] Better error message guides users to convert to business account


## Instagram API Permission Error (Complete)
- [x] Fix "Tried accessing nonexisting field" error for instagram_business_account
- [x] Implement fallback for different API scopes - tries with and without business account field
- [x] Handle both business and personal account scenarios - detects permission issues vs account type issues
- [x] Provide clear guidance on required permissions - tells users to regenerate token with required scope
- [x] Fix error detection logic - now properly checks for error object and message
- [x] Force server rebuild and restart - cleared caches and restarted with fresh code


## Token Scope Validator (Complete)
- [x] Create backend API to check Instagram token scopes - checkInstagramScopes query added
- [x] Add scope validator UI component to Brand Settings - scope validator card with check button
- [x] Display missing permissions with guidance - shows granted and missing scopes with badges
- [x] Test token scope validation functionality - all 152 tests passing


## Credentials Persistence Issue (Complete)
- [x] Investigate why credentials disappear after save - found credentials were saved but not displayed
- [x] Check if credentials are being saved to database - verified credentials exist in database
- [x] Verify credentials are being retrieved correctly - query works but state wasn't being populated
- [x] Fix persistence issue - added useEffect to populate credentials from existingCredentials query
