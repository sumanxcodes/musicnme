'use client';

import React, { useState } from 'react';
import { Playlist } from '@/types';
import { sharePlaylist, getSharedPlaylistUrl } from '@/lib/sharing';
import { useAuth } from '@/contexts/AuthContext';

interface SharePlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
}

const SharePlaylistModal: React.FC<SharePlaylistModalProps> = ({ playlist, onClose }) => {
  const { user } = useAuth();
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'copy'>('link');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (!user) return;
    
    setIsSharing(true);
    try {
      const shareId = await sharePlaylist(playlist.id, user.uid);
      const url = getSharedPlaylistUrl(shareId);
      setShareUrl(url);
    } catch (error) {
      console.error('Error generating share link:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      await handleGenerateLink();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleEmailShare = async () => {
    if (!email || !user) return;
    
    setIsSharing(true);
    try {
      if (!shareUrl) {
        const shareId = await sharePlaylist(playlist.id, user.uid);
        const url = getSharedPlaylistUrl(shareId);
        setShareUrl(url);
      }
      
      // Create mailto link
      const subject = encodeURIComponent(`Music Therapy Playlist: ${playlist.title}`);
      const body = encodeURIComponent(`
Hi,

${user.displayName || 'A colleague'} has shared a music therapy playlist with you:

Playlist: ${playlist.title}
${playlist.notes ? `Description: ${playlist.notes}` : ''}
Videos: ${playlist.videoRefs.length} videos

${message ? `Message: ${message}` : ''}

Access the playlist here: ${shareUrl}

Best regards,
Music and Me Team
      `);
      
      const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');
      
    } catch (error) {
      console.error('Error sharing via email:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Playlist Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">{playlist.title}</h3>
            {playlist.notes && (
              <p className="text-sm text-gray-600 mb-2">{playlist.notes}</p>
            )}
            <p className="text-sm text-gray-500">
              {playlist.videoRefs.length} videos • Last updated {new Date(playlist.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Share Method Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Choose sharing method:</label>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setShareMethod('copy')}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  shareMethod === 'copy' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Copy Link</div>
                    <div className="text-sm text-gray-500">Generate a shareable link</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShareMethod('email')}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  shareMethod === 'email' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900">Email</div>
                    <div className="text-sm text-gray-500">Send directly to colleague</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Copy Link Method */}
          {shareMethod === 'copy' && (
            <div className="space-y-4">
              {shareUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-900"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Anyone with this link can view the playlist. Link expires in 30 days.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateLink}
                  disabled={isSharing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? 'Generating Link...' : 'Generate Share Link'}
                </button>
              )}
            </div>
          )}

          {/* Email Method */}
          {shareMethod === 'email' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Add a personal message..."
                />
              </div>
              
              <button
                onClick={handleEmailShare}
                disabled={!email || isSharing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? 'Preparing Email...' : 'Send Email'}
              </button>
            </div>
          )}

          {/* Security Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Privacy Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Shared playlists are read-only for recipients. They cannot edit or delete your playlists.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePlaylistModal;