'use client';

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setError(""); // Clear any previous errors
        setSuccess(data.message);
        setEmail(""); // Clear form
      } else {
        // Map specific error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          'rate_limited': 'Too many reset attempts. Please wait before trying again.',
          'invalid_email': 'Please enter a valid email address.',
          'email_failed': 'Unable to send reset email. Please try again.',
        };
        setError(errorMessages[data.error] || data.message || 'Password reset failed. Please try again.');
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending Reset Link..." : "Send Reset Link"}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-sm">{success}</div>
          <div className="text-gray-600 text-sm">
            If your email is registered and verified, check your inbox for the reset link.
          </div>
          <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      )}
      
      {!success && (
        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Remember your password? </span>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
} 