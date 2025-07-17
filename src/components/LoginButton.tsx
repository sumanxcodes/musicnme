'use client';

import React, { useState } from 'react';
import { signInWithGoogle, signOut } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Failed to sign in:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        setError('Google authentication is not enabled. Please enable it in Firebase Console.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  if (loading) {
    return (
      <button 
        disabled 
        className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <p className="font-medium">Welcome, {user.displayName}</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleSignIn}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200 max-w-md text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default LoginButton;