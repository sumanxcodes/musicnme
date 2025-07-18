'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tagSchema } from '@/lib/validation';
import { createTag, getAllTags, updateTag, deleteTag, getTagSuggestions } from '@/lib/tags';
import { useAuth } from '@/contexts/AuthContext';
import { Tag } from '@/types';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdated: () => void;
}

interface TagFormData {
  name: string;
  category: Tag['category'];
}

const TagManager: React.FC<TagManagerProps> = ({ isOpen, onClose, onTagsUpdated }) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Tag['category']>('custom');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema.omit({ createdBy: true })),
    defaultValues: {
      name: '',
      category: 'custom',
    },
  });

  const watchedCategory = watch('category');

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedCategory(watchedCategory);
  }, [watchedCategory]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const allTags = await getAllTags();
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TagFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: data.name,
          category: data.category,
        });
      } else {
        await createTag({
          name: data.name,
          category: data.category,
          createdBy: user.uid,
        });
      }
      
      reset();
      setEditingTag(null);
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('Error saving tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setValue('name', tag.name);
    setValue('category', tag.category);
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await deleteTag(tagId);
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const handleCancel = () => {
    reset();
    setEditingTag(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue('name', suggestion);
  };

  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<Tag['category'], Tag[]>);

  const suggestions = getTagSuggestions(selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Tag Manager
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create/Edit Tag Form */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">
                  {editingTag ? 'Edit Tag' : 'Create New Tag'}
                </h4>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tag Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register('name')}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter tag name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      {...register('category')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="key">Key</option>
                      <option value="tempo">Tempo</option>
                      <option value="activity">Activity</option>
                      <option value="difficulty">Difficulty</option>
                      <option value="custom">Custom</option>
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suggestions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : (editingTag ? 'Update' : 'Create')}
                    </button>
                    
                    {editingTag && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Existing Tags */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Existing Tags</h4>
                
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-8 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {Object.entries(groupedTags).map(([category, categoryTags]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700 capitalize border-b border-gray-200 pb-1">
                          {category} ({categoryTags.length})
                        </h5>
                        <div className="space-y-1">
                          {categoryTags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-900">{tag.name}</span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(tag)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(tag.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {tags.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <p className="mt-2 text-sm">No tags created yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagManager;