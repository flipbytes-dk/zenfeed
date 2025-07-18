'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { checkOnboardingStatus } from '@/lib/auth/utils';

interface UserSession {
  email: string;
  verified: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated using secure server-side validation
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          router.push('/auth/login');
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
        
        // Check if user needs to complete onboarding
        const { needsOnboarding, error } = await checkOnboardingStatus();
        if (needsOnboarding && !error) {
          router.push('/auth/onboarding');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/auth/login');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Logout failed:', errorData);
        // TODO: Show toast notification for logout failure
        // For now, redirect anyway as fallback
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // TODO: Show toast notification for network errors
      // For now, redirect anyway as fallback
      router.push('/auth/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ZenFeed Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Welcome to ZenFeed!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                You have successfully logged in to your ZenFeed account. This is a basic dashboard - 
                more features will be added as we continue building the application.
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Link href="/dashboard/content-sources">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl">📚</div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Content Sources</h3>
                        <p className="text-sm text-gray-600">Manage your feeds and interests</p>
                      </div>
                    </div>
                  </div>
                </Link>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 opacity-75">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-2xl">⏰</div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-600">Time Management</h3>
                      <p className="text-sm text-gray-500">Coming soon</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 opacity-75">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-2xl">📊</div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-600">Analytics</h3>
                      <p className="text-sm text-gray-500">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Get Started
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Start by adding your content sources to create a personalized feed. 
                        We&apos;ll help you consume social media mindfully with time management 
                        and curated content.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 