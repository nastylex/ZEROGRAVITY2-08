/**
 * Bot Detection Engine
 * Analyzes various signals to determine if activity comes from a bot
 */

import { FilterConfig, FilterResult, BotIndicators } from '../types/filter';

const BOT_PATTERNS = {
  userAgents: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
    /headless/i,
    /phantomjs/i,
    /automated/i,
  ],
  suspiciousIPs: [
    /^127\./, // localhost
    /^192\.168\./, // private
    /^10\./, // private
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // private
  ],
};

const TIMING_THRESHOLDS = {
  suspiciouslyFast: 50, // ms
  consistentInterval: 5000, // ms
  perfectTimingTolerance: 100, // ms
};

export class BotDetector {
  private requestTimestamps: number[] = [];

  /**
   * Comprehensive bot detection analysis
   */
  public detect(indicators: BotIndicators): FilterResult {
    const reasons: string[] = [];
    const flaggedPatterns: string[] = [];
    let confidenceScore = 0;

    // Check user agent
    if (indicators.userAgent) {
      const uaCheck = this.checkUserAgent(indicators.userAgent);
      if (uaCheck.detected) {
        confidenceScore += 0.3;
        reasons.push(uaCheck.reason);
        flaggedPatterns.push(uaCheck.pattern);
      }
    }

    // Check IP address
    if (indicators.ipAddress) {
      const ipCheck = this.checkIPAddress(indicators.ipAddress);
      if (ipCheck.detected) {
        confidenceScore += 0.2;
        reasons.push(ipCheck.reason);
        flaggedPatterns.push(ipCheck.pattern);
      }
    }

    // Check behavior patterns
    if (indicators.behavior) {
      const behaviorCheck = this.checkBehavior(indicators.behavior);
      confidenceScore += behaviorCheck.score;
      reasons.push(...behaviorCheck.reasons);
      flaggedPatterns.push(...behaviorCheck.patterns);
    }

    // Check timing patterns
    if (indicators.timing) {
      const timingCheck = this.checkTiming(indicators.timing);
      confidenceScore += timingCheck.score;
      reasons.push(...timingCheck.reasons);
      flaggedPatterns.push(...timingCheck.patterns);
    }

    // Normalize confidence score to 0-1
    const normalizedScore = Math.min(confidenceScore, 1);

    return {
      isBot: normalizedScore > 0.5,
      isHuman: normalizedScore < 0.3,
      confidence: normalizedScore,
      type: this.determineType(normalizedScore),
      score: normalizedScore,
      reasons,
      flaggedPatterns,
    };
  }

  /**
   * Analyze user agent string
   */
  private checkUserAgent(userAgent: string): {
    detected: boolean;
    reason: string;
    pattern: string;
  } {
    for (const pattern of BOT_PATTERNS.userAgents) {
      if (pattern.test(userAgent)) {
        return {
          detected: true,
          reason: `Detected bot-like user agent: ${userAgent}`,
          pattern: pattern.source,
        };
      }
    }

    return {
      detected: false,
      reason: 'User agent appears normal',
      pattern: '',
    };
  }

  /**
   * Analyze IP address
   */
  private checkIPAddress(ipAddress: string): {
    detected: boolean;
    reason: string;
    pattern: string;
  } {
    for (const pattern of BOT_PATTERNS.suspiciousIPs) {
      if (pattern.test(ipAddress)) {
        return {
          detected: true,
          reason: `Suspicious IP address: ${ipAddress}`,
          pattern: pattern.source,
        };
      }
    }

    return {
      detected: false,
      reason: 'IP address appears normal',
      pattern: '',
    };
  }

  /**
   * Analyze behavior patterns
   */
  private checkBehavior(behavior: BotIndicators['behavior']): {
    score: number;
    reasons: string[];
    patterns: string[];
  } {
    let score = 0;
    const reasons: string[] = [];
    const patterns: string[] = [];

    if (behavior?.automatedActions) {
      score += 0.25;
      reasons.push('Detected automated actions pattern');
      patterns.push('automated-actions');
    }

    if (behavior?.rapidRequests) {
      score += 0.2;
      reasons.push('Excessive request frequency detected');
      patterns.push('rapid-requests');
    }

    if (behavior?.suspiciousClicks) {
      score += 0.15;
      reasons.push('Suspicious click patterns detected');
      patterns.push('suspicious-clicks');
    }

    if (behavior?.noMouseMovement) {
      score += 0.1;
      reasons.push('No mouse movement detected');
      patterns.push('no-mouse-movement');
    }

    if (behavior?.noScrolling) {
      score += 0.1;
      reasons.push('No scrolling activity detected');
      patterns.push('no-scrolling');
    }

    return { score, reasons, patterns };
  }

  /**
   * Analyze timing patterns
   */
  private checkTiming(timing: BotIndicators['timing']): {
    score: number;
    reasons: string[];
    patterns: string[];
  } {
    let score = 0;
    const reasons: string[] = [];
    const patterns: string[] = [];

    if (timing?.responseTime && timing.responseTime < TIMING_THRESHOLDS.suspiciouslyFast) {
      score += 0.15;
      reasons.push(`Suspiciously fast response time: ${timing.responseTime}ms`);
      patterns.push('suspiciously-fast');
    }

    if (timing?.consistentIntervals) {
      score += 0.15;
      reasons.push('Perfectly consistent request intervals');
      patterns.push('consistent-intervals');
    }

    if (timing?.perfectTiming) {
      score += 0.1;
      reasons.push('Perfect timing detected (human-unlikely)');
      patterns.push('perfect-timing');
    }

    return { score, reasons, patterns };
  }

  /**
   * Determine entity type based on confidence score
   */
  private determineType(score: number): 'bot' | 'human' | 'unknown' {
    if (score > 0.7) return 'bot';
    if (score < 0.3) return 'human';
    return 'unknown';
  }

  /**
   * Track request timestamps for pattern analysis
   */
  public trackRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);

    // Keep only last 100 timestamps
    if (this.requestTimestamps.length > 100) {
      this.requestTimestamps.shift();
    }
  }

  /**
   * Get timing statistics
   */
  public getTimingStats(): {
    averageInterval: number;
    standardDeviation: number;
    isConsistent: boolean;
  } {
    if (this.requestTimestamps.length < 2) {
      return { averageInterval: 0, standardDeviation: 0, isConsistent: false };
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.requestTimestamps.length; i++) {
      intervals.push(this.requestTimestamps[i] - this.requestTimestamps[i - 1]);
    }

    const average = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - average, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);

    return {
      averageInterval: average,
      standardDeviation: stdDev,
      isConsistent: stdDev < TIMING_THRESHOLDS.perfectTimingTolerance,
    };
  }
}

export const botDetector = new BotDetector();
