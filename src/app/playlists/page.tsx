'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, createPlaylist } from '@/lib/firestore';
import { Playlist } from '@/types';
import PlaylistGrid from '@/components/playlist/PlaylistGrid';
import CreatePlaylistModal from '@/components/modals/CreatePlaylistModal';
import EditPlaylistModal from '@/components/modals/EditPlaylistModal';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import SharePlaylistModal from '@/components/modals/SharePlaylistModal';

const PlaylistsPage: React.FC = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const loadPlaylists = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userPlaylists = await getUserPlaylists(user.uid);
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadPlaylists();
  };

  const handleEditSuccess = () => {
    loadPlaylists();
  };

  const handleDeleteSuccess = () => {
    loadPlaylists();
  };

  const handlePlaylistEdit = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsEditModalOpen(true);
  };

  const handlePlaylistDelete = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsDeleteModalOpen(true);
  };

  const handlePlaylistDuplicate = async (playlist: Playlist) => {
    if (!user) return;
    
    try {
      await createPlaylist({
        userId: user.uid,
        title: `${playlist.title} (Copy)`,
        notes: playlist.notes,
        videoRefs: [...playlist.videoRefs],
      });
      loadPlaylists();
    } catch (error) {
      console.error('Error duplicating playlist:', error);
    }
  };

  const handlePlaylistPlay = (playlist: Playlist) => {
    // Navigate directly to playlist player
    window.location.href = `/playlists/${playlist.id}/play`;
  };

  const handlePlaylistView = (playlist: Playlist) => {
    // Navigate to playlist detail view
    window.location.href = `/playlists/${playlist.id}`;
  };

  const handlePlaylistShare = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsShareModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsShareModalOpen(false);
    setSelectedPlaylist(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
          <p className="text-sm text-gray-600 mt-1">
            Organize your Boomwhacker videos into playlists for easy session management
          </p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Playlist
        </button>
      </div>

      {/* Quick Stats */}
      {!isLoading && playlists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Total Playlists</div>
                <div className="text-2xl font-bold text-gray-900">{playlists.length}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Total Videos</div>
                <div className="text-2xl font-bold text-gray-900">
                  {playlists.reduce((total, playlist) => total + playlist.videoRefs.length, 0)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Ready to Play</div>
                <div className="text-2xl font-bold text-gray-900">
                  {playlists.filter(p => p.videoRefs.length > 0).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playlists Grid */}
      <PlaylistGrid
        playlists={playlists}
        isLoading={isLoading}
        onPlaylistEdit={handlePlaylistEdit}
        onPlaylistDelete={handlePlaylistDelete}
        onPlaylistDuplicate={handlePlaylistDuplicate}
        onPlaylistPlay={handlePlaylistPlay}
        onPlaylistView={handlePlaylistView}
        onPlaylistShare={handlePlaylistShare}
        showActions={true}
        emptyMessage="No playlists created yet"
        emptyIcon={
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        }
      />

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        onSuccess={handleCreateSuccess}
      />
      
      <EditPlaylistModal
        isOpen={isEditModalOpen}
        playlist={selectedPlaylist}
        onClose={handleCloseModals}
        onSuccess={handleEditSuccess}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        playlist={selectedPlaylist}
        onClose={handleCloseModals}
        onSuccess={handleDeleteSuccess}
      />
      
      {selectedPlaylist && isShareModalOpen && (
        <SharePlaylistModal
          playlist={selectedPlaylist}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
};

export default PlaylistsPage;