/**
 * Maturity Journey Planner
 * Interactive roadmap showing path from current to desired maturity level
 * with effort estimates, cost projections, and detailed requirements
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { MaturityCard } from './MaturityCard';
import { MaturityScore } from './MaturityScore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  ArrowRight,
  Award,
  Sparkles,
  AlertCircle,
  Info,
  Calendar
} from '@/components/ui/icons-shim';

interface MaturityRequirement {
  category: string;
  items: string[];
  effort: string;
  cost: string;
}

interface MaturityLevelDetails {
  level: number;
  name: string;
  description: string;
  achievements: string[];
  requirements: MaturityRequirement[];
  estimatedEffort: {
    weeks: number;
    fte: number;
    description: string;
  };
  estimatedCost: {
    min: number;
    max: number;
    breakdown: { item: string; cost: string }[];
  };
  roi: {
    benefits: string[];
    timeToValue: string;
  };
}

interface MaturityJourneyPlannerProps {
  currentLevel: number;
  currentLevelName: string;
  achievementsAtCurrentLevel: string[];
  onSelectTargetLevel?: (level: number) => void;
}

const maturityLevelData: MaturityLevelDetails[] = [
  {
    level: 1,
    name: 'Initial',
    description: 'Ad-hoc, chaotic processes',
    achievements: [
      'Project work is being done',
      'Some documentation exists',
      'Team members have PM knowledge',
    ],
    requirements: [],
    estimatedEffort: { weeks: 0, fte: 0, description: 'Current state' },
    estimatedCost: { min: 0, max: 0, breakdown: [] },
    roi: { benefits: [], timeToValue: 'N/A' },
  },
  {
    level: 2,
    name: 'Repeatable',
    description: 'Basic PM processes established',
    achievements: [
      'Consistent project planning',
      'Basic templates in use',
      'Repeatable success patterns',
      'Cost and schedule tracking',
    ],
    requirements: [
      {
        category: 'Documentation',
        items: [
          'Create standard project charter template',
          'Develop basic schedule templates',
          'Establish budget tracking spreadsheets',
          'Define risk register format',
        ],
        effort: '2-3 weeks',
        cost: '$5K-$10K',
      },
      {
        category: 'Process',
        items: [
          'Define project initiation process',
          'Establish weekly status meeting cadence',
          'Create change request procedure',
        ],
        effort: '1-2 weeks',
        cost: '$3K-$5K',
      },
      {
        category: 'Training',
        items: [
          'Basic PM training for team (16 hours)',
          'Tool training for templates',
        ],
        effort: '1 week',
        cost: '$2K-$4K',
      },
    ],
    estimatedEffort: {
      weeks: 6,
      fte: 0.5,
      description: '1 PM working half-time for 6 weeks',
    },
    estimatedCost: {
      min: 10000,
      max: 19000,
      breakdown: [
        { item: 'Template Development', cost: '$5K-$10K' },
        { item: 'Process Documentation', cost: '$3K-$5K' },
        { item: 'Training & Change Management', cost: '$2K-$4K' },
      ],
    },
    roi: {
      benefits: [
        '15-20% reduction in project delays',
        'Improved team coordination',
        'Better visibility into project status',
        'Reduced rework from miscommunication',
      ],
      timeToValue: '3-4 months',
    },
  },
  {
    level: 3,
    name: 'Defined',
    description: 'Standardized, integrated processes',
    achievements: [
      'Comprehensive PM methodology',
      'Integrated across knowledge areas',
      'Organizational process assets',
      'Consistent quality standards',
    ],
    requirements: [
      {
        category: 'Methodology',
        items: [
          'Develop comprehensive PM methodology document',
          'Create integrated process workflows',
          'Define all 10 knowledge area processes',
          'Establish quality gates and reviews',
        ],
        effort: '8-10 weeks',
        cost: '$25K-$40K',
      },
      {
        category: 'Tools & Systems',
        items: [
          'Implement PM software (e.g., MS Project, Jira)',
          'Set up document management system',
          'Configure dashboards and reporting',
        ],
        effort: '4-6 weeks',
        cost: '$15K-$30K',
      },
      {
        category: 'Governance',
        items: [
          'Establish PMO or governance structure',
          'Define roles and responsibilities',
          'Create project portfolio management process',
        ],
        effort: '4-5 weeks',
        cost: '$10K-$20K',
      },
      {
        category: 'Training & Certification',
        items: [
          'Advanced PM training (40 hours)',
          'Sponsor 2-3 PMP certifications',
          'Methodology onboarding for all PMs',
        ],
        effort: '3-4 weeks',
        cost: '$15K-$25K',
      },
    ],
    estimatedEffort: {
      weeks: 20,
      fte: 1.5,
      description: '1-2 PMs working full-time for 5 months',
    },
    estimatedCost: {
      min: 65000,
      max: 115000,
      breakdown: [
        { item: 'Methodology Development', cost: '$25K-$40K' },
        { item: 'Tools & Implementation', cost: '$15K-$30K' },
        { item: 'Governance Structure', cost: '$10K-$20K' },
        { item: 'Training & Certification', cost: '$15K-$25K' },
      ],
    },
    roi: {
      benefits: [
        '25-30% improvement in on-time delivery',
        '20-25% reduction in budget overruns',
        'Standardized quality across projects',
        'Improved stakeholder satisfaction',
        'Better resource allocation',
      ],
      timeToValue: '6-9 months',
    },
  },
  {
    level: 4,
    name: 'Managed',
    description: 'Quantitatively controlled with metrics',
    achievements: [
      'Detailed metrics and KPIs',
      'Statistical process control',
      'Predictable performance',
      'Data-driven decisions',
    ],
    requirements: [
      {
        category: 'Metrics & Analytics',
        items: [
          'Define comprehensive KPI framework',
          'Implement earned value management',
          'Set up predictive analytics',
          'Create executive dashboards',
        ],
        effort: '10-12 weeks',
        cost: '$40K-$60K',
      },
      {
        category: 'Advanced Tools',
        items: [
          'Implement PPM tool (e.g., Clarity, Planview)',
          'Set up BI/analytics platform',
          'Integrate with financial systems',
          'Deploy automated reporting',
        ],
        effort: '12-16 weeks',
        cost: '$50K-$100K',
      },
      {
        category: 'Process Optimization',
        items: [
          'Conduct process maturity assessments',
          'Implement Six Sigma principles',
          'Establish quality metrics',
          'Create performance baselines',
        ],
        effort: '8-10 weeks',
        cost: '$30K-$50K',
      },
      {
        category: 'Capability Building',
        items: [
          'Advanced analytics training',
          'Six Sigma certification (2-3 people)',
          'Data-driven PM workshops',
        ],
        effort: '6-8 weeks',
        cost: '$20K-$35K',
      },
    ],
    estimatedEffort: {
      weeks: 36,
      fte: 2,
      description: '2 full-time PMs plus analyst support for 9 months',
    },
    estimatedCost: {
      min: 140000,
      max: 245000,
      breakdown: [
        { item: 'Metrics & KPI Framework', cost: '$40K-$60K' },
        { item: 'Advanced Tooling', cost: '$50K-$100K' },
        { item: 'Process Optimization', cost: '$30K-$50K' },
        { item: 'Training & Certification', cost: '$20K-$35K' },
      ],
    },
    roi: {
      benefits: [
        '35-40% improvement in project success rate',
        '30-35% reduction in cost variances',
        'Predictable delivery timelines',
        'Proactive risk management',
        'Optimized resource utilization',
        'Data-backed decision making',
      ],
      timeToValue: '12-15 months',
    },
  },
  {
    level: 5,
    name: 'Optimizing',
    description: 'Continuous improvement culture',
    achievements: [
      'Innovation-driven practices',
      'Organizational learning',
      'Industry leadership',
      'Sustainable excellence',
    ],
    requirements: [
      {
        category: 'Innovation & Improvement',
        items: [
          'Establish continuous improvement program',
          'Implement AI/ML for project forecasting',
          'Create lessons learned knowledge base',
          'Deploy automated optimization',
        ],
        effort: '16-20 weeks',
        cost: '$80K-$120K',
      },
      {
        category: 'Strategic Alignment',
        items: [
          'Link projects to strategic objectives',
          'Implement value realization tracking',
          'Create strategic portfolio optimization',
          'Deploy OKR framework',
        ],
        effort: '10-12 weeks',
        cost: '$50K-$80K',
      },
      {
        category: 'Advanced Capabilities',
        items: [
          'AI-powered project insights',
          'Predictive risk analytics',
          'Automated resource optimization',
          'Real-time collaboration platforms',
        ],
        effort: '20-24 weeks',
        cost: '$100K-$180K',
      },
      {
        category: 'Culture & Excellence',
        items: [
          'Executive coaching program',
          'PMO Center of Excellence',
          'Industry conference participation',
          'Thought leadership development',
        ],
        effort: '12-16 weeks',
        cost: '$40K-$70K',
      },
    ],
    estimatedEffort: {
      weeks: 58,
      fte: 2.5,
      description: '2-3 senior PMs plus specialists for 14 months',
    },
    estimatedCost: {
      min: 270000,
      max: 450000,
      breakdown: [
        { item: 'Innovation Programs', cost: '$80K-$120K' },
        { item: 'Strategic Alignment', cost: '$50K-$80K' },
        { item: 'Advanced Technology', cost: '$100K-$180K' },
        { item: 'Culture & Excellence', cost: '$40K-$70K' },
      ],
    },
    roi: {
      benefits: [
        '45-50% project success rate improvement',
        '40-45% faster time-to-market',
        'Industry-leading efficiency',
        'Competitive advantage through PM excellence',
        'Sustainable organizational capability',
        'Measurable business value realization',
        'Attraction and retention of top PM talent',
      ],
      timeToValue: '18-24 months',
    },
  },
];

export const MaturityJourneyPlanner: React.FC<MaturityJourneyPlannerProps> = ({
  currentLevel,
  currentLevelName,
  achievementsAtCurrentLevel,
  onSelectTargetLevel,
}) => {
  const [targetLevel, setTargetLevel] = useState<number>(Math.min(5, currentLevel + 1));
  const [showDetails, setShowDetails] = useState(false);
  // Store the current level when target is selected to calculate progress from that point
  // This gets reset whenever the user selects a new target level
  const [journeyStartLevel, setJourneyStartLevel] = useState<number>(currentLevel);
  
  // Update journey start level when target changes - reset to current level at that moment
  useEffect(() => {
    // When target level changes, reset the journey start to the current level
    setJourneyStartLevel(currentLevel);
  }, [targetLevel]); // Only reset when target changes, not when currentLevel changes

  const handleSelectLevel = (level: number) => {
    setTargetLevel(level);
    // Reset journey start to current level when selecting new target
    setJourneyStartLevel(currentLevel);
    onSelectTargetLevel?.(level);
  };

  const getLevelData = (level: number) => maturityLevelData[level - 1];
  const currentData = getLevelData(currentLevel);
  const targetData = getLevelData(targetLevel);

  // Helper to get maturity colors safely
  const getMaturityColors = (level: number) => {
    const key = `level${level}` as keyof typeof maturityTheme.colors.maturity;
    return maturityTheme.colors.maturity[key];
  };

  // Calculate cumulative effort and cost from current to target
  const calculateJourney = () => {
    const levels = [];
    for (let i = currentLevel + 1; i <= targetLevel; i++) {
      levels.push(getLevelData(i));
    }
    
    const totalWeeks = levels.reduce((sum, l) => sum + l.estimatedEffort.weeks, 0);
    const totalCostMin = levels.reduce((sum, l) => sum + l.estimatedCost.min, 0);
    const totalCostMax = levels.reduce((sum, l) => sum + l.estimatedCost.max, 0);
    
    return { levels, totalWeeks, totalCostMin, totalCostMax };
  };

  const journey = calculateJourney();
  
  // Calculate progress from journeyStartLevel (current level when target was selected) to targetLevel
  // When user selects a target level, journeyStartLevel is set to the current level at that moment
  // Progress shows how far along you are from that starting point to the target
  // 
  // Example: If currentLevel is 2.0 and user selects targetLevel 5:
  // - journeyStartLevel = 2.0 (set when target was selected)
  // - Total journey: from level 2.0 to level 5 = 3 levels
  // - If currentLevel is still 2.0: completed 0.0 out of 3 levels = 0%
  // - If currentLevel progresses to 2.5: completed 0.5 out of 3 levels = 16.67%
  // - If currentLevel progresses to 3.0: completed 1.0 out of 3 levels = 33.33%
  // - If currentLevel reaches 5.0: completed 3.0 out of 3 levels = 100%
  const calculateProgressPercentage = () => {
    if (targetLevel <= journeyStartLevel) {
      return 100; // Already reached or exceeded target
    }
    
    // Total journey from start (when target was selected) to target
    const totalJourney = targetLevel - journeyStartLevel;
    
    // Calculate how much progress has been made from journeyStartLevel to currentLevel
    const completedJourney = currentLevel - journeyStartLevel;
    
    // Progress = (completed / total) * 100
    const progress = totalJourney > 0 ? (completedJourney / totalJourney) * 100 : 0;
    
    return Math.max(0, Math.min(100, progress));
  };
  
  const progressPercentage = calculateProgressPercentage();

  return (
    <div className="space-y-6">
      {/* Current State Celebration */}
      <MaturityCard variant="success" className="p-6">
        <div className="flex items-start gap-4">
          <Award className="h-12 w-12 flex-shrink-0" style={{ color: getMaturityColors(currentLevel).text }} />
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
              Congratulations! You're at Level {currentLevel}: {currentLevelName}
            </h3>
            <p className="mb-4" style={{ color: maturityTheme.colors.text.secondary }}>
              Your organization has achieved significant PM maturity. Here's what you've accomplished:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {achievementsAtCurrentLevel.map((achievement, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: maturityTheme.colors.success.text }}
                  />
                  <span style={{ color: maturityTheme.colors.text.secondary }}>{achievement}</span>
                </div>
              ))}
            </div>
          </div>
          <MaturityScore level={currentLevel as 1 | 2 | 3 | 4 | 5} label={currentLevelName} size="lg" />
        </div>
      </MaturityCard>

      {/* Journey Progress */}
      <MaturityCard variant="elevated" className="p-6">
        <h3 className="text-xl font-bold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
          Your Maturity Journey
        </h3>
        
        {/* Level Selector */}
        <div className="flex items-center justify-between mb-6 gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`flex-1 cursor-pointer transition-all ${
                level === targetLevel ? 'scale-110' : level < currentLevel ? 'opacity-50' : ''
              }`}
              onClick={() => level > currentLevel && handleSelectLevel(level)}
            >
              <MaturityCard
                variant={level === targetLevel ? 'info' : level <= currentLevel ? 'success' : 'default'}
                hover={level > currentLevel}
                glow={level === targetLevel}
              >
                <div className="p-3 text-center">
                  <MaturityScore
                    level={level as 1 | 2 | 3 | 4 | 5}
                    label={maturityLevelData[level - 1].name}
                    size="sm"
                  />
                  {level === currentLevel && (
                    <div className="mt-2">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: maturityTheme.colors.success.bg,
                          color: maturityTheme.colors.success.text,
                        }}
                      >
                        Current
                      </span>
                    </div>
                  )}
                  {level === targetLevel && level > currentLevel && (
                    <div className="mt-2">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: maturityTheme.colors.info.bg,
                          color: maturityTheme.colors.info.text,
                        }}
                      >
                        Target
                      </span>
                    </div>
                  )}
                </div>
              </MaturityCard>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: maturityTheme.colors.text.secondary }}>
              Journey to Level {targetLevel}
            </span>
            <span className="text-sm font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {targetLevel > currentLevel && (
          <div className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
            Click on a level above to explore the journey to that maturity level
          </div>
        )}
      </MaturityCard>

      {/* Journey Summary */}
      {targetLevel > currentLevel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MaturityCard variant="info" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6" style={{ color: maturityTheme.colors.info.text }} />
              <h3 className="text-xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                Path from Level {currentLevel} to Level {targetLevel}
              </h3>
            </div>

            {/* High-Level Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.primary }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5" style={{ color: maturityTheme.colors.warning.text }} />
                  <span className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    Timeline
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>
                  {journey.totalWeeks} weeks
                </div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                  ≈ {Math.round(journey.totalWeeks / 4)} months
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.primary }}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5" style={{ color: maturityTheme.colors.primary[400] }} />
                  <span className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    Investment
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
                  ${(journey.totalCostMin / 1000).toFixed(0)}K-${(journey.totalCostMax / 1000).toFixed(0)}K
                </div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                  Total estimated cost
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.primary }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                  <span className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    ROI Timeline
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                  {targetData.roi.timeToValue}
                </div>
                <div className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                  To realize value
                </div>
              </div>
            </div>

            {/* Show Details Toggle */}
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              className="w-full mb-4"
            >
              {showDetails ? 'Hide' : 'Show'} Detailed Roadmap
              <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </Button>

            {/* Detailed Roadmap */}
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
              >
                {journey.levels.map((levelData, idx) => (
                  <MaturityCard key={levelData.level} variant="default" className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                        style={{
                          backgroundColor: getMaturityColors(levelData.level).bg,
                          color: getMaturityColors(levelData.level).text,
                          border: `2px solid ${getMaturityColors(levelData.level).border}`,
                        }}
                      >
                        {levelData.level}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                          Level {levelData.level}: {levelData.name}
                        </h4>
                        <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          {levelData.description}
                        </p>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-4 mb-4">
                      <h5 className="font-semibold flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <CheckCircle className="h-4 w-4" />
                        What You Need to Achieve
                      </h5>
                      {levelData.requirements.map((req, reqIdx) => (
                        <div
                          key={reqIdx}
                          className="p-4 rounded-lg"
                          style={{ backgroundColor: maturityTheme.colors.background.primary }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                              {req.category}
                            </h6>
                            <div className="flex gap-4 text-sm">
                              <span style={{ color: maturityTheme.colors.text.muted }}>
                                <Clock className="h-4 w-4 inline mr-1" />
                                {req.effort}
                              </span>
                              <span style={{ color: maturityTheme.colors.text.muted }}>
                                <DollarSign className="h-4 w-4 inline mr-1" />
                                {req.cost}
                              </span>
                            </div>
                          </div>
                          <ul className="space-y-1">
                            {req.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                <span style={{ color: maturityTheme.colors.primary[400] }}>•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Cost Breakdown */}
                    <div
                      className="p-4 rounded-lg mb-4"
                      style={{ backgroundColor: `${maturityTheme.colors.primary[500]}10` }}
                    >
                      <h5 className="font-semibold mb-3 flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <DollarSign className="h-5 w-5" />
                        Investment Breakdown
                      </h5>
                      <div className="space-y-2">
                        {levelData.estimatedCost.breakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span style={{ color: maturityTheme.colors.text.secondary }}>{item.item}</span>
                            <span className="font-semibold" style={{ color: maturityTheme.colors.primary[400] }}>
                              {item.cost}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 mt-2 border-t flex items-center justify-between font-bold" style={{ borderColor: maturityTheme.colors.border.default }}>
                          <span style={{ color: maturityTheme.colors.text.primary }}>Total</span>
                          <span style={{ color: maturityTheme.colors.primary[400] }}>
                            ${(levelData.estimatedCost.min / 1000).toFixed(0)}K-${(levelData.estimatedCost.max / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expected Benefits */}
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: `${maturityTheme.colors.success.text}10` }}
                    >
                      <h5 className="font-semibold mb-3 flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <Sparkles className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                        Expected Benefits & ROI
                      </h5>
                      <div className="grid md:grid-cols-2 gap-3">
                        {levelData.roi.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle
                              className="h-4 w-4 mt-0.5 flex-shrink-0"
                              style={{ color: maturityTheme.colors.success.text }}
                            />
                            <span className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                              {benefit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </MaturityCard>
                ))}
              </motion.div>
            )}
          </MaturityCard>
        </motion.div>
      )}

      {/* Call to Action */}
      {targetLevel > currentLevel && (
        <MaturityCard variant="elevated" className="p-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.primary[400] }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
            Ready to Begin Your Journey to Level {targetLevel}?
          </h3>
          <p className="mb-6 max-w-2xl mx-auto" style={{ color: maturityTheme.colors.text.secondary }}>
            Our experts can help you create a customized roadmap, prioritize investments, and guide your organization
            through this transformation.
          </p>
          <Button
            size="lg"
            style={{
              backgroundColor: maturityTheme.colors.primary[500],
              color: maturityTheme.colors.text.primary,
            }}
          >
            Schedule a Consultation
            <Calendar className="ml-2 h-5 w-5" />
          </Button>
        </MaturityCard>
      )}
    </div>
  );
};
