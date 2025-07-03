'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Deleted
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your ZenFeed account has been permanently deleted
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4" aria-label="Success">✓</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Account Successfully Deleted
            </h3>
            <p className="text-gray-600 mb-6">
              Your account and all associated data have been permanently removed from our systems. 
              This action cannot be undone.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">What was deleted:</h4>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• Your profile and account information</li>
                <li>• All content preferences and settings</li>
                <li>• Session history and analytics data</li>
                <li>• Any subscription or payment information</li>
                <li>• All app customizations and saved content</li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Thank you for using ZenFeed. If you change your mind, you can always create a new account.
              </p>
              
              <div className="flex flex-col space-y-2">
                <Link href="/auth/register">
                  <Button className="w-full">
                    Create New Account
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Visit Homepage
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            If you have any questions or concerns, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
} 