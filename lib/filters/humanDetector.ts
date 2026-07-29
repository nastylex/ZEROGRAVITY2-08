/**
 * Human Detection Engine
 * Analyzes signals to confirm human activity
 */

import { FilterResult, BotIndicators } from '../types/filter';

const HUMAN_INDICATORS = {
  validUserAgents: [
    /chrome/i,
    /firefox/i,
    /safari/i,
    /edge/i,
    /opera/i,
  ],
  mouseEvents: ['mousemove', 'mousedown', 'mouseup', 'click'],
  keyboardEvents: ['keydown', 'keyup', 'keypress'],
  scrollEvents: ['scroll', 'wheel'],
};

const HUMAN_THRESHOLDS = {
  minMouseMovements: 3,
  minKeyPresses: 2,
  minScrollEvents: 1,
  variableTiming: 50, // ms variance
};

export interface HumanSignals {
  mouseMovements: number;
  keyPresses: number;
  scrollEvents: number;
  clickVariance: number;
  pauseDurations: number[];
  cursorPatterns: string[];
  typoPatterns: boolean; // Humans make typos
  idleTime: number;
  sessionDuration: number;
}

export class HumanDetector {
  private signals: HumanSignals = {
    mouseMovements: 0,
    keyPresses: 0,
    scrollEvents: 0,
    clickVariance: 0,
    pauseDurations: [],
    cursorPatterns: [],
    typoPatterns: false,
    idleTime: 0,
    sessionDuration: 0,
  };

  private lastActivityTime: number = Date.now();
  private sessionStartTime: number = Date.now();

  /**
   * Record mouse movement
   */
  public recordMouseMovement(event: MouseEvent): void {
    this.signals.mouseMovements++;
    this.updateActivity();

    // Analyze cursor pattern for randomness
    const pattern = this.analyzeCursorPattern(event.clientX, event.clientY);
    if (pattern) {
      this.signals.cursorPatterns.push(pattern);
    }
  }

  /**
   * Record keyboard input
   */
  public recordKeyPress(event: KeyboardEvent): void {
    this.signals.keyPresses++;
    this.updateActivity();

    // Bots often have perfect typing
    // Humans sometimes make typos and corrections
    if (event.type === 'keydown' && this.isPossiblyTypo(event.key)) {
      this.signals.typoPatterns = true;
    }
  }

  /**
   * Record scroll activity
   */
  public recordScroll(event: WheelEvent): void {
    this.signals.scrollEvents++;
    this.updateActivity();
  }

  /**
   * Record click with timing
   */
  public recordClick(timestamp: number = Date.now()): void {
    const timeSinceLastActivity = timestamp - this.lastActivityTime;
    this.signals.pauseDurations.push(timeSinceLastActivity);
    this.updateActivity();
  }

  /**
   * Analyze cursor movement for human-like randomness
   */
  private analyzeCursorPattern(x: number, y: number): string {
    // Analyze coordinate randomness
    // Bots move in straight lines or perfect patterns
    // Humans move erratically
    const pattern = `(${x},${y})`;
    return pattern;
  }

  /**
   * Check if key press might be a typo or correction
   */
  private isPossiblyTypo(key: string): boolean {
    // Common typo indicators
    return ['Backspace', 'Delete'].includes(key);
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Calculate idle time
   */
  private calculateIdleTime(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Calculate session duration
   */
  private calculateSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Comprehensive human detection
   */
  public detect(): FilterResult {
    this.signals.idleTime = this.calculateIdleTime();
    this.signals.sessionDuration = this.calculateSessionDuration();

    const reasons: string[] = [];
    let humanScore = 0;

    // Check for mouse movements
    if (this.signals.mouseMovements >= HUMAN_THRESHOLDS.minMouseMovements) {
      humanScore += 0.25;
      reasons.push(`Natural mouse movements detected: ${this.signals.mouseMovements}`);
    }

    // Check for keyboard input
    if (this.signals.keyPresses >= HUMAN_THRESHOLDS.minKeyPresses) {
      humanScore += 0.2;
      reasons.push(`Keyboard input detected: ${this.signals.keyPresses} presses`);
    }

    // Check for scrolling
    if (this.signals.scrollEvents >= HUMAN_THRESHOLDS.minScrollEvents) {
      humanScore += 0.15;
      reasons.push('Scrolling behavior detected');
    }

    // Check for typo patterns
    if (this.signals.typoPatterns) {
      humanScore += 0.1;
      reasons.push('Human typing patterns detected (corrections/backspaces)');
    }

    // Check pause duration variance
    if (this.signals.pauseDurations.length > 1) {
      const variance = this.calculateVariance(this.signals.pauseDurations);
      if (variance > HUMAN_THRESHOLDS.variableTiming) {
        humanScore += 0.15;
        reasons.push('Variable timing detected (human-like)');
      }
    }

    // Check session duration
    if (this.signals.sessionDuration > 30000) {
      // More than 30 seconds
      humanScore += 0.1;
      reasons.push('Extended session duration');
    }

    // Penalize if idle too long
    if (this.signals.idleTime > 600000) {
      // More than 10 minutes
      humanScore -= 0.2;
      reasons.push('Extended idle period');
    }

    const normalizedScore = Math.max(0, Math.min(humanScore, 1));

    return {
      isBot: normalizedScore < 0.3,
      isHuman: normalizedScore > 0.6,
      confidence: normalizedScore,
      type: normalizedScore > 0.6 ? 'human' : normalizedScore < 0.3 ? 'bot' : 'unknown',
      score: normalizedScore,
      reasons,
      flaggedPatterns: [],
    };
  }

  /**
   * Calculate variance in pause durations
   */
  private calculateVariance(durations: number[]): number {
    if (durations.length < 2) return 0;

    const mean = durations.reduce((a, b) => a + b) / durations.length;
    const variance =
      durations.reduce((sum, duration) => sum + Math.pow(duration - mean, 2), 0) /
      durations.length;

    return Math.sqrt(variance);
  }

  /**
   * Get current signals
   */
  public getSignals(): HumanSignals {
    return { ...this.signals };
  }

  /**
   * Reset signals
   */
  public reset(): void {
    this.signals = {
      mouseMovements: 0,
      keyPresses: 0,
      scrollEvents: 0,
      clickVariance: 0,
      pauseDurations: [],
      cursorPatterns: [],
      typoPatterns: false,
      idleTime: 0,
      sessionDuration: 0,
    };
    this.lastActivityTime = Date.now();
    this.sessionStartTime = Date.now();
  }
}

export const humanDetector = new HumanDetector();
