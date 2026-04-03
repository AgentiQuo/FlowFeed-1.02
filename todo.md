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

## Phase 3: Asset Ingestion
- [ ] Implement drag-and-drop image upload interface
- [ ] Create folder upload support
- [ ] Build "Quick Add URL" feature with optimistic UI
- [ ] Implement URL scraping for real estate listings (text-first extraction)
- [ ] Set up background job for async image processing
- [ ] Create content category selection interface
- [ ] Implement S3 storage with structured naming (brand-id/category-id/asset-type/filename)

## Phase 4: AI Copywriter & Drafts
- [ ] Integrate Gemini 3 API for vision and metadata extraction
- [ ] Integrate Claude Sonnet 4.5 API for creative copywriting
- [ ] Build AI orchestration layer for routing tasks
- [ ] Implement prompt templates for different content categories
- [ ] Create draft generation interface with platform-specific variations
- [ ] Build draft review screen with source reference badges
- [ ] Implement RAG feedback loop (save user edits to feedback_logs table)
- [ ] Create "Teach AI" interface for brand voice refinement

## Phase 5: Queue, Scheduling & Leads
- [ ] Build smart scheduling queue interface with drag-and-drop reordering
- [ ] Implement scheduling logic (daytime only, 2-3 hour random gaps)
- [ ] Create lead capture system with inquiry forms
- [ ] Build agent notification system for new leads
- [ ] Implement WordPress-friendly export format
- [ ] Create lead management dashboard
- [ ] Set up scheduled posting via Edge Functions

## Phase 6: Polish & Production Readiness
- [ ] Implement comprehensive error handling and user feedback
- [ ] Add loading states and skeleton screens throughout
- [ ] Create cost dashboard for AI API usage monitoring
- [ ] Implement rate limiting on API routes
- [ ] Add accessibility features and keyboard navigation
- [ ] Write unit tests for critical utilities
- [ ] Write integration tests for key workflows
- [ ] Create user documentation and onboarding guide
- [ ] Perform security audit and finalize RLS policies
- [ ] Optimize performance and database queries

## Bugs & Issues
(None reported yet)

## Completed Features
(None yet)
