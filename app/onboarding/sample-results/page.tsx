'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MaturityScore } from '@/components/onboarding/MaturityScore';
import {
  FileText,
  ArrowLeft,
  TrendingUp,
  Building,
  Sparkles,
  CheckCircle,
  Target,
  BarChart3,
  Lightbulb,
  Rocket,
  Upload,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

// Sample assessment data
const sampleAssessment = {
  id: 'sample-001',
  projectName: 'Enterprise Digital Transformation',
  clientName: 'Acme Corporation',
  organizationName: 'Acme Corporation',
  assessmentPurpose: 'Initial Onboarding',
  createdAt: new Date().toISOString(),
  overallMaturityLevel: 3.5,
  overallMaturityLabel: 'Developing',
  averageQualityScore: 72,
  totalDocuments: 12,
  gapsCount: 8,
  status: 'complete' as const,
};

const domainScores = [
  { domain: 'Stakeholders Performance Domain', score: 3.2, color: 'bg-blue-500' }, // Defined
  { domain: 'Team Performance Domain', score: 4.2, color: 'bg-green-500' }, // Managed
  { domain: 'Development Approach and Life Cycle', score: 2.8, color: 'bg-purple-500' }, // Developing
  { domain: 'Planning Performance Domain', score: 3.5, color: 'bg-orange-500' }, // Defined
  { domain: 'Project Work Performance Domain', score: 3.6, color: 'bg-pink-500' }, // Defined
  { domain: 'Delivery Performance Domain', score: 4.6, color: 'bg-indigo-500' }, // Optimizing
  { domain: 'Measurement Performance Domain', score: 2.5, color: 'bg-teal-500' }, // Developing
  { domain: 'Uncertainty Performance Domain', score: 3.1, color: 'bg-yellow-500' }, // Defined
];

const documentQuality = [
  { type: 'Project Charter', fileName: 'Project_Charter_v2.1.pdf', quality: 85, status: 'excellent' },
  { type: 'Scope Statement', fileName: 'Scope_Statement_Final.docx', quality: 78, status: 'good' },
  { type: 'Schedule Management Plan', fileName: 'Schedule_Plan_Q1_2025.xlsx', quality: 72, status: 'good' },
  { type: 'Risk Register', fileName: 'Risk_Register_Updated.pdf', quality: 65, status: 'fair' },
  { type: 'Stakeholder Register', fileName: 'Stakeholder_Analysis.docx', quality: 80, status: 'excellent' },
  { type: 'Communication Plan', fileName: 'Comm_Plan_2025.pdf', quality: 70, status: 'good' },
  { type: 'Quality Management Plan', fileName: 'Quality_Plan_Draft.docx', quality: 68, status: 'fair' },
  { type: 'Change Management Plan', fileName: 'Change_Management_Process.pdf', quality: 75, status: 'good' },
];

const recommendations = [
  {
    category: 'Planning',
    priority: 'High',
    title: 'Enhance Risk Management Practices',
    description: 'Your risk register shows gaps in risk identification and mitigation strategies. Consider implementing a more comprehensive risk management framework.',
  },
  {
    category: 'Execution',
    priority: 'Medium',
    title: 'Improve Stakeholder Engagement',
    description: 'While stakeholder identification is good, engagement strategies could be more structured. Develop a formal stakeholder engagement plan.',
  },
  {
    category: 'Monitoring',
    priority: 'High',
    title: 'Strengthen Quality Assurance',
    description: 'Quality management processes need enhancement. Implement regular quality reviews and establish clear quality metrics.',
  },
  {
    category: 'Planning',
    priority: 'Medium',
    title: 'Enhance Communication Planning',
    description: 'Communication plans exist but could be more detailed. Consider adding communication frequency, channels, and escalation procedures.',
  },
];

const getMaturityLabel = (score: number) => {
  if (score < 2) return 'Initial';
  if (score < 3) return 'Developing';
  if (score < 4) return 'Defined';
  if (score < 4.5) return 'Managed';
  return 'Optimizing';
};

const scoreToLevel = (score: number): 1 | 2 | 3 | 4 | 5 => {
  const level = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
  return level;
};

const getQualityStatus = (score: number) => {
  if (score >= 80) return { label: 'Excellent', color: 'bg-green-500' };
  if (score >= 70) return { label: 'Good', color: 'bg-blue-500' };
  if (score >= 60) return { label: 'Fair', color: 'bg-yellow-500' };
  return { label: 'Needs Improvement', color: 'bg-red-500' };
};

export default function SampleResultsPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
      }}
    >
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={() => router.push('/onboarding')}
                className="hover:underline"
                style={{ color: maturityTheme.colors.text.secondary }}
              >
                Home
              </button>
            </li>
            <li style={{ color: maturityTheme.colors.text.muted }}>/</li>
            <li style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
              Sample Results
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/onboarding')}
            className="mb-4"
            style={{
              color: maturityTheme.colors.text.secondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = maturityTheme.colors.surface.hover;
              e.currentTarget.style.color = maturityTheme.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = maturityTheme.colors.text.secondary;
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Landing Page
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-400/50">
                  Sample Results
                </Badge>
                <Sparkles className="h-5 w-5" style={{ color: maturityTheme.colors.info.text }} />
              </div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                Assessment Results
              </h1>
              <p style={{ color: maturityTheme.colors.text.secondary }}>
                Example assessment results to demonstrate the maturity analysis capabilities
              </p>
            </div>
            <Button
              onClick={() => router.push('/onboarding')}
              style={{
                background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                color: 'white',
              }}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Start Your Assessment
            </Button>
          </div>
        </div>

        {/* Assessment Overview */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                  {sampleAssessment.projectName}
                </CardTitle>
                <CardDescription className="text-base" style={{ color: maturityTheme.colors.text.secondary }}>
                  <Building className="inline h-4 w-4 mr-2" />
                  {sampleAssessment.clientName} • {sampleAssessment.organizationName}
                </CardDescription>
              </div>
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="mr-1 h-3 w-3" />
                Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overall Maturity</p>
                <div className="flex items-center gap-2">
                  <MaturityScore 
                    level={scoreToLevel(sampleAssessment.overallMaturityLevel)}
                    label={getMaturityLabel(sampleAssessment.overallMaturityLevel)}
                    score={sampleAssessment.overallMaturityLevel}
                    size="lg" 
                  />
                  <span className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    {getMaturityLabel(sampleAssessment.overallMaturityLevel)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Quality Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Progress value={sampleAssessment.averageQualityScore} className="h-2" />
                  </div>
                  <span className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    {sampleAssessment.averageQualityScore}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Documents Analyzed</p>
                <p className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                  {sampleAssessment.totalDocuments}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Improvement Areas</p>
                <p className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                  {sampleAssessment.gapsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Domain Scores */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <BarChart3 className="h-5 w-5" />
              Performance Domain Scores
            </CardTitle>
            <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Maturity scores across 8 Performance Domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {domainScores.map((domain, index) => (
                <motion.div
                  key={domain.domain}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                        {domain.domain}
                      </span>
                      <div className="flex items-center gap-2">
                        <MaturityScore 
                          level={scoreToLevel(domain.score)}
                          label={getMaturityLabel(domain.score)}
                          score={domain.score}
                          size="sm" 
                        />
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                            {domain.score.toFixed(1)}
                          </span>
                          <span className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                            {getMaturityLabel(domain.score)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Progress value={(domain.score / 5) * 100} className="h-2" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Quality Analysis */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <FileText className="h-5 w-5" />
              Document Quality Analysis
            </CardTitle>
            <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Quality scores for each document type analyzed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ color: maturityTheme.colors.text.primary, fontWeight: 600 }}>Document Type</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary, fontWeight: 600 }}>Original File Name</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary, fontWeight: 600 }}>Quality Score</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary, fontWeight: 600 }}>Status</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary, fontWeight: 600 }}>Quality Bar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentQuality.map((doc, index) => {
                  const status = getQualityStatus(doc.quality);
                  return (
                    <motion.tr
                      key={doc.type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <TableCell className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>{doc.type}</TableCell>
                      <TableCell>
                        <span className="text-sm font-mono" style={{ color: maturityTheme.colors.text.secondary }}>
                          {doc.fileName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>{doc.quality}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="w-24 h-2 rounded-full overflow-hidden"
                          style={{ 
                            backgroundColor: '#0d1a2e', // Darker blue-gray for better contrast with gradient fill
                          }}
                        >
                          <div
                            className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-600"
                            style={{ width: `${doc.quality}%` }}
                          />
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <Lightbulb className="h-5 w-5" />
              Actionable Recommendations
            </CardTitle>
            <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Prioritized recommendations to improve your project management maturity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full" style={{ backgroundColor: maturityTheme.colors.surface.hover }}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg" style={{ color: maturityTheme.colors.text.primary }}>{rec.title}</CardTitle>
                        <Badge
                          variant={rec.priority === 'High' ? 'destructive' : 'secondary'}
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="w-fit" style={{ borderColor: maturityTheme.colors.border.default, color: maturityTheme.colors.text.secondary }}>
                        {rec.category}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        {rec.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="text-center" style={{ backgroundColor: maturityTheme.colors.surface.default, borderColor: maturityTheme.colors.border.accent }}>
          <CardContent className="pt-6">
            <Target className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.primary[400] }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
              Ready to Get Your Own Assessment?
            </h3>
            <p className="text-base mb-6" style={{ color: maturityTheme.colors.text.secondary }}>
              Upload your project documents and receive a comprehensive maturity analysis in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push('/onboarding')}
                size="lg"
                style={{
                  background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                  color: 'white',
                }}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Your Assessment
              </Button>
              <Button
                onClick={() => router.push('/onboarding/upload')}
                variant="outline"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

