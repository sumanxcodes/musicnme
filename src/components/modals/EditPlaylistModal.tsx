'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { playlistSchema } from '@/lib/validation';
import { updatePlaylist } from '@/lib/firestore';
import { Playlist } from '@/types';

interface EditPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface PlaylistFormData {
  title: string;
  notes?: string;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PlaylistFormData>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      title: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (playlist) {
      setValue('title', playlist.title);
      setValue('notes', playlist.notes || '');
    }
  }, [playlist, setValue]);

  const onSubmit = async (data: PlaylistFormData) => {
    if (!playlist) return;
    
    setIsSubmitting(true);
    try {
      await updatePlaylist(playlist.id, {
        title: data.title,
        notes: data.notes,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating playlist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Edit Playlist
                  </h3>
                  <div className="mt-4 space-y-4">
                    {/* Title field */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Playlist Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        {...register('title')}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 ${
                          errors.title ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                        placeholder="Enter playlist title"
                        aria-describedby={errors.title ? 'title-error' : undefined}
                      />
                      {errors.title && (
                        <p className="mt-2 text-sm text-red-600" id="title-error">
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    {/* Notes field */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        {...register('notes')}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 ${
                          errors.notes ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                        placeholder="Add any notes or description for this playlist"
                        aria-describedby={errors.notes ? 'notes-error' : undefined}
                      />
                      {errors.notes && (
                        <p className="mt-2 text-sm text-red-600" id="notes-error">
                          {errors.notes.message}
                        </p>
                      )}
                    </div>

                    {/* Playlist info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {playlist.videoRefs.length} videos • Created {new Date(playlist.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Playlist'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPlaylistModal;