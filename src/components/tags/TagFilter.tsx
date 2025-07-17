'use client';

import React, { useState, useEffect } from 'react';
import { getAllTags, getTagsByCategory } from '@/lib/tags';
import { Tag } from '@/types';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  showCategoryFilter?: boolean;
  compact?: boolean;
}

const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagsChange,
  showCategoryFilter = true,
  compact = false,
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Tag['category'] | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    loadTags();
  }, [selectedCategory]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const tags = selectedCategory === 'all' 
        ? await getAllTags()
        : await getTagsByCategory(selectedCategory);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const groupedTags = availableTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<Tag['category'], Tag[]>);

  const categoryOrder: Tag['category'][] = ['key', 'tempo', 'activity', 'difficulty', 'custom'];

  if (compact && !isExpanded) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(true)}
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
            selectedTags.length > 0
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-gray-100 text-gray-700 border-gray-300'
          } hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Tags
          {selectedTags.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
              {selectedTags.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filter by Tags</h3>
        <div className="flex items-center space-x-2">
          {selectedTags.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Clear all
            </button>
          )}
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      {showCategoryFilter && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categoryOrder.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Tags */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-8 rounded-full"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedCategory === 'all' ? (
            // Show grouped by category
            categoryOrder.map((category) => {
              const categoryTags = groupedTags[category] || [];
              if (categoryTags.length === 0) return null;
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.name)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(tag.name)
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        } border`}
                      >
                        {tag.name}
                        {selectedTags.includes(tag.name) && (
                          <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Show single category
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  } border`}
                >
                  {tag.name}
                  {selectedTags.includes(tag.name) && (
                    <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {availableTags.length === 0 && (
            <div className="text-center py-4">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                No tags found in this category
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap gap-1">
              {selectedTags.slice(0, 3).map((tagName) => (
                <span
                  key={tagName}
                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {tagName}
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  +{selectedTags.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagFilter;