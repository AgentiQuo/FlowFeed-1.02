# Brand Marketing Guides Implementation Plan

## Current State
- BrandSettingsPage has tabs for Instagram, X, LinkedIn, Facebook
- Only stores social media credentials (API keys, access tokens)
- No brand-specific marketing guides

## Required Changes

### 1. Database Schema (Phase 1)
Add new fields to `brands` table:
- `copywritingGuide` (longtext): Language, tone of voice, style, focus
- `imageGenerationGuide` (longtext): Visual identity, colors, design principles

Migration SQL:
```sql
ALTER TABLE brands ADD COLUMN copywritingGuide LONGTEXT;
ALTER TABLE brands ADD COLUMN imageGenerationGuide LONGTEXT;
```

### 2. Brand Settings UI (Phase 2)
Add two new tabs to BrandSettingsPage:
- **Copywriting Guide Tab**: Textarea for language/tone/style/focus guidance
- **Image Generation Guide Tab**: Textarea for visual identity/colors guidance

### 3. Integration (Phase 3)
- Update copywriter to use `brand.copywritingGuide` in system prompt
- Update image generation to use `brand.imageGenerationGuide` in prompts
- Ensure guides are passed to LLM calls

### 4. Tests (Phase 4)
- Test guide storage and retrieval
- Test guide usage in copywriter
- Test guide usage in image generation

## Files to Modify
1. `/home/ubuntu/social-poster/drizzle/schema.ts` - Add guide fields
2. `/home/ubuntu/social-poster/client/src/pages/BrandSettingsPage.tsx` - Add UI tabs
3. `/home/ubuntu/social-poster/server/routers/brands.ts` - Update save/get procedures
4. `/home/ubuntu/social-poster/server/_core/social-media.ts` - Use guides in copywriter
5. `/home/ubuntu/social-poster/server/_core/imageGeneration.ts` - Use guides in image generation
