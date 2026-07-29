/**
 * Main Filter Engine
 * Orchestrates bot and human detection
 */

import { BotDetector, botDetector } from './botDetector';
import { HumanDetector, humanDetector } from './humanDetector';
import { FilterResult, BotIndicators } from '../types/filter';

export class FilterEngine {
  private botDetector: BotDetector;
  private humanDetector: HumanDetector;

  constructor() {
    this.botDetector = botDetector;
    this.humanDetector = humanDetector;
  }

  /**
   * Comprehensive filtering with both bot and human detection
   */
  public analyze(indicators: BotIndicators): FilterResult {
    // Get bot detection result
    const botResult = this.botDetector.detect(indicators);

    // Get human detection result
    const humanResult = this.humanDetector.detect();

    // Merge results with weighted scoring
    const combinedScore = botResult.score * 0.6 + (1 - humanResult.score) * 0.4;

    return {
      isBot: combinedScore > 0.6,
      isHuman: combinedScore < 0.3,
      confidence: Math.max(botResult.confidence, humanResult.confidence),
      type: this.determineFinalType(combinedScore),
      score: combinedScore,
      reasons: [...new Set([...botResult.reasons, ...humanResult.reasons])],
      flaggedPatterns: [...new Set([...botResult.flaggedPatterns])],
    };
  }

  /**
   * Quick bot check using only available indicators
   */
  public quickBotCheck(userAgent?: string, ipAddress?: string): boolean {
    const indicators: BotIndicators = {
      userAgent,
      ipAddress,
    };

    const result = this.botDetector.detect(indicators);
    return result.isBot && result.confidence > 0.7;
  }

  /**
   * Quick human check based on recorded signals
   */
  public quickHumanCheck(): boolean {
    const result = this.humanDetector.detect();
    return result.isHuman && result.confidence > 0.6;
  }

  /**
   * Determine final entity type
   */
  private determineFinalType(score: number): 'bot' | 'human' | 'unknown' {
    if (score > 0.65) return 'bot';
    if (score < 0.35) return 'human';
    return 'unknown';
  }

  /**
   * Get detailed analysis report
   */
  public getDetailedReport(indicators: BotIndicators): string {
    const result = this.analyze(indicators);

    return `
═══════════════════════════════════════════════════════════
FILTERING ANALYSIS REPORT
═══════════════════════════════════════════════════════════

Entity Type: ${result.type.toUpperCase()}
Confidence: ${(result.confidence * 100).toFixed(2)}%
Score: ${(result.score * 100).toFixed(2)}%

Classification:
  - Is Bot: ${result.isBot}
  - Is Human: ${result.isHuman}

Detailed Reasons:
${result.reasons.map((r) => `  • ${r}`).join('\n')}

Flagged Patterns:
${result.flaggedPatterns.length > 0 ? result.flaggedPatterns.map((p) => `  ⚠️  ${p}`).join('\n') : '  None'}

Human Signals:
${this.formatHumanSignals()}

═══════════════════════════════════════════════════════════
    `;
  }

  /**
   * Format human signals for report
   */
  private formatHumanSignals(): string {
    const signals = this.humanDetector.getSignals();
    return `
  Mouse Movements: ${signals.mouseMovements}
  Key Presses: ${signals.keyPresses}
  Scroll Events: ${signals.scrollEvents}
  Typo Patterns: ${signals.typoPatterns ? 'Detected' : 'None'}
  Idle Time: ${signals.idleTime}ms
  Session Duration: ${signals.sessionDuration}ms
    `;
  }

  /**
   * Reset all detectors
   */
  public reset(): void {
    this.humanDetector.reset();
  }
}

export const filterEngine = new FilterEngine();
