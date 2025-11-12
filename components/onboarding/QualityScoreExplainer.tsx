/**
 * Quality Score Explainer Component
 * Transparent breakdown of how document quality scores are calculated
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { MaturityCard } from './MaturityCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  FileText,
  Award,
  Target,
  Sparkles,
  BarChart3
} from '@/components/ui/icons-shim';

interface ScoreCriterion {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
  details: string[];
  strengths: string[];
  improvements: string[];
}

interface QualityScoreExplainerProps {
  documentName: string;
  overallScore: number;
  criteria: ScoreCriterion[];
  documentType: string;
  maturityLevel?: number;
}

export const QualityScoreExplainer: React.FC<QualityScoreExplainerProps> = ({
  documentName,
  overallScore,
  criteria,
  documentType,
  maturityLevel = 3,
}) => {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return maturityTheme.colors.maturity.level5.text;
    if (score >= 70) return maturityTheme.colors.maturity.level4.text;
    if (score >= 60) return maturityTheme.colors.maturity.level3.text;
    if (score >= 50) return maturityTheme.colors.maturity.level2.text;
    return maturityTheme.colors.maturity.level1.text;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', icon: Award };
    if (score >= 70) return { label: 'Good', icon: CheckCircle };
    if (score >= 60) return { label: 'Adequate', icon: Info };
    if (score >= 50) return { label: 'Basic', icon: AlertCircle };
    return { label: 'Needs Improvement', icon: Target };
  };

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const scoreInfo = getScoreLabel(overallScore);
  const ScoreIcon = scoreInfo.icon;

  return (
    <MaturityCard variant="elevated" className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" style={{ color: maturityTheme.colors.primary[400] }} />
            <div>
              <h3 className="text-xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                {documentName}
              </h3>
              <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                {documentType}
              </p>
            </div>
          </div>
          <div
            className="text-lg px-4 py-2 rounded-lg font-bold"
            style={{
              backgroundColor: `${getScoreColor(overallScore)}20`,
              color: getScoreColor(overallScore),
              border: `1px solid ${getScoreColor(overallScore)}`,
            }}
          >
            {overallScore}/100
          </div>
        </div>

        {/* Overall Score Visualization */}
        <MaturityCard variant="info" className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <ScoreIcon className="h-8 w-8" style={{ color: getScoreColor(overallScore) }} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                  Quality Score: {scoreInfo.label}
                </span>
                <span className="text-2xl font-bold" style={{ color: getScoreColor(overallScore) }}>
                  {overallScore}%
                </span>
              </div>
              <Progress value={overallScore} className="h-3" />
            </div>
          </div>
          <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
            This score represents the overall quality and completeness of your document based on {criteria.length} key criteria.
          </p>
        </MaturityCard>
      </div>

      {/* How This Score Was Calculated */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" style={{ color: maturityTheme.colors.primary[400] }} />
          <h4 className="text-lg font-bold" style={{ color: maturityTheme.colors.text.primary }}>
            How This Score Was Calculated
          </h4>
        </div>

        <div className="space-y-3">
          {criteria.map((criterion, index) => {
            const percentage = (criterion.score / criterion.maxScore) * 100;
            const weightPercentage = (criterion.weight / totalWeight) * 100;
            const isExpanded = expandedCriterion === criterion.name;

            return (
              <motion.div
                key={criterion.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setExpandedCriterion(isExpanded ? null : criterion.name)}
                className="cursor-pointer"
              >
                <MaturityCard
                  variant="default"
                  hover
                >
                  <div className="p-4">
                    {/* Criterion Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${getScoreColor(percentage)}20`,
                            border: `2px solid ${getScoreColor(percentage)}`,
                          }}
                        >
                          <span className="font-bold text-sm" style={{ color: getScoreColor(percentage) }}>
                            {Math.round(percentage)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                              {criterion.name}
                            </h5>
                            <span
                              className="text-xs px-2 py-0.5 rounded border"
                              style={{
                                color: maturityTheme.colors.text.muted,
                                borderColor: maturityTheme.colors.border.default,
                              }}
                            >
                              {weightPercentage.toFixed(0)}% weight
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                            {criterion.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold" style={{ color: getScoreColor(percentage) }}>
                          {criterion.score}/{criterion.maxScore}
                        </div>
                        <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          points
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={percentage} className="h-2 mb-3" />

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t space-y-4"
                        style={{ borderColor: maturityTheme.colors.border.default }}
                      >
                        {/* Calculation Details */}
                        <div>
                          <h6 className="font-semibold mb-2 flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                            <Info className="h-4 w-4" />
                            What We Evaluated
                          </h6>
                          <ul className="space-y-1">
                            {criterion.details.map((detail, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                <span style={{ color: maturityTheme.colors.primary[400] }}>•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Strengths */}
                        {criterion.strengths.length > 0 && (
                          <div>
                            <h6 className="font-semibold mb-2 flex items-center gap-2" style={{ color: maturityTheme.colors.success.text }}>
                              <CheckCircle className="h-4 w-4" />
                              Strengths Found
                            </h6>
                            <ul className="space-y-1">
                              {criterion.strengths.map((strength, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvements */}
                        {criterion.improvements.length > 0 && (
                          <div>
                            <h6 className="font-semibold mb-2 flex items-center gap-2" style={{ color: maturityTheme.colors.warning.text }}>
                              <TrendingUp className="h-4 w-4" />
                              How to Improve
                            </h6>
                            <ul className="space-y-1">
                              {criterion.improvements.map((improvement, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                  <Target className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.warning.text }} />
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Weight Impact */}
                        <div
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: `${maturityTheme.colors.primary[500]}10` }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4" style={{ color: maturityTheme.colors.primary[400] }} />
                            <span className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                              Impact on Overall Score
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                            This criterion contributes <strong>{weightPercentage.toFixed(1)}%</strong> to your overall score.
                            Your score of <strong>{criterion.score}/{criterion.maxScore}</strong> adds approximately{' '}
                            <strong style={{ color: getScoreColor(percentage) }}>
                              {((criterion.score / criterion.maxScore) * weightPercentage).toFixed(1)} points
                            </strong>{' '}
                            to your total quality score.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Click to expand hint */}
                    {!isExpanded && (
                      <div className="text-center mt-2">
                        <span className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          Click to see detailed breakdown
                        </span>
                      </div>
                    )}
                  </div>
                </MaturityCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Final Calculation Summary */}
      <MaturityCard variant="success" className="p-4">
        <div className="flex items-start gap-3">
          <Award className="h-6 w-6 mt-1" style={{ color: maturityTheme.colors.success.text }} />
          <div>
            <h5 className="font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
              Final Score Calculation
            </h5>
            <div className="space-y-2 text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
              <p>
                Your overall quality score of <strong style={{ color: getScoreColor(overallScore) }}>{overallScore}/100</strong> is calculated
                as a weighted average of all {criteria.length} criteria above.
              </p>
              <div className="font-mono text-xs p-2 rounded" style={{ backgroundColor: maturityTheme.colors.background.primary }}>
                {criteria.map((c, idx) => (
                  <div key={idx}>
                    ({c.score}/{c.maxScore} × {((c.weight / totalWeight) * 100).toFixed(0)}%)
                    {idx < criteria.length - 1 && ' + '}
                  </div>
                ))}
                <div className="mt-1 pt-1 border-t" style={{ borderColor: maturityTheme.colors.border.default }}>
                  = {overallScore}/100
                </div>
              </div>
              <p className="pt-2">
                This transparent calculation ensures you understand exactly how your score was determined and where to focus
                improvement efforts.
              </p>
            </div>
          </div>
        </div>
      </MaturityCard>
    </MaturityCard>
  );
};
