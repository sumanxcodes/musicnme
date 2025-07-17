'use client';

import React from 'react';

const SessionPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Session Mode</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
          Start Session
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 010 5H9m-4.5-5h.01m4.49 0H15m-6 0a2.5 2.5 0 00-2.5 2.5M15 10h.01M15 10a2.5 2.5 0 012.5 2.5m-7.5 5h.01m7.49 0h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Session Mode</h3>
          <p className="text-gray-600">This page will provide a fullscreen, child-friendly video player interface.</p>
        </div>
      </div>
    </div>
  );
};

export default SessionPage;