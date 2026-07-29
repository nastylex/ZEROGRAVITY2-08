/**
 * Filter Types for Bot and Human Detection
 */

export type EntityType = 'bot' | 'human' | 'unknown';

export interface FilterConfig {
  type: EntityType;
  confidence: number; // 0-1
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface FilterResult {
  isBot: boolean;
  isHuman: boolean;
  confidence: number;
  type: EntityType;
  score: number;
  reasons: string[];
  flaggedPatterns: string[];
}

export interface BotIndicators {
  userAgent?: string;
  ipAddress?: string;
  behavior?: BotBehavior;
  timing?: BotTiming;
  patterns?: BotPattern[];
}

export interface BotBehavior {
  automatedActions: boolean;
  rapidRequests: boolean;
  suspiciousClicks: boolean;
  noMouseMovement: boolean;
  noScrolling: boolean;
}

export interface BotTiming {
  responseTime: number;
  consistentIntervals: boolean;
  perfectTiming: boolean;
}

export interface BotPattern {
  name: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
}
