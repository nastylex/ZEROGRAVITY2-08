'use client';

import React, { useEffect, useState } from 'react';
import { useFilterEngine } from '@/hooks/useFilterEngine';
import { FilterResult } from '@/lib/types/filter';
import { AlertCircle, CheckCircle2, HelpCircle, Bot, User } from 'lucide-react';

export function FilterInterface() {
  const {
    filterResult,
    isAnalyzing,
    analyze,
    getCurrentResult,
    reset,
  } = useFilterEngine();

  const [displayResult, setDisplayResult] = useState<FilterResult | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  /**
   * Auto-analyze on mount
   */
  useEffect(() => {
    if (autoAnalyze) {
      const timer = setTimeout(() => {
        analyze();
      }, 2000); // Wait 2 seconds for user interactions

      return () => clearTimeout(timer);
    }
  }, [autoAnalyze, analyze]);

  /**
   * Update display result when filter result changes
   */
  useEffect(() => {
    if (filterResult) {
      setDisplayResult(filterResult);
    }
  }, [filterResult]);

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'bot':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'human':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bot':
        return <Bot className="w-5 h-5" />;
      case 'human':
        return <User className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  const getConfidenceBadge = (confidence: number): React.ReactNode => {
    if (confidence > 0.8) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          High Confidence
        </span>
      );
    }
    if (confidence > 0.6) {
      return (
        <span className="flex items-center gap-1 text-yellow-600">
          <AlertCircle className="w-4 h-4" />
          Medium Confidence
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-600">
        <HelpCircle className="w-4 h-4" />
        Low Confidence
      </span>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Filtering System</h1>
        <p className="text-gray-600">Bot & Human Detection Interface</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={analyze}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Reset
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Auto-Analyze</span>
        </label>
      </div>

      {/* Results */}
      {displayResult ? (
        <div className="space-y-4">
          {/* Type Card */}
          <div className={`p-6 rounded-lg border-2 ${getTypeColor(displayResult.type)}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">{getTypeIcon(displayResult.type)}</div>
                <div>
                  <h2 className="text-2xl font-bold capitalize">{displayResult.type}</h2>
                  <p className="text-sm opacity-75 mt-1">
                    Classification based on behavioral analysis
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {(displayResult.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs opacity-75">Confidence</div>
              </div>
            </div>
          </div>

          {/* Confidence Badge */}
          <div className="flex justify-center">
            {getConfidenceBadge(displayResult.confidence)}
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600">Overall Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {(displayResult.score * 100).toFixed(1)}%
              </div>
            </div>
            <div className={`p-4 rounded-lg border-2 ${displayResult.isBot ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-sm text-gray-600">Is Bot</div>
              <div className="text-2xl font-bold">
                {displayResult.isBot ? '✓' : '✗'}
              </div>
            </div>
            <div className={`p-4 rounded-lg border-2 ${displayResult.isHuman ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-sm text-gray-600">Is Human</div>
              <div className="text-2xl font-bold">
                {displayResult.isHuman ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Reasons */}
          {displayResult.reasons.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-3">Analysis Reasons</h3>
              <ul className="space-y-2">
                {displayResult.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-500 mt-1">■</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Flagged Patterns */}
          {displayResult.flaggedPatterns.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-3 text-red-800">⚠️ Flagged Patterns</h3>
              <div className="flex flex-wrap gap-2">
                {displayResult.flaggedPatterns.map((pattern, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-500">
            {isAnalyzing ? (
              <>
                <div className="inline-block animate-spin mb-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
                <p>Analyzing your behavior...</p>
              </>
            ) : (
              <p>Click "Analyze" or interact with the page to start analysis</p>
            )}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Monitors mouse movements, keyboard input, and scrolling</li>
          <li>• Analyzes user agent and request patterns</li>
          <li>• Detects automated behaviors and timing anomalies</li>
          <li>• Provides confidence scores for bot/human classification</li>
        </ul>
      </div>
    </div>
  );
}
