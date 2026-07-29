'use client';

import { useEffect, useRef, useState } from 'react';
import { FilterResult, BotIndicators } from '@/lib/types/filter';
import { filterEngine } from '@/lib/filters/filterEngine';

export function useFilterEngine() {
  const [filterResult, setFilterResult] = useState<FilterResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const indicatorsRef = useRef<BotIndicators>({
    behavior: {
      automatedActions: false,
      rapidRequests: false,
      suspiciousClicks: false,
      noMouseMovement: true,
      noScrolling: true,
    },
  });

  /**
   * Initialize event listeners
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      filterEngine.humanDetector.recordMouseMovement(e);
      if (indicatorsRef.current.behavior) {
        indicatorsRef.current.behavior.noMouseMovement = false;
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      filterEngine.humanDetector.recordKeyPress(e);
    };

    const handleScroll = (e: WheelEvent) => {
      filterEngine.humanDetector.recordScroll(e);
      if (indicatorsRef.current.behavior) {
        indicatorsRef.current.behavior.noScrolling = false;
      }
    };

    const handleClick = () => {
      filterEngine.humanDetector.recordClick();
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('wheel', handleScroll);
    document.addEventListener('click', handleClick);

    // Get user agent
    indicatorsRef.current.userAgent = navigator.userAgent;

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('wheel', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  /**
   * Run analysis
   */
  const analyze = () => {
    setIsAnalyzing(true);
    try {
      const result = filterEngine.analyze(indicatorsRef.current);
      setFilterResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Get current result
   */
  const getCurrentResult = (): FilterResult | null => {
    if (!filterResult) {
      analyze();
    }
    return filterResult;
  };

  /**
   * Update indicators
   */
  const updateIndicators = (updates: Partial<BotIndicators>) => {
    indicatorsRef.current = { ...indicatorsRef.current, ...updates };
  };

  /**
   * Reset
   */
  const reset = () => {
    filterEngine.reset();
    setFilterResult(null);
    indicatorsRef.current = {
      behavior: {
        automatedActions: false,
        rapidRequests: false,
        suspiciousClicks: false,
        noMouseMovement: true,
        noScrolling: true,
      },
    };
  };

  return {
    filterResult,
    isAnalyzing,
    analyze,
    getCurrentResult,
    updateIndicators,
    reset,
  };
}
