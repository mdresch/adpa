'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import {
  BarChart3,
  FileText,
  Target,
  TrendingUp,
  ArrowRight,
  Play,
  Sparkles,
} from 'lucide-react';

// Sample data for the demo
const sampleData = {
  maturityLevel: 3.5,
  maturityLabel: 'Defined',
  qualityScore: 72,
  documentCount: 12,
  gapsCount: 8,
  topDomains: [
    { name: 'Delivery', score: 4.6, color: maturityTheme.colors.success.text },
    { name: 'Team', score: 4.2, color: maturityTheme.colors.success.text },
    { name: 'Planning', score: 3.5, color: maturityTheme.colors.warning.text },
    { name: 'Stakeholders', score: 3.2, color: maturityTheme.colors.warning.text },
  ],
  topGaps: [
    'Quality Management Plan needs improvement',
    'Risk Register missing key risks',
    'Stakeholder analysis incomplete',
  ],
};

export function InteractiveDemo() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleTryNow = () => {
    router.push('/onboarding/sample-results');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="w-full"
    >
      <Card
        className="overflow-hidden border-2 transition-all duration-300"
        style={{
          backgroundColor: maturityTheme.colors.background.elevated,
          borderColor: isHovered ? maturityTheme.colors.primary[400] : maturityTheme.colors.border.default,
          boxShadow: isHovered ? `0 10px 40px ${maturityTheme.colors.primary[500]}20` : undefined,
        }}
      >
        <CardHeader className="relative">
          <div className="absolute top-4 right-4">
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
              style={{
                backgroundColor: maturityTheme.colors.info.bg,
                color: maturityTheme.colors.info.text,
              }}
            >
              <Sparkles className="h-3 w-3" />
              Interactive Demo
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl" style={{ color: maturityTheme.colors.text.primary }}>
            <Play className="h-6 w-6" style={{ color: maturityTheme.colors.primary[400] }} />
            See Your Assessment Results
          </CardTitle>
          <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
            Preview what your maturity assessment will look like with sample data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
              <div className="text-3xl font-bold mb-1" style={{ color: maturityTheme.colors.primary[400] }}>
                {sampleData.maturityLevel.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                Maturity Level
              </div>
              <Badge
                variant="outline"
                className="mt-2 text-xs"
                style={{
                  borderColor: maturityTheme.colors.primary[400],
                  color: maturityTheme.colors.primary[400],
                }}
              >
                {sampleData.maturityLabel}
              </Badge>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
              <div className="text-3xl font-bold mb-1" style={{ color: maturityTheme.colors.success.text }}>
                {sampleData.qualityScore}%
              </div>
              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                Quality Score
              </div>
              <Progress value={sampleData.qualityScore} className="mt-2 h-2" />
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
              <div className="text-3xl font-bold mb-1 flex items-center justify-center gap-1" style={{ color: maturityTheme.colors.info.text }}>
                <FileText className="h-5 w-5" />
                {sampleData.documentCount}
              </div>
              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                Documents
              </div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
              <div className="text-3xl font-bold mb-1 flex items-center justify-center gap-1" style={{ color: maturityTheme.colors.warning.text }}>
                <Target className="h-5 w-5" />
                {sampleData.gapsCount}
              </div>
              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                Gaps Found
              </div>
            </div>
          </div>

          {/* Performance Domains Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                <BarChart3 className="h-4 w-4" />
                Top Performance Domains
              </h4>
            </div>
            <div className="space-y-2">
              {sampleData.topDomains.map((domain, idx) => (
                <motion.div
                  key={domain.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                    <span className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                      {domain.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress value={(domain.score / 5) * 100} className="w-24 h-2" />
                      <span className="text-sm font-bold w-8 text-right" style={{ color: domain.color }}>
                        {domain.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Top Gaps Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                <TrendingUp className="h-4 w-4" />
                Key Improvement Areas
              </h4>
            </div>
            <div className="space-y-2">
              {sampleData.topGaps.map((gap, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 + 0.4 }}
                  className="flex items-start gap-2 p-2 rounded text-sm"
                  style={{
                    backgroundColor: maturityTheme.colors.warning.bg,
                    color: maturityTheme.colors.warning.text,
                  }}
                >
                  <span className="mt-0.5">•</span>
                  <span>{gap}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4 border-t" style={{ borderColor: maturityTheme.colors.border.default }}>
            <Button
              onClick={handleTryNow}
              size="lg"
              className="w-full group"
              style={{
                background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                color: 'white',
              }}
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Try Interactive Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-center text-xs mt-2" style={{ color: maturityTheme.colors.text.muted }}>
              Explore full sample results with all 10 tabs and industry-specific examples
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

