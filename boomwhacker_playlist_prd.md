# Product Requirement Document (PRD): Music and Me - Boomwhacker Playlist Tool

---

## 1. Product Overview
**Product Name:** Music and Me - Boomwhacker Playlist Tool  
**Purpose:** A web-based tool for NDIS workers to easily create, manage, and play curated Boomwhacker video playlists for use during physical music sessions with children.

This tool reduces the overhead of manual playlist creation by enabling smart suggestions, reusable templates, and accessible interfaces tailored for disability-inclusive environments. The application will be developed with the assistance of AI agents (such as Gemini CLI or Claude), automating boilerplate generation, integration, and code completion.

---

## 2. Target Users
**Primary Users:** NDIS workers who run 'Music and Me' sessions with children  
**Secondary Users:** Admins managing video content and templates  

**User Traits:**
- Non-technical
- Need rapid access to music content
- Repetitive session structure with occasional custom needs

---

## 3. Core Features (MVP)
### 3.5 Admin & Moderation Tools
- Role-based access (worker, admin)
- Admin panel for viewing all video and playlist submissions
- Ability to approve/reject community-submitted content or tags
- Admin-curated templates and suggested playlists
- Usage dashboard (most-used tags/videos)
- Flagging system for inappropriate or broken content
### 3.1 Google Login
- One-click login via Google OAuth 2.0
- Store user profile (name, email, UID)
- No passwords to manage

### 3.2 Playlist Creation & Management
- Create playlists with custom names
- Add YouTube video URLs manually
- Auto-fetch video metadata using YouTube Data API v3:
  - Title
  - Thumbnail
  - Duration
  - Channel Name
- Drag-and-drop video reordering
- Save, delete, and reuse playlists

### 3.3 Smart Playlist Suggestions
- Tagging system for videos (e.g., "C major", "fast", "warmup")
- Filter and suggest playlists based on:
  - Tags
  - Duration
  - Recently used
  - Day of week

### 3.4 Session Launcher
- "Start Session" mode to enter fullscreen/kiosk player view
- Option to play next video automatically
- Minimal distraction UI (child-friendly)

---

## 4. Future Features (Post-MVP)
- Import from user YouTube playlists via OAuth + `youtube.readonly` scope
- AI-powered playlist generation from prompts
- Pre-built templates ("Warmup Routine", "Color Game", etc.)
- Session analytics dashboard (time spent, most used videos)
- Admin panel to manage curated content
- Community/shared playlists among workers
- Mobile/PWA support

---

## 5. Accessibility (WCAG 2.1 AA Compliance)
- High-contrast, large-font interface
- Keyboard navigable UI
- ARIA labels and semantic HTML
- Responsive design for tablets and laptops
- Option for low-sensory mode (minimal motion/colors)

---

## 6. Technology Stack
### Frontend
- **Framework:** Next.js (React)
- **Styling:** TailwindCSS with accessibility-first components
- **Player:** `react-youtube` for embedded playback

### Backend & Data
- **Auth:** Firebase Authentication (Google provider)
- **Database:** Firebase Firestore (NoSQL)
- **API:** YouTube Data API v3 (public metadata fetch)
- **Optional:** Firebase Cloud Functions for secure API calls

### Hosting & DevOps
- **Hosting:** Firebase Hosting or Vercel
- **CI/CD:** GitHub Actions
- **AI Development Tools:** Gemini CLI, Claude AI, or similar

### API Key Placeholders (to be added during setup)
- `FIREBASE_API_KEY`: <YOUR_FIREBASE_API_KEY>
- `YOUTUBE_API_KEY`: <YOUR_YOUTUBE_DATA_API_KEY>
- `GOOGLE_CLIENT_ID`: <YOUR_OAUTH_CLIENT_ID>
- `GOOGLE_CLIENT_SECRET`: <YOUR_OAUTH_CLIENT_SECRET>

> These keys must be stored securely in `.env` files or CI/CD secrets.

---

## 7. Firestore Data Schema (Revised)
### `users`
```json
{
  uid: "string",
  name: "string",
  email: "string",
  createdAt: "timestamp"
}
```

### `videos`
```json
{
  videoId: "abc123",
  title: "Boomwhacker Fun in C",
  duration: "2:34",
  thumbnail: "https://...",
  tags: ["C major", "fast", "warmup"],
  channelName: "Music Kids Channel",
  createdBy: "userId"
}
```

### `playlists`
```json
{
  id: "string",
  userId: "string",
  title: "Warmup Playlist",
  createdAt: "timestamp",
  videoRefs: ["abc123", "def456"],
  notes: "Kids enjoyed last session"
}
```
> Playlists reference video documents to avoid duplication and enable metadata reuse and updates across sessions.

---

## 8. User Flows
### New User Onboarding
1. Login with Google
2. Create or reuse a playlist
3. Paste YouTube links (adds to `videos` if not already present)
4. Add videos to playlist by reference
5. Start session in fullscreen mode

### Returning User Quick Start
1. Login (auto if session saved)
2. Select last used or pinned playlist
3. Click "Start Session"

---

## 9. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| YouTube API quota limits | Cache video metadata in Firestore after first fetch |
| Network instability | Enable localStorage backup for recent playlists |
| OAuth token expiry | Use Firebase Auth session persistence + refresh |
| Worker forgets to tag videos | Add auto-suggestions from metadata or admin tagging |
| Video duplication across playlists | Reference centralized `videos` collection in `playlists` |

---

## 10. Milestones & Development Protocol
| Milestone | Target Date |
|-----------|-------------|
| PRD Finalized | ✅ Done |
| Firebase Auth + Firestore Setup | Week 1 |
| Video Schema + Video Fetch Parser | Week 2 |
| Playlist CRUD referencing videos | Week 3 |
| Session Launcher View | Week 4 |
| Smart Suggestions + Tagging UI | Week 5 |
| MVP Testing & Feedback | Week 6 |
| Deployment | Week 7 |

### Development Protocol
- Use AI agents (Gemini CLI, Claude, etc.) to assist with generation of boilerplate code, component structure, and integration tasks.
- After completing each feature:
  - ✅ Push the updated code to GitHub with a clear commit message
  - ✅ Tag progress in the `MILESTONES.md` file
  - ✅ Document environment variable changes
  - ✅ Validate UI via accessibility testing checklist
  - ✅ Log schema or logic changes in `CHANGELOG.md`

---

## 11. Success Metrics (KPIs)
- ⏱️ Avg. time to launch a playlist: < 30 seconds
- ✅ % of sessions launched from saved playlists: > 80%
- 🔁 Playlist reuse rate: > 50%
- 🧠 Smart suggestions used in sessions: > 30%
- 🔒 Authentication success rate: > 95%

---

## 12. UX Requirements
- Loading state on all async actions
- Clear confirmation on playlist save/delete
- Ensure all text content has at least 4.5:1 contrast ratio
- Buttons must have hit area of 44px by 44px minimum
- Include fallback if video metadata cannot be fetched

---

## 13. API Management Strategy
- YouTube Data API:
  - Fetch video details only once per unique video ID
  - Store all metadata locally in Firestore
- Firebase Firestore:
  - Use batched writes and indexing where possible
  - Avoid deeply nested document reads

---

## 14. Monitoring and Debugging
- Use Firebase Crashlytics (if PWA)
- Log client-side errors with source and timestamp to Firestore
- Add retry/backoff strategy for YouTube API failures

---

## 15. Testing Strategy
- ✅ Unit testing with Jest (tag parser, playlist filters)
- ✅ UI testing with Playwright or Cypress (playlist CRUD, session start)
- ✅ Manual accessibility testing using Chrome Lighthouse and axe-core
- ✅ Test critical flows with screen readers (NVDA/VoiceOver)

---

## 17. Offline Mode Handling
- Use service workers to cache video metadata, playlists, and thumbnails.
- Playlist viewer should show preloaded session videos if offline.
- Alert users when YouTube video cannot load and allow them to skip manually.

---

## 18. Environment Configuration
Include a `.env.example` file in the repository with the following placeholders:
```env
FIREBASE_API_KEY=your_firebase_api_key
YOUTUBE_API_KEY=your_youtube_data_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```
> Document setup instructions in the `README.md`.

---

## 19. Role Management Matrix
| Role   | Permissions                                                                 |
|--------|-----------------------------------------------------------------------------|
| Admin  | Manage all playlists, approve/reject videos, view usage analytics          |
| Worker | Create and manage own playlists, add videos, launch sessions               |
| Viewer | (Optional) View playlists and sessions in read-only mode (e.g. assistants) |

---

## 20. Dev Onboarding Checklist
- ✅ Clone repo & install dependencies (`pnpm install` or `npm install`)
- ✅ Setup `.env` using `.env.example`
- ✅ Initialize Firebase project & enable Google Auth
- ✅ Run `npx shadcn-ui@latest init` to generate component styles
- ✅ Deploy to Vercel or Firebase Hosting

---