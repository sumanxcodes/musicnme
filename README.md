# Music and Me - Boomwhacker Playlist Tool

A web-based tool for NDIS workers to easily create, manage, and play curated Boomwhacker video playlists for use during physical music sessions with children.

## Features

- **Google Authentication**: One-click login via Google OAuth 2.0
- **Playlist Management**: Create, edit, and organize video playlists
- **Smart Suggestions**: AI-powered recommendations based on tags and session history
- **Session Mode**: Distraction-free fullscreen player for children's sessions
- **Accessibility**: WCAG 2.1 AA compliant interface
- **YouTube Integration**: Automatic video metadata fetching

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: TailwindCSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Video Player**: react-youtube
- **External API**: YouTube Data API v3

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sumanxcodes/musicnme.git
   cd musicnme
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment setup**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase and YouTube API credentials

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# YouTube Data API
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_data_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility libraries (Firebase, etc.)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.