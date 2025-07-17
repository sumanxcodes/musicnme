'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import PlaylistEditor from '@/components/playlist/PlaylistEditor';

const PlaylistDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const playlistId = params?.id as string;

  const handleClose = () => {
    router.push('/playlists');
  };

  if (!playlistId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Invalid playlist ID</h3>
          <p className="mt-1 text-sm text-gray-500">The playlist ID provided is not valid.</p>
          <button
            onClick={handleClose}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Playlists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={handleClose}
              className="hover:text-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Playlists
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900">Edit Playlist</span>
          </nav>
        </div>
      </div>
      
      <PlaylistEditor 
        playlistId={playlistId}
        onClose={handleClose}
      />
    </div>
  );
};

export default PlaylistDetailPage;