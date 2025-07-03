/**
 * Deletion Security Service
 * Comprehensive security measures and audit logging for account deletion
 */

// Security configuration
const DELETION_SECURITY_CONFIG = {
  // Rate limiting
  MAX_DELETION_ATTEMPTS: 3,
  DELETION_ATTEMPT_WINDOW: 60 * 60 * 1000, // 1 hour
  COOLDOWN_PERIOD: 24 * 60 * 60 * 1000, // 24 hours
  
  // IP-based security
  MAX_DELETIONS_PER_IP: 5,
  IP_TRACKING_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  
  // Suspicious activity thresholds
  SUSPICIOUS_USER_AGENT_PATTERNS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /automation/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
    /webdriver/i,
    /puppeteer/i,
  ],
};

// Types for security operations
export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  additionalVerificationRequired: boolean;
  blockUntil?: Date;
}

export interface DeletionAttempt {
  email: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  securityFlags: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: 'deletion_attempt' | 'deletion_success' | 'deletion_failure' | 'security_block' | 'admin_notification';
  email: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  securityFlags: string[];
  adminNotified: boolean;
  recoveryCode?: string;
}

export class DeletionSecurityService {
  private static instance: DeletionSecurityService;
  private deletionAttempts: Map<string, DeletionAttempt[]> = new Map();
  private ipTracker: Map<string, number> = new Map();
  private auditLog: Map<string, AuditLogEntry> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousUsers: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): DeletionSecurityService {
    if (!DeletionSecurityService.instance) {
      DeletionSecurityService.instance = new DeletionSecurityService();
    }
    return DeletionSecurityService.instance;
  }

  /**
   * Perform comprehensive security check before allowing deletion
   */
  public async performSecurityCheck(options: {
    email: string;
    ip: string;
    userAgent: string;
    accountAge?: number;
  }): Promise<SecurityCheckResult> {
    const securityFlags: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check 1: Rate limiting per user
    const userAttempts = this.getUserDeletionAttempts(options.email);
    if (userAttempts.length >= DELETION_SECURITY_CONFIG.MAX_DELETION_ATTEMPTS) {
      const recentAttempts = userAttempts.filter(
        attempt => Date.now() - attempt.timestamp.getTime() < DELETION_SECURITY_CONFIG.DELETION_ATTEMPT_WINDOW
      );
      
      if (recentAttempts.length >= DELETION_SECURITY_CONFIG.MAX_DELETION_ATTEMPTS) {
        securityFlags.push('rate_limit_exceeded');
        riskLevel = 'high';
        return {
          allowed: false,
          reason: 'Too many deletion attempts. Please wait before trying again.',
          riskLevel,
          additionalVerificationRequired: true,
          blockUntil: new Date(Date.now() + DELETION_SECURITY_CONFIG.COOLDOWN_PERIOD)
        };
      }
    }

    // Check 2: IP-based rate limiting
    const ipDeletions = this.ipTracker.get(options.ip) || 0;
    if (ipDeletions >= DELETION_SECURITY_CONFIG.MAX_DELETIONS_PER_IP) {
      securityFlags.push('ip_rate_limit_exceeded');
      riskLevel = 'high';
      this.blockedIPs.add(options.ip);
      return {
        allowed: false,
        reason: 'Too many deletions from this IP address.',
        riskLevel,
        additionalVerificationRequired: true,
        blockUntil: new Date(Date.now() + DELETION_SECURITY_CONFIG.COOLDOWN_PERIOD)
      };
    }

    // Check 3: Blocked IP addresses
    if (this.blockedIPs.has(options.ip)) {
      securityFlags.push('blocked_ip');
      riskLevel = 'high';
      return {
        allowed: false,
        reason: 'Access blocked from this IP address.',
        riskLevel,
        additionalVerificationRequired: true
      };
    }

    // Check 4: Suspicious user agents
    const suspiciousUserAgent = DELETION_SECURITY_CONFIG.SUSPICIOUS_USER_AGENT_PATTERNS.some(
      pattern => pattern.test(options.userAgent)
    );
    if (suspiciousUserAgent) {
      securityFlags.push('suspicious_user_agent');
      riskLevel = this.elevateRiskLevel(riskLevel, 'medium');
    }

    // Check 5: Account age (very new accounts might be suspicious)
    if (options.accountAge && options.accountAge < 24 * 60 * 60 * 1000) { // Less than 24 hours
      securityFlags.push('new_account');
      riskLevel = this.elevateRiskLevel(riskLevel, 'medium');
    }

    // Check 6: Suspicious user tracking
    if (this.suspiciousUsers.has(options.email)) {
      securityFlags.push('suspicious_user');
      riskLevel = 'high';
    }

    // Check 7: Multiple rapid requests (bot detection)
    const recentAttempts = userAttempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 60000 // Last minute
    );
    if (recentAttempts.length > 2) {
      securityFlags.push('rapid_requests');
      riskLevel = 'high';
    }

    // Determine if additional verification is required
    const additionalVerificationRequired = riskLevel === 'high' || securityFlags.length > 2;

    // Log security check
    await this.logSecurityCheck(options, securityFlags, riskLevel);

    return {
      allowed: true,
      riskLevel,
      additionalVerificationRequired,
      reason: securityFlags.length > 0 ? `Security flags: ${securityFlags.join(', ')}` : undefined
    };
  }

  /**
   * Record a deletion attempt for security tracking
   */
  public async recordDeletionAttempt(options: {
    email: string;
    ip: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    riskLevel: 'low' | 'medium' | 'high';
    securityFlags: string[];
  }): Promise<void> {
    const attempt: DeletionAttempt = {
      email: options.email,
      timestamp: new Date(),
      ip: options.ip,
      userAgent: options.userAgent,
      success: options.success,
      reason: options.reason,
      riskLevel: options.riskLevel,
      securityFlags: options.securityFlags
    };

    // Add to user's attempt history
    const userAttempts = this.deletionAttempts.get(options.email) || [];
    userAttempts.push(attempt);
    this.deletionAttempts.set(options.email, userAttempts);

    // Update IP tracking
    const ipCount = this.ipTracker.get(options.ip) || 0;
    this.ipTracker.set(options.ip, ipCount + 1);

    // Create audit log entry
    await this.createAuditLogEntry({
      eventType: options.success ? 'deletion_success' : 'deletion_attempt',
      email: options.email,
      ip: options.ip,
      userAgent: options.userAgent,
      details: {
        success: options.success,
        reason: options.reason,
        securityFlags: options.securityFlags
      },
      riskLevel: options.riskLevel,
      securityFlags: options.securityFlags
    });

    // Mark user as suspicious if high risk
    if (options.riskLevel === 'high' && !options.success) {
      this.suspiciousUsers.add(options.email);
    }
  }

  /**
   * Send security notifications
   */
  public async sendSecurityNotifications(options: {
    email: string;
    eventType: 'deletion_success' | 'deletion_blocked' | 'suspicious_activity';
    details: Record<string, any>;
  }): Promise<void> {
    // TODO: In production, implement actual email/SMS notifications
    console.log(`[SECURITY NOTIFICATION] ${options.eventType.toUpperCase()}:`, {
      email: options.email,
      timestamp: new Date().toISOString(),
      details: options.details
    });

    // Create audit log entry for notification
    await this.createAuditLogEntry({
      eventType: 'admin_notification',
      email: options.email,
      ip: 'system',
      userAgent: 'notification_system',
      details: {
        notificationType: options.eventType,
        ...options.details
      },
      riskLevel: 'low',
      securityFlags: ['notification_sent']
    });
  }

  /**
   * Get user's deletion attempt history
   */
  private getUserDeletionAttempts(email: string): DeletionAttempt[] {
    return this.deletionAttempts.get(email) || [];
  }

  /**
   * Helper function to elevate risk level appropriately
   */
  private elevateRiskLevel(current: 'low' | 'medium' | 'high', target: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[current] >= levels[target] ? current : target;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLogEntry(options: {
    eventType: AuditLogEntry['eventType'];
    email: string;
    ip: string;
    userAgent: string;
    details: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
    securityFlags: string[];
    recoveryCode?: string;
  }): Promise<string> {
    const id = this.generateAuditLogId();
    const entry: AuditLogEntry = {
      id,
      timestamp: new Date(),
      eventType: options.eventType,
      email: options.email,
      ip: options.ip,
      userAgent: options.userAgent,
      details: options.details,
      riskLevel: options.riskLevel,
      securityFlags: options.securityFlags,
      adminNotified: false,
      recoveryCode: options.recoveryCode
    };

    this.auditLog.set(id, entry);

    // TODO: In production, persist to database
    console.log(`[AUDIT LOG] ${options.eventType.toUpperCase()}:`, {
      id,
      timestamp: entry.timestamp.toISOString(),
      email: options.email,
      ip: options.ip,
      riskLevel: options.riskLevel,
      securityFlags: options.securityFlags,
      details: options.details
    });

    return id;
  }

  /**
   * Log security check results
   */
  private async logSecurityCheck(
    options: {
      email: string;
      ip: string;
      userAgent: string;
    },
    securityFlags: string[],
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<void> {
    await this.createAuditLogEntry({
      eventType: 'security_block',
      email: options.email,
      ip: options.ip,
      userAgent: options.userAgent,
      details: {
        securityCheckPerformed: true,
        timestamp: new Date().toISOString()
      },
      riskLevel,
      securityFlags
    });
  }

  /**
   * Generate audit log ID
   */
  private generateAuditLogId(): string {
    return 'audit_' + crypto.randomUUID();
  }

  /**
   * Get audit log entries for a user
   */
  public getAuditLog(email: string): AuditLogEntry[] {
    return Array.from(this.auditLog.values()).filter(entry => entry.email === email);
  }

  /**
   * Get all audit log entries (admin function)
   */
  public getAllAuditLogs(): AuditLogEntry[] {
    return Array.from(this.auditLog.values());
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.deletionAttempts.clear();
    this.ipTracker.clear();
    this.auditLog.clear();
    this.blockedIPs.clear();
    this.suspiciousUsers.clear();
  }
} 