'use client';

import React from 'react';
import Link from 'next/link';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const QuickActions: React.FC = () => {
  const actions: QuickAction[] = [
    {
      title: 'Create New Playlist',
      description: 'Start building a new playlist for your next session',
      href: '/playlists/new',
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: 'Add Videos',
      description: 'Browse and add new videos to your collection',
      href: '/videos/add',
      color: 'bg-green-500 hover:bg-green-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Start Session',
      description: 'Launch a session with your favorite playlist',
      href: '/session',
      color: 'bg-purple-500 hover:bg-purple-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 010 5H9m-4.5-5h.01m4.49 0H15m-6 0a2.5 2.5 0 00-2.5 2.5M15 10h.01M15 10a2.5 2.5 0 012.5 2.5m-7.5 5h.01m7.49 0h.01" />
        </svg>
      ),
    },
    {
      title: 'Browse Templates',
      description: 'Use pre-built playlist templates for common activities',
      href: '/templates',
      color: 'bg-orange-500 hover:bg-orange-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="text-sm text-gray-500">
          Get started with these common tasks
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="p-6">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg text-white ${action.color} mb-4 transition-colors`}>
                {action.icon}
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {action.description}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;