/**
 * Maturity Journey Introduction
 * Visual storytelling component that explains the PM maturity assessment process
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { maturityTheme, getMaturityColor } from '@/lib/theme/maturity-portal-theme';
import { MaturityCard } from './MaturityCard';
import { MaturityScore } from './MaturityScore';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Sparkles,
  BarChart3,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Award,
  X
} from '@/components/ui/icons-shim';

interface MaturityJourneyIntroProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const journeySteps = [
  {
    id: 1,
    icon: Upload,
    title: 'Upload Your Documents',
    description: 'Share your project documentation - charters, plans, schedules, reports, and any PM artifacts.',
    detail: 'We accept PDFs, Word docs, Excel, and more. Our AI analyzes document structure, content quality, and completeness.',
    color: maturityTheme.colors.primary[400],
  },
  {
    id: 2,
    icon: Sparkles,
    title: 'AI Quality Analysis',
    description: 'Advanced AI evaluates document quality, identifies types, and extracts structured data.',
    detail: 'We analyze 14 types of PM artifacts including charters, scope statements, schedules, risk registers, and more. Each document receives a quality score based on completeness, clarity, and PM best practices.',
    color: maturityTheme.colors.info.text,
  },
  {
    id: 3,
    icon: BarChart3,
    title: 'Maturity Assessment',
    description: 'Your documentation is mapped to the 5 levels of Project Management Maturity.',
    detail: 'Based on PMBOK standards and industry best practices, we assess which maturity level your documentation demonstrates across 10 knowledge areas.',
    color: maturityTheme.colors.primary[400],
  },
  {
    id: 4,
    icon: Target,
    title: 'Gap Analysis',
    description: 'Discover what\'s missing or incomplete in your PM documentation.',
    detail: 'We identify gaps in your documentation, recommend improvements, and show you exactly what\'s needed to reach the next maturity level.',
    color: maturityTheme.colors.warning.text,
  },
  {
    id: 5,
    icon: TrendingUp,
    title: 'Actionable Insights',
    description: 'Get benchmarks, ROI calculations, and a roadmap to improve your PM maturity.',
    detail: 'Compare against industry benchmarks, understand the business value of improving maturity, and receive prioritized recommendations.',
    color: maturityTheme.colors.success.text,
  },
];

const maturityLevels = [
  {
    level: 1,
    name: 'Initial',
    description: 'Ad-hoc processes, inconsistent documentation',
    characteristics: [
      'Minimal or informal documentation',
      'No standard templates or processes',
      'Success depends on individual heroics',
      'Reactive approach to project management',
    ],
    color: maturityTheme.colors.maturity.level1.text,
  },
  {
    level: 2,
    name: 'Repeatable',
    description: 'Basic processes established, some standardization',
    characteristics: [
      'Basic project plans and schedules exist',
      'Some standard templates in use',
      'Prior success can be repeated',
      'Beginning to track costs and schedules',
    ],
    color: maturityTheme.colors.maturity.level2.text,
  },
  {
    level: 3,
    name: 'Defined',
    description: 'Standardized processes documented and integrated',
    characteristics: [
      'Comprehensive PM methodology documented',
      'Consistent use of standard templates',
      'Integrated across knowledge areas',
      'Organizational process assets established',
    ],
    color: maturityTheme.colors.maturity.level3.text,
  },
  {
    level: 4,
    name: 'Managed',
    description: 'Quantitatively controlled processes with metrics',
    characteristics: [
      'Detailed metrics and measurements',
      'Statistical process control',
      'Quality is quantitatively measured',
      'Performance is predictable',
    ],
    color: maturityTheme.colors.maturity.level4.text,
  },
  {
    level: 5,
    name: 'Optimizing',
    description: 'Continuous improvement and innovation',
    characteristics: [
      'Focus on continuous improvement',
      'Innovative practices adopted',
      'Lessons learned actively applied',
      'Organizational learning culture',
    ],
    color: maturityTheme.colors.maturity.level5.text,
  },
];

export const MaturityJourneyIntro: React.FC<MaturityJourneyIntroProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentView, setCurrentView] = useState<'welcome' | 'process' | 'maturity'>('welcome');
  const [selectedMaturityLevel, setSelectedMaturityLevel] = useState<number | null>(null);

  const handleNext = () => {
    if (currentView === 'welcome') {
      setCurrentView('process');
    } else if (currentView === 'process') {
      setCurrentView('maturity');
    } else {
      onComplete?.();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: `${maturityTheme.colors.background.primary}f0`,
        backdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Close Button */}
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="absolute top-4 right-4 z-10"
            style={{ color: maturityTheme.colors.text.secondary }}
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {/* Welcome View */}
        {currentView === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
              <MaturityCard variant="elevated" className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Award className="h-20 w-20 mx-auto mb-6" style={{ color: maturityTheme.colors.primary[400] }} />
                </motion.div>

                <h1 className="text-4xl font-bold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Welcome to PM Maturity Assessment
                </h1>
                
                <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: maturityTheme.colors.text.secondary }}>
                  Transform your project documentation into actionable insights about your organization's 
                  Project Management maturity level.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <MaturityCard variant="info">
                    <div className="p-6 text-center">
                      <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: maturityTheme.colors.info.text }} />
                      <h3 className="font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                        AI-Powered
                      </h3>
                      <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        Advanced AI analyzes your documents for quality and completeness
                      </p>
                    </div>
                  </MaturityCard>

                  <MaturityCard variant="success">
                    <div className="p-6 text-center">
                      <Target className="h-10 w-10 mx-auto mb-3" style={{ color: maturityTheme.colors.success.text }} />
                      <h3 className="font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                        PMBOK Aligned
                      </h3>
                      <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        Based on industry standards and best practices
                      </p>
                    </div>
                  </MaturityCard>

                  <MaturityCard variant="warning">
                    <div className="p-6 text-center">
                      <TrendingUp className="h-10 w-10 mx-auto mb-3" style={{ color: maturityTheme.colors.warning.text }} />
                      <h3 className="font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                        Actionable Results
                      </h3>
                      <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        Get specific recommendations to improve your maturity
                      </p>
                    </div>
                  </MaturityCard>
                </div>

                <Button
                  size="lg"
                  onClick={handleNext}
                  className="text-lg px-8"
                  style={{
                    backgroundColor: maturityTheme.colors.primary[500],
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  Learn How It Works <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </MaturityCard>
            </motion.div>
          )}

          {/* Process View */}
          {currentView === 'process' && (
            <motion.div
              key="process"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <MaturityCard variant="elevated" className="p-8">
                <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: maturityTheme.colors.text.primary }}>
                  The Assessment Journey
                </h2>
                <p className="text-center mb-8" style={{ color: maturityTheme.colors.text.secondary }}>
                  Follow these 5 steps to discover your PM maturity level
                </p>

                <div className="space-y-6">
                  {journeySteps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <MaturityCard variant="default" hover glow>
                        <div className="p-6 flex gap-6">
                          <div
                            className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: `${step.color}20`,
                              border: `2px solid ${step.color}`,
                            }}
                          >
                            <step.icon className="h-8 w-8" style={{ color: step.color }} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className="text-sm font-bold px-3 py-1 rounded-full"
                                style={{
                                  backgroundColor: `${step.color}20`,
                                  color: step.color,
                                }}
                              >
                                Step {step.id}
                              </span>
                              <h3 className="text-xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                                {step.title}
                              </h3>
                            </div>
                            <p className="text-base mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                              {step.description}
                            </p>
                            <p className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      </MaturityCard>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('welcome')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    style={{
                      backgroundColor: maturityTheme.colors.primary[500],
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    Understand Maturity Levels <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </MaturityCard>
            </motion.div>
          )}

          {/* Maturity Levels View */}
          {currentView === 'maturity' && (
            <motion.div
              key="maturity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <MaturityCard variant="elevated" className="p-8">
                <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: maturityTheme.colors.text.primary }}>
                  The 5 Levels of PM Maturity
                </h2>
                <p className="text-center mb-8" style={{ color: maturityTheme.colors.text.secondary }}>
                  Click each level to learn what it means for your organization
                </p>

                <div className="grid md:grid-cols-5 gap-4 mb-8">
                  {maturityLevels.map((level, index) => (
                    <motion.div
                      key={level.level}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedMaturityLevel(level.level)}
                      className="cursor-pointer"
                    >
                      <MaturityCard
                        variant={selectedMaturityLevel === level.level ? 'elevated' : 'default'}
                        hover
                        glow={selectedMaturityLevel === level.level}
                      >
                        <div className="p-4 text-center">
                          <MaturityScore
                            level={level.level as 1 | 2 | 3 | 4 | 5}
                            label={level.name}
                            size="sm"
                          />
                        </div>
                      </MaturityCard>
                    </motion.div>
                  ))}
                </div>

                {selectedMaturityLevel && (
                  <motion.div
                    key={selectedMaturityLevel}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <MaturityCard variant="info" glow>
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <MaturityScore
                            level={selectedMaturityLevel as 1 | 2 | 3 | 4 | 5}
                            label={maturityLevels[selectedMaturityLevel - 1].name}
                            size="md"
                          />
                          <div>
                            <h3 className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                              Level {selectedMaturityLevel}: {maturityLevels[selectedMaturityLevel - 1].name}
                            </h3>
                            <p style={{ color: maturityTheme.colors.text.secondary }}>
                              {maturityLevels[selectedMaturityLevel - 1].description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold mb-3" style={{ color: maturityTheme.colors.text.primary }}>
                            Key Characteristics:
                          </h4>
                          {maturityLevels[selectedMaturityLevel - 1].characteristics.map((char, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <CheckCircle
                                className="h-5 w-5 mt-0.5 flex-shrink-0"
                                style={{ color: maturityLevels[selectedMaturityLevel - 1].color }}
                              />
                              <span style={{ color: maturityTheme.colors.text.secondary }}>{char}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </MaturityCard>
                  </motion.div>
                )}

                {!selectedMaturityLevel && (
                  <div className="text-center py-8" style={{ color: maturityTheme.colors.text.muted }}>
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Click on a maturity level above to learn more</p>
                  </div>
                )}

                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('process')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    style={{
                      backgroundColor: maturityTheme.colors.success.text,
                      color: maturityTheme.colors.background.primary,
                    }}
                  >
                    Start Your Assessment <CheckCircle className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </MaturityCard>
            </motion.div>
          )}
      </motion.div>
    </motion.div>
  );
};
