import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { users } from '@/lib/stores/verification-store';
import { DataRemovalService } from '@/lib/auth/data-removal';
import { DeletionSecurityService } from '@/lib/auth/deletion-security';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = getAuthenticatedUser(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    // Validate password is provided
    if (!password) {
      return NextResponse.json(
        { error: 'missing_password', message: 'Password is required for account deletion' },
        { status: 400 }
      );
    }

    // Get user data
    const user = users.get(session.email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'invalid_password', message: 'Invalid password' },
        { status: 401 }
      );
    }

    // Get client information for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Initialize security service
    const securityService = DeletionSecurityService.getInstance();
    
    // Calculate account age
    const accountAge = Date.now() - new Date(user.createdAt).getTime();

    // Perform comprehensive security check
    const securityCheck = await securityService.performSecurityCheck({
      email: session.email,
      ip: clientIP,
      userAgent: userAgent,
      accountAge: accountAge
    });

    // Record the deletion attempt
    await securityService.recordDeletionAttempt({
      email: session.email,
      ip: clientIP,
      userAgent: userAgent,
      success: false, // Will update to true if successful
      reason: 'password_verified',
      riskLevel: securityCheck.riskLevel,
      securityFlags: []
    });

    // Check if deletion is allowed by security service
    if (!securityCheck.allowed) {
      // Send security notification for blocked attempt
      await securityService.sendSecurityNotifications({
        email: session.email,
        eventType: 'deletion_blocked',
        details: {
          reason: securityCheck.reason,
          riskLevel: securityCheck.riskLevel,
          ip: clientIP,
          userAgent: userAgent,
          blockUntil: securityCheck.blockUntil?.toISOString()
        }
      });

      return NextResponse.json(
        { 
          error: 'deletion_blocked', 
          message: securityCheck.reason || 'Account deletion blocked for security reasons',
          riskLevel: securityCheck.riskLevel,
          blockUntil: securityCheck.blockUntil?.toISOString()
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Perform comprehensive data removal using the data removal service
    const dataRemovalService = DataRemovalService.getInstance();
    const removalResult = await dataRemovalService.removeAllUserData({
      userId: session.email, // Using email as userId for now
      email: session.email,
      initiatedBy: 'user_self_deletion',
      ip: clientIP,
      userAgent: userAgent,
    });

    // Record successful deletion attempt
    await securityService.recordDeletionAttempt({
      email: session.email,
      ip: clientIP,
      userAgent: userAgent,
      success: removalResult.success,
      reason: removalResult.success ? 'deletion_completed' : 'deletion_failed',
      riskLevel: securityCheck.riskLevel,
      securityFlags: removalResult.success ? ['successful_deletion'] : ['failed_deletion']
    });

    // Check if data removal was successful
    if (!removalResult.success) {
      console.error('Data removal failed:', removalResult.errors);
      return NextResponse.json(
        { 
          error: 'deletion_failed', 
          message: 'Failed to complete account deletion',
          details: removalResult.errors 
        },
        { status: 500 }
      );
    }

    // Send security notification for successful deletion
    try {
      await securityService.sendSecurityNotifications({
        email: session.email,
        eventType: 'deletion_success',
        details: {
          timestamp: removalResult.auditLog.timestamp,
          riskLevel: securityCheck.riskLevel,
          removedData: removalResult.removedData,
          ip: clientIP,
          userAgent: userAgent
        }
      });
    } catch (notificationError) {
      console.error('Failed to send deletion notification:', notificationError);
      // Continue with successful response since deletion succeeded
    }

    // Create response with comprehensive deletion information
    const response = NextResponse.json(
      { 
        message: 'Account successfully deleted',
        email: session.email,
        deletedAt: removalResult.auditLog.timestamp,
        removedData: removalResult.removedData,
        auditId: removalResult.auditLog.timestamp // Can be used for audit trail
      },
      { status: 200 }
    );

    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediate expiry
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 