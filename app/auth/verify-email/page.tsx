'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { handlePostAuthRedirect } from '@/lib/auth/utils';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    // Verify the token
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, email }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in to your account.');
        } else {
          if (data.error === 'Token expired') {
            setStatus('expired');
            setMessage('Your verification link has expired. Please request a new one.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Verification failed. Please try again.');
          }
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      });
  }, [token, email]);

  const resendVerification = async () => {
    if (isResending) return;
    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.message || 'Failed to resend verification email. Please try again.');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleContinueToApp = async () => {
    setIsRedirecting(true);
    try {
      // Since user just verified email, they need to login first
      // We'll redirect to login and then let login handle onboarding check
      router.push('/auth/login?verified=true');
    } catch (error) {
      console.error('Redirect error:', error);
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-600 text-5xl mb-4" aria-label="Success">✓</div>
              <p className="text-green-600 font-medium mb-4">{message}</p>
              <Button 
                className="w-full" 
                onClick={handleContinueToApp}
                disabled={isRedirecting}
              >
                {isRedirecting ? 'Redirecting...' : 'Continue to Login'}
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-600 text-5xl mb-4" aria-label="Error">✗</div>
              <p className="text-red-600 font-medium mb-4">{message}</p>
              <Link href="/auth/register">
                <Button className="w-full">Back to Registration</Button>
              </Link>
            </div>
          )}
          
          {status === 'expired' && (
            <div className="text-center">
              <div className="text-yellow-600 text-5xl mb-4" aria-label="Expired">⏰</div>
              <p className="text-yellow-600 font-medium mb-4">{message}</p>
              <Button 
                onClick={resendVerification} 
                className="w-full mb-4"
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full">Back to Registration</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
} 