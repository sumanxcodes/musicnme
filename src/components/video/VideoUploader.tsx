'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { youtubeUrlSchema } from '@/lib/validation';
import { z } from 'zod';
import { fetchVideoMetadataByUrl, extractVideoId } from '@/lib/youtube';
import { addVideo, getVideo } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from '@/types';

interface VideoUploaderProps {
  onVideoAdded: (video: Video) => void;
  onClose?: () => void;
}

interface UrlFormData {
  url: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoAdded, onClose }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const [processingStep, setProcessingStep] = useState('');
  
  const urlFormSchema = z.object({
    url: youtubeUrlSchema,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlFormSchema),
  });

  const onSubmit = async (data: UrlFormData) => {
    if (!user) return;
    
    setIsProcessing(true);
    setProcessingStep('Validating URL...');
    
    try {
      // Extract video ID
      const videoId = extractVideoId(data.url);
      if (!videoId) {
        setError('url', { message: 'Invalid YouTube URL' });
        setIsProcessing(false);
        return;
      }

      // Check if video already exists
      setProcessingStep('Checking if video exists...');
      const existingVideo = await getVideo(videoId);
      if (existingVideo) {
        onVideoAdded(existingVideo);
        reset();
        setIsProcessing(false);
        setProcessingStep('');
        if (onClose) onClose();
        return;
      }

      // Fetch video metadata
      setProcessingStep('Fetching video information...');
      const videoData = await fetchVideoMetadataByUrl(data.url);
      if (!videoData) {
        setError('url', { message: 'Video not found, is private, or API error. Please check the URL and try again.' });
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      // Show preview
      setPreviewVideo(videoData);
      setProcessingStep('');
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Error processing video:', error);
      setError('url', { message: 'Error processing video. Please try again.' });
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleAddVideo = async () => {
    if (!user || !previewVideo) return;
    
    setIsProcessing(true);
    setProcessingStep('Adding video to library...');
    
    try {
      const videoData: Omit<Video, 'createdAt'> = {
        videoId: previewVideo.id,
        title: previewVideo.title,
        duration: previewVideo.duration,
        thumbnail: previewVideo.thumbnails?.high?.url || previewVideo.thumbnails?.medium?.url || previewVideo.thumbnails?.default?.url || '',
        tags: [], // Will be added later through tag management
        channelName: previewVideo.channelTitle,
        createdBy: user.uid,
      };

      await addVideo(videoData);
      
      const addedVideo: Video = {
        ...videoData,
        createdAt: new Date().toISOString(),
      };

      onVideoAdded(addedVideo);
      reset();
      setPreviewVideo(null);
      setIsProcessing(false);
      setProcessingStep('');
      if (onClose) onClose();
      
    } catch (error) {
      console.error('Error adding video:', error);
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleCancel = () => {
    setPreviewVideo(null);
    reset();
    if (onClose) onClose();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Add YouTube Video</h3>
        {onClose && (
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!previewVideo ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              id="url"
              {...register('url')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 ${
                errors.url ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isProcessing}
            />
            {errors.url && (
              <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {processingStep || 'Processing...'}
                </div>
              ) : (
                'Add Video'
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Video Preview</h4>
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={previewVideo.thumbnails?.medium?.url || previewVideo.thumbnails?.high?.url || previewVideo.thumbnails?.default?.url}
                  alt={previewVideo.title}
                  className="w-32 h-24 object-cover rounded"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-900 truncate mb-1">
                  {previewVideo.title}
                </h5>
                <p className="text-sm text-gray-500 mb-2">
                  {previewVideo.channelTitle}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Duration: {previewVideo.duration}</span>
                  <span>Video ID: {previewVideo.id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  This video will be added to your library. You can add tags and organize it later.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setPreviewVideo(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isProcessing}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {processingStep || 'Adding...'}
                </div>
              ) : (
                'Add to Library'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;