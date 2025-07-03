'use client';

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        // Clear form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Register for ZenFeed</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Create your account to start your mindful social media journey
      </p>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password (minimum 8 characters)"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating Account..." : "Register"}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-green-600 text-sm">{success}</div>
          <div className="text-gray-600 text-sm">
            Check your email inbox and click the verification link to activate your account.
          </div>
          <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
            Go to Login
          </Link>
        </div>
      )}
      
      {!success && (
        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
} 