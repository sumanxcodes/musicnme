'use client';

import React, { useState, useEffect } from 'react';
import { getAllTags, createTag } from '@/lib/tags';
import { useAuth } from '@/contexts/AuthContext';
import { Tag } from '@/types';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  allowCreate?: boolean;
  placeholder?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 10,
  allowCreate = true,
  placeholder = "Search or add tags...",
}) => {
  const { user } = useAuth();
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTags.includes(tag.name)
  );

  const handleTagSelect = (tagName: string) => {
    if (selectedTags.length < maxTags && !selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleTagRemove = (tagName: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagName));
  };

  const handleCreateTag = async () => {
    if (!user || !searchTerm.trim() || !allowCreate) return;

    setIsCreating(true);
    try {
      await createTag({
        name: searchTerm.trim(),
        category: 'custom',
        createdBy: user.uid,
      });
      
      await loadTags();
      handleTagSelect(searchTerm.trim());
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const shouldShowCreateOption = allowCreate && 
    searchTerm.trim() && 
    !availableTags.some(tag => tag.name.toLowerCase() === searchTerm.toLowerCase()) &&
    !selectedTags.includes(searchTerm.trim());

  return (
    <div className="relative">
      <div className="border border-gray-300 rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {/* Selected Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tagName) => (
            <span
              key={tagName}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tagName}
              <button
                type="button"
                onClick={() => handleTagRemove(tagName)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedTags.length >= maxTags ? `Maximum ${maxTags} tags` : placeholder}
          disabled={selectedTags.length >= maxTags}
          className="w-full border-none outline-none bg-transparent placeholder-gray-400 text-gray-900 text-sm disabled:cursor-not-allowed"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-sm text-gray-500">Loading tags...</div>
          ) : (
            <>
              {/* Existing Tags */}
              {filteredTags.length > 0 && (
                <div className="py-1">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagSelect(tag.name)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <span>{tag.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{tag.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Create New Tag Option */}
              {shouldShowCreateOption && (
                <div className="border-t border-gray-200 py-1">
                  <button
                    onClick={handleCreateTag}
                    disabled={isCreating}
                    className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create &ldquo;{searchTerm}&rdquo;
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* No Results */}
              {filteredTags.length === 0 && !shouldShowCreateOption && (
                <div className="p-2 text-sm text-gray-500">
                  {searchTerm ? 'No tags found' : 'No tags available'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Tag Count Info */}
      <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
        <span>{selectedTags.length} of {maxTags} tags selected</span>
        {selectedTags.length >= maxTags && (
          <span className="text-amber-600">Maximum tags reached</span>
        )}
      </div>
    </div>
  );
};

export default TagSelector;