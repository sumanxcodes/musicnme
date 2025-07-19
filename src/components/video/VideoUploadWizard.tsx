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
import TagSelector from '@/components/tags/TagSelector';

interface VideoUploadWizardProps {
  onVideoAdded: (video: Video) => void;
  onClose?: () => void;
}

interface UrlFormData {
  url: string;
}

type WizardStep = 'url' | 'preview' | 'tags' | 'confirm';

const VideoUploadWizard: React.FC<VideoUploadWizardProps> = ({ onVideoAdded, onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('url');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const [processingStep, setProcessingStep] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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

  const onSubmitUrl = async (data: UrlFormData) => {
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

      // Set preview data and move to next step
      setPreviewVideo(videoData);
      setProcessingStep('');
      setIsProcessing(false);
      setCurrentStep('preview');
      
    } catch (error) {
      console.error('Error processing video:', error);
      setError('url', { message: 'Error processing video. Please try again.' });
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleNext = () => {
    if (currentStep === 'preview') {
      setCurrentStep('tags');
    } else if (currentStep === 'tags') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('tags');
    } else if (currentStep === 'tags') {
      setCurrentStep('preview');
    } else if (currentStep === 'preview') {
      setCurrentStep('url');
      setPreviewVideo(null);
    }
  };

  const handleSkipTags = () => {
    setSelectedTags([]);
    setCurrentStep('confirm');
  };

  const handleFinalSubmit = async () => {
    if (!user || !previewVideo) return;
    
    setIsProcessing(true);
    setProcessingStep('Adding video to library...');
    
    try {
      const videoData: Omit<Video, 'createdAt'> = {
        videoId: previewVideo.id,
        title: previewVideo.title,
        duration: previewVideo.duration,
        thumbnail: previewVideo.thumbnails?.high?.url || previewVideo.thumbnails?.medium?.url || previewVideo.thumbnails?.default?.url || '',
        tags: selectedTags,
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
      setSelectedTags([]);
      setCurrentStep('url');
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
    setSelectedTags([]);
    setCurrentStep('url');
    reset();
    if (onClose) onClose();
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'url': return 1;
      case 'preview': return 2;
      case 'tags': return 3;
      case 'confirm': return 4;
      default: return 1;
    }
  };

  const getSuggestedTags = () => {
    if (!previewVideo) return [];
    
    const suggestions: string[] = [];
    const title = previewVideo.title.toLowerCase();
    
    // Musical key detection
    const keys = ['c major', 'c minor', 'd major', 'd minor', 'e major', 'e minor', 'f major', 'f minor', 'g major', 'g minor', 'a major', 'a minor', 'b major', 'b minor'];
    keys.forEach(key => {
      if (title.includes(key.replace(' ', ' ')) || title.includes(key.replace(' ', ''))) {
        suggestions.push(key);
      }
    });
    
    // Tempo detection
    if (title.includes('fast') || title.includes('quick') || title.includes('upbeat')) {
      suggestions.push('fast');
    }
    if (title.includes('slow') || title.includes('calm') || title.includes('gentle')) {
      suggestions.push('slow');
    }
    
    // Activity detection
    if (title.includes('warmup') || title.includes('warm up')) {
      suggestions.push('warmup');
    }
    if (title.includes('cool') && title.includes('down')) {
      suggestions.push('cooldown');
    }
    if (title.includes('rhythm') || title.includes('beat')) {
      suggestions.push('rhythm');
    }
    if (title.includes('melody') || title.includes('tune')) {
      suggestions.push('melody');
    }
    if (title.includes('boomwhacker') || title.includes('boom whacker')) {
      suggestions.push('boomwhacker');
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-h-[85vh] overflow-y-auto">
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add YouTube Video</h3>
          <p className="text-sm text-gray-500 mt-1">Step {getStepNumber()} of 4</p>
        </div>
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

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center">
          {['URL', 'Preview', 'Tags', 'Confirm'].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index + 1 <= getStepNumber() 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                index + 1 <= getStepNumber() ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step}
              </span>
              {index < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  index + 1 < getStepNumber() ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: URL Input */}
        {currentStep === 'url' && (
          <form onSubmit={handleSubmit(onSubmitUrl)} className="space-y-4">
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
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Cancel
              </button>
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
                  'Next'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Video Preview */}
        {currentStep === 'preview' && previewVideo && (
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
                  <h5 className="text-sm font-medium text-gray-900 mb-1">
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

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tag Assignment */}
        {currentStep === 'tags' && (
          <div className="space-y-4 min-h-[400px]">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Add Tags (Optional)</h4>
              <p className="text-sm text-gray-500 mb-4">
                Tags help organize your videos and make them easier to find. You can add them now or later.
              </p>
              
              <div className="relative z-10">
                <TagSelector
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  maxTags={8}
                  allowCreate={true}
                  placeholder="Search or create tags for this video..."
                />
              </div>
            </div>

            {/* Smart Suggestions */}
            {getSuggestedTags().length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Smart Suggestions</h5>
                <p className="text-xs text-blue-700 mb-3">
                  Based on the video title, we suggest these tags:
                </p>
                <div className="flex flex-wrap gap-2">
                  {getSuggestedTags().map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        if (!selectedTags.includes(suggestion) && selectedTags.length < 8) {
                          setSelectedTags([...selectedTags, suggestion]);
                        }
                      }}
                      disabled={selectedTags.includes(suggestion) || selectedTags.length >= 8}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <div className="space-x-3">
                <button
                  type="button"
                  onClick={handleSkipTags}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Skip Tags
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 'confirm' && previewVideo && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">Ready to Add Video</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Review the details below and click &quot;Add to Library&quot; to complete the process.
                  </p>
                </div>
              </div>
            </div>

            {/* Final Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex space-x-4">
                <img
                  src={previewVideo.thumbnails?.medium?.url || previewVideo.thumbnails?.high?.url || previewVideo.thumbnails?.default?.url}
                  alt={previewVideo.title}
                  className="w-20 h-15 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 mb-1">
                    {previewVideo.title}
                  </h5>
                  <p className="text-sm text-gray-500 mb-2">{previewVideo.channelTitle}</p>
                  <div className="text-xs text-gray-400">Duration: {previewVideo.duration}</div>
                </div>
              </div>
              
              {selectedTags.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Tags ({selectedTags.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isProcessing}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default VideoUploadWizard;