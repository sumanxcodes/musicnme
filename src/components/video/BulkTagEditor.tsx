'use client';

import React, { useState, useEffect } from 'react';
import { Video } from '@/types';

interface BulkTagEditorProps {
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (videos: Video[], operation: TagOperation) => Promise<void>;
}

interface TagOperation {
  type: 'add' | 'remove' | 'replace';
  tags: string[];
}

const BulkTagEditor: React.FC<BulkTagEditorProps> = ({
  videos,
  isOpen,
  onClose,
  onApply,
}) => {
  const [operationType, setOperationType] = useState<'add' | 'remove' | 'replace'>('add');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Get all existing tags from selected videos
  const existingTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(video => {
      video.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [videos]);

  // Get common tags (tags that appear in ALL selected videos)
  const commonTags = React.useMemo(() => {
    if (videos.length === 0) return [];
    
    const firstVideoTags = new Set(videos[0].tags);
    return videos.slice(1).reduce((common, video) => {
      return common.filter(tag => video.tags.includes(tag));
    }, Array.from(firstVideoTags));
  }, [videos]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setNewTags([]);
      setTagInput('');
      setOperationType('add');
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !newTags.includes(trimmedTag)) {
      setNewTags(prev => [...prev, trimmedTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const getPreviewResults = () => {
    return videos.map(video => {
      let resultTags: string[] = [];
      
      switch (operationType) {
        case 'add':
          resultTags = [...new Set([...video.tags, ...newTags])];
          break;
        case 'remove':
          resultTags = video.tags.filter(tag => !newTags.includes(tag));
          break;
        case 'replace':
          resultTags = [...newTags];
          break;
      }
      
      return {
        video,
        currentTags: video.tags,
        newTags: resultTags,
        changed: JSON.stringify(video.tags.sort()) !== JSON.stringify(resultTags.sort())
      };
    });
  };

  const handleApply = async () => {
    if (newTags.length === 0 && operationType !== 'replace') return;
    
    setIsApplying(true);
    try {
      await onApply(videos, {
        type: operationType,
        tags: newTags
      });
      onClose();
    } catch (error) {
      console.error('Error applying bulk tag operation:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const previewResults = showPreview ? getPreviewResults() : [];
  const changedVideos = previewResults.filter(result => result.changed);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bulk Tag Editor</h3>
              <p className="text-sm text-gray-500">
                Edit tags for {videos.length} selected video{videos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Operation Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">Operation Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setOperationType('add')}
                className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                  operationType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                Add Tags
                <p className="text-xs mt-1 opacity-75">Add new tags to existing ones</p>
              </button>
              
              <button
                onClick={() => setOperationType('remove')}
                className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                  operationType === 'remove'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                Remove Tags
                <p className="text-xs mt-1 opacity-75">Remove specified tags</p>
              </button>
              
              <button
                onClick={() => setOperationType('replace')}
                className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                  operationType === 'replace'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                Replace All
                <p className="text-xs mt-1 opacity-75">Replace all existing tags</p>
              </button>
            </div>
          </div>

          {/* Current Tags Overview */}
          {operationType === 'remove' && existingTags.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Existing Tags in Selected Videos
              </h4>
              <div className="flex flex-wrap gap-2">
                {existingTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (newTags.includes(tag)) {
                        handleRemoveTag(tag);
                      } else {
                        setNewTags(prev => [...prev, tag]);
                      }
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                      newTags.includes(tag)
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                    {newTags.includes(tag) && (
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              {commonTags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Common tags</strong> (appear in all selected videos):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {commonTags.map(tag => (
                      <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tag Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">
              {operationType === 'add' ? 'Tags to Add' : 
               operationType === 'remove' ? 'Tags to Remove' : 
               'New Tags (will replace all existing tags)'}
            </label>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a tag and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Selected Tags */}
            {newTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {newTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Toggle */}
          {newTags.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show-preview"
                  checked={showPreview}
                  onChange={(e) => setShowPreview(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="show-preview" className="ml-2 text-sm font-medium text-gray-700">
                  Show preview of changes
                </label>
              </div>
              {showPreview && (
                <span className="text-sm text-gray-600">
                  {changedVideos.length} of {videos.length} videos will be modified
                </span>
              )}
            </div>
          )}

          {/* Preview Results */}
          {showPreview && previewResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Preview Changes</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {previewResults.map((result, index) => (
                  <div key={result.video.videoId} className={`p-4 ${index !== previewResults.length - 1 ? 'border-b border-gray-200' : ''} ${result.changed ? 'bg-yellow-50' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <img
                        src={result.video.thumbnail}
                        alt={result.video.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                          {result.video.title}
                        </h5>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-xs">
                            <span className="text-gray-500 w-16">Before:</span>
                            <div className="flex flex-wrap gap-1">
                              {result.currentTags.length > 0 ? (
                                result.currentTags.map(tag => (
                                  <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">No tags</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-xs">
                            <span className="text-gray-500 w-16">After:</span>
                            <div className="flex flex-wrap gap-1">
                              {result.newTags.length > 0 ? (
                                result.newTags.map(tag => (
                                  <span key={tag} className={`px-2 py-0.5 rounded ${
                                    result.changed && !result.currentTags.includes(tag)
                                      ? 'bg-green-100 text-green-700'
                                      : result.changed && !result.newTags.includes(tag)
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">No tags</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {result.changed && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Modified
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || (newTags.length === 0 && operationType !== 'replace')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Applying...
              </>
            ) : (
              `Apply to ${videos.length} Video${videos.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTagEditor;