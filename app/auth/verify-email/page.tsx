'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../components/ui/button";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
        } else {
          setStatus(data.error === 'expired' ? 'expired' : 'error');
          setMessage(data.message || 'Email verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [token, email]);

  const resendVerification = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage('Failed to resend verification email. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow text-center">
      <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
      
      {status === 'verifying' && (
        <div className="space-y-4">
          <div className="text-blue-600">Verifying your email...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="text-green-600 text-lg">✓ {message}</div>
          <Link href="/auth/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="text-red-500">{message}</div>
          <div className="space-y-2">
            <Link href="/auth/register">
              <Button variant="outline" className="w-full">Register Again</Button>
            </Link>
            <Button onClick={resendVerification} variant="ghost" className="w-full">
              Resend Verification Email
            </Button>
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div className="space-y-4">
          <div className="text-yellow-600">{message}</div>
          <Button onClick={resendVerification} className="w-full">
            Resend Verification Email
          </Button>
        </div>
      )}
    </div>
  );
} 