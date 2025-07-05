'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import Link from "next/link";

function ResetPasswordConfirmForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState(true);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (!emailParam || !tokenParam) {
      setError("Invalid reset link. Please request a new password reset.");
      setValidLink(false);
      return;
    }
    
    setEmail(emailParam);
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setError(""); // Clear any previous errors
        setSuccess(data.message);
        // Clear form
        setPassword("");
        setConfirmPassword("");
      } else {
        // Map specific error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          'invalid_token': 'Invalid or expired reset link. Please request a new password reset.',
          'token_used': 'This reset link has already been used. Please request a new password reset.',
          'token_expired': 'Reset link has expired. Please request a new password reset.',
          'user_not_found': 'Account not found. Please contact support.',
          'weak_password': 'Password must be at least 8 characters long.',
        };
        setError(errorMessages[data.error] || data.message || 'Password reset failed. Please try again.');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!validLink) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <div className="text-center space-y-4">
          <Link href="/auth/reset-password" className="text-blue-600 hover:underline text-sm">
            Request New Password Reset
          </Link>
          <div className="text-gray-600">or</div>
          <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Set New Password</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Enter your new password for {email}
      </p>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="New Password (minimum 8 characters)"
            aria-label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm New Password"
            aria-label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-sm">{success}</div>
          <div className="text-gray-600 text-sm">
            Your password has been successfully updated. You can now sign in with your new password.
          </div>
          <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
} 