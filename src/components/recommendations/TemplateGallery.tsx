'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getTemplates, 
  getFeaturedTemplates, 
  getRecommendedTemplates,
  createPlaylistFromTemplate,
  rateTemplate,
  TEMPLATE_CATEGORIES,
  DIFFICULTY_LEVELS
} from '@/lib/templates';
import { TemplatePlaylist } from '@/types';

interface TemplateGalleryProps {
  onTemplateSelect?: (templateId: string, playlistId: string) => void;
  showFeaturedOnly?: boolean;
  category?: keyof typeof TEMPLATE_CATEGORIES;
  maxTemplates?: number;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onTemplateSelect,
  showFeaturedOnly = false,
  category,
  maxTemplates = 12
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplatePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof TEMPLATE_CATEGORIES | 'all'>(category || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS | 'all'>('all');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, selectedDifficulty, showFeaturedOnly]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      let fetchedTemplates: TemplatePlaylist[] = [];

      if (showFeaturedOnly) {
        fetchedTemplates = await getFeaturedTemplates(maxTemplates);
      } else if (user) {
        // Get recommended templates for the user
        const recommended = await getRecommendedTemplates(user.uid, [], 
          selectedDifficulty === 'all' ? undefined : selectedDifficulty, 
          maxTemplates
        );
        
        // If not enough recommended, fill with general templates
        if (recommended.length < maxTemplates) {
          const general = await getTemplates({
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
            limit: maxTemplates - recommended.length,
            orderBy: 'rating'
          });
          
          fetchedTemplates = [...recommended, ...general];
        } else {
          fetchedTemplates = recommended;
        }
      } else {
        fetchedTemplates = await getTemplates({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
          limit: maxTemplates,
          orderBy: 'rating'
        });
      }

      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async (template: TemplatePlaylist) => {
    if (!user) return;

    setIsCreatingPlaylist(template.id);
    try {
      const playlistId = await createPlaylistFromTemplate(template.id, user.uid);
      
      if (onTemplateSelect) {
        onTemplateSelect(template.id, playlistId);
      }
    } catch (error) {
      console.error('Error creating playlist from template:', error);
    } finally {
      setIsCreatingPlaylist(null);
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    if (!user) return;

    try {
      await rateTemplate(templateId, rating, user.uid);
      // Refresh templates to show updated rating
      loadTemplates();
    } catch (error) {
      console.error('Error rating template:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {showFeaturedOnly ? 'Featured Templates' : 'Template Gallery'}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {showFeaturedOnly ? 'Featured Templates' : 'Template Gallery'}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({templates.length} templates)
          </span>
        </h2>
      </div>

      {/* Filters */}
      {!showFeaturedOnly && (
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Levels</option>
              {Object.entries(DIFFICULTY_LEVELS).map(([key, level]) => (
                <option key={key} value={key}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">Try adjusting your filters or check back later for new templates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-4 pb-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TEMPLATE_CATEGORIES[template.category].icon}</span>
                    <div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${TEMPLATE_CATEGORIES[template.category].color}`}>
                        {TEMPLATE_CATEGORIES[template.category].name}
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-1 ${DIFFICULTY_LEVELS[template.difficulty].color}`}>
                        {DIFFICULTY_LEVELS[template.difficulty].name}
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {template.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
              </div>

              {/* Stats */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">{template.videoRefs.length}</span> videos
                  </div>
                  <div>
                    <span className="font-medium">{formatDuration(template.duration)}</span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleRateTemplate(template.id, i + 1)}
                        className={`w-4 h-4 ${
                          i < Math.floor(template.rating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300 hover:text-yellow-400'
                        } transition-colors`}
                        disabled={!user}
                      >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    {template.rating.toFixed(1)} ({template.usageCount} uses)
                  </span>
                </div>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{template.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => handleCreatePlaylist(template)}
                  disabled={!user || isCreatingPlaylist === template.id}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isCreatingPlaylist === template.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </div>
                  ) : (
                    'Use This Template'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;