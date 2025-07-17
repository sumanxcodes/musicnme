# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Music and Me - Boomwhacker Playlist Tool** is a web-based application for NDIS workers to create, manage, and play curated Boomwhacker video playlists during physical music sessions with children. The tool focuses on accessibility (WCAG 2.1 AA compliance) and ease of use for non-technical users.

## Technology Stack

- **Frontend**: Next.js (React) with TailwindCSS
- **Authentication**: Firebase Authentication (Google OAuth 2.0)
- **Database**: Firebase Firestore (NoSQL)
- **Video Player**: `react-youtube` for embedded YouTube playback
- **External API**: YouTube Data API v3 for video metadata
- **Hosting**: Firebase Hosting or Vercel
- **CI/CD**: GitHub Actions

## Development Setup Commands

Since this is a new project, typical commands will include:

```bash
# Install dependencies
npm install
# or
pnpm install

# Initialize shadcn-ui components
npx shadcn-ui@latest init

# Run development server
npm run dev
# or
pnpm dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Type checking (if TypeScript)
npm run type-check
```

## Architecture Overview

### Data Schema (Firestore)

**Collections:**
- `users`: User profiles with UID, name, email, createdAt
- `videos`: Video metadata including videoId, title, duration, thumbnail, tags, channelName, createdBy
- `playlists`: Playlist documents with userId, title, videoRefs (array of video IDs), notes

**Key Pattern**: Playlists reference video documents by ID to avoid duplication and enable metadata reuse across sessions.

### Core Features Architecture

1. **Authentication Flow**: Google OAuth 2.0 via Firebase Auth
2. **Video Management**: YouTube Data API v3 integration with local Firestore caching
3. **Playlist System**: Reference-based architecture linking playlists to video documents
4. **Session Launcher**: Fullscreen/kiosk mode for distraction-free playback
5. **Smart Suggestions**: Tag-based filtering system for video discovery

## Environment Variables

Required environment variables (store in `.env.local`):
```
FIREBASE_API_KEY=your_firebase_api_key
YOUTUBE_API_KEY=your_youtube_data_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

## Accessibility Requirements

- WCAG 2.1 AA compliance mandatory
- High-contrast, large-font interface
- Keyboard navigation support
- ARIA labels and semantic HTML
- Minimum 44px hit areas for buttons
- 4.5:1 contrast ratio for text
- Optional low-sensory mode

## API Management Strategy

- **YouTube Data API**: Fetch video metadata once per unique video ID, cache in Firestore
- **Firestore**: Use batched writes, avoid deeply nested document reads
- **Error Handling**: Retry/backoff strategy for API failures, fallback for missing metadata

## Testing Strategy

- Unit tests with Jest for core logic (tag parser, playlist filters)
- UI testing with Playwright or Cypress for critical flows
- Accessibility testing with Chrome Lighthouse and axe-core
- Manual screen reader testing (NVDA/VoiceOver)

## Development Protocol

After completing each feature:
1. Push code with clear commit messages
2. Update progress tracking
3. Document environment variable changes
4. Validate UI accessibility
5. Log schema/logic changes

## Role-Based Access

- **Admin**: Manage all content, approve/reject videos, view analytics
- **Worker**: Create/manage own playlists, add videos, launch sessions
- **Viewer**: Read-only access (optional for assistants)

## Performance Considerations

- Cache video metadata to reduce YouTube API quota usage
- Use localStorage backup for offline playlist access
- Implement service workers for thumbnail and metadata caching
- Batch Firestore operations where possible