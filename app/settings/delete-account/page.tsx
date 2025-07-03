'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserData {
  email: string;
  verified: boolean;
  createdAt: string;
}

type DeletionStep = 'initial' | 'confirmation' | 'password' | 'final';

export default function DeleteAccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<DeletionStep>('initial');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    confirm1: false,
    confirm2: false,
    confirm3: false
  });
  const router = useRouter();

  useEffect(() => {
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
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNextStep = () => {
    setError('');
    if (currentStep === 'initial') {
      setCurrentStep('confirmation');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('password');
    } else if (currentStep === 'password') {
      setCurrentStep('final');
    }
  };

  const handlePreviousStep = () => {
    setError('');
    if (currentStep === 'final') {
      setCurrentStep('password');
    } else if (currentStep === 'password') {
      setCurrentStep('confirmation');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('initial');
    }
  };

  const handleCheckboxChange = (checkboxName: string, checked: boolean) => {
    setCheckboxes(prev => ({
      ...prev,
      [checkboxName]: checked
    }));
  };

  const validatePassword = () => {
    if (!password) {
      setError('Please enter your password to confirm account deletion');
      return false;
    }
    if (password.length < 6) {
      setError('Password is too short for verification');
      return false;
    }
    return true;
  };

  const validateConfirmText = () => {
    const expectedText = 'DELETE MY ACCOUNT';
    if (confirmText !== expectedText) {
      setError(`Please type "${expectedText}" exactly as shown`);
      return false;
    }
    return true;
  };

  const handleFinalDeletion = async () => {
    if (!validatePassword() || !validateConfirmText()) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          password
        }),
      });

      if (response.ok) {
        // Account deleted successfully - redirect to goodbye page
        router.push('/auth/deleted');
      } else {
        const data = await response.json();
        const errorMessages: Record<string, string> = {
          'invalid_password': 'Incorrect password. Please try again.',
          'missing_password': 'Password is required for account deletion.',
          'unauthorized': 'Authentication required. Please log in again.',
          'user_not_found': 'Account not found. Please try logging in again.',
          'deletion_failed': 'Failed to delete account data. Please try again.',
          'server_error': 'Server error occurred. Please try again later.',
        };
        setError(errorMessages[data.error] || data.message || 'Account deletion failed. Please try again.');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
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
    return null;
  }

  const getStepProgress = () => {
    const steps = ['initial', 'confirmation', 'password', 'final'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const allCheckboxesChecked = checkboxes.confirm1 && checkboxes.confirm2 && checkboxes.confirm3;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                ZenFeed
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                ← Back to Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Account Deletion Process</span>
              <span>Step {['initial', 'confirmation', 'password', 'final'].indexOf(currentStep) + 1} of 4</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              
              {/* Step 1: Initial Warning */}
              {currentStep === 'initial' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-2xl font-bold text-red-900">Delete Account</h2>
                      <p className="text-red-700">This action cannot be undone</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      You are about to permanently delete your ZenFeed account: <strong>{user.email}</strong>
                    </p>
                    <p className="text-gray-700 mb-4">
                      Account created: <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium text-red-900 mb-3">
                      What will be deleted:
                    </h3>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Your profile and account information</li>
                      <li>• All content preferences and curated sources</li>
                      <li>• Session history and analytics data</li>
                      <li>• Any subscription or payment information</li>
                      <li>• All app settings and customizations</li>
                      <li>• Any saved or bookmarked content</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-3">
                      Before you proceed:
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Consider downloading your data first (if needed)</li>
                      <li>• Cancel any active subscriptions</li>
                      <li>• Make sure you have access to your email for confirmation</li>
                      <li>• Remember that this action is irreversible</li>
                    </ul>
                  </div>

                  <div className="flex space-x-4">
                    <Link href="/settings">
                      <Button variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button variant="destructive" onClick={handleNextStep}>
                      I Understand, Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Confirmation */}
              {currentStep === 'confirmation' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-2xl font-bold text-orange-900">Confirm Your Decision</h2>
                      <p className="text-orange-700">Please read and confirm the following</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="confirm1"
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        onChange={(e) => handleCheckboxChange('confirm1', e.target.checked)}
                      />
                      <label htmlFor="confirm1" className="ml-2 block text-sm text-gray-900">
                        I understand that this action is permanent and cannot be undone
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="confirm2"
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        onChange={(e) => handleCheckboxChange('confirm2', e.target.checked)}
                      />
                      <label htmlFor="confirm2" className="ml-2 block text-sm text-gray-900">
                        I understand that all my data will be permanently deleted
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="confirm3"
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        onChange={(e) => handleCheckboxChange('confirm3', e.target.checked)}
                      />
                      <label htmlFor="confirm3" className="ml-2 block text-sm text-gray-900">
                        I have considered alternatives and still want to delete my account
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleNextStep}
                      disabled={!allCheckboxesChecked}
                    >
                      Continue to Password Verification
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Password Verification */}
              {currentStep === 'password' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-2xl font-bold text-red-900">Password Verification</h2>
                      <p className="text-red-700">Confirm your identity to proceed</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Please enter your current password to verify your identity before deleting your account.
                    </p>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                      {error}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleNextStep}
                      disabled={!password}
                    >
                      Continue to Final Confirmation
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Final Confirmation */}
              {currentStep === 'final' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h2 className="text-2xl font-bold text-red-900">Final Confirmation</h2>
                      <p className="text-red-700">Last chance to cancel</p>
                    </div>
                  </div>

                  <div className="bg-red-100 border border-red-300 rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium text-red-900 mb-3">
                      ⚠️ FINAL WARNING
                    </h3>
                    <p className="text-red-800 mb-4">
                      You are about to permanently delete your account <strong>{user.email}</strong>. 
                      This action will immediately remove all your data and cannot be reversed.
                    </p>
                    <p className="text-red-800 font-medium">
                      Are you absolutely certain you want to proceed?
                    </p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
                      Type "DELETE MY ACCOUNT" to confirm:
                    </label>
                    <Input
                      id="confirmText"
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                      {error}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleFinalDeletion}
                      disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
                    >
                      {isDeleting ? 'Deleting Account...' : 'Delete My Account Forever'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 