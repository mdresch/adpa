'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MaturityScore } from '@/components/onboarding/MaturityScore';
import { MaturityJourneyPlanner } from '@/components/onboarding/MaturityJourneyPlanner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  AlertCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

// Industry benchmarks data (matching real assessment page)
const INDUSTRY_BENCHMARKS = {
  technology: {
    label: 'Technology & Software',
    industryAverage: 78.5,
    topPerformers: 91.2,
    maturityLevel: 'Defined to Managed',
    pmoPresence: 68,
    toolAdoption: 85,
    description: 'Digital-native organizations with strong agile and product delivery practices.',
  },
  finance: {
    label: 'Financial Services',
    industryAverage: 75.0,
    topPerformers: 89.5,
    maturityLevel: 'Defined',
    pmoPresence: 82,
    toolAdoption: 78,
    description: 'Highly regulated portfolio governance with strong risk and compliance disciplines.',
  },
  healthcare: {
    label: 'Healthcare & Life Sciences',
    industryAverage: 72.0,
    topPerformers: 87.0,
    maturityLevel: 'Defined',
    pmoPresence: 71,
    toolAdoption: 72,
    description: 'Complex, multi-stakeholder programs with strong clinical and regulatory oversight.',
  },
  manufacturing: {
    label: 'Manufacturing & Engineering',
    industryAverage: 70.5,
    topPerformers: 86.3,
    maturityLevel: 'Defined',
    pmoPresence: 65,
    toolAdoption: 70,
    description: 'Stage-gate and hybrid delivery models with strong quality and cost controls.',
  },
  government: {
    label: 'Government & Public Sector',
    industryAverage: 68.0,
    topPerformers: 84.1,
    maturityLevel: 'Repeatable to Defined',
    pmoPresence: 58,
    toolAdoption: 62,
    description: 'Policy-driven initiatives with formal governance and extensive stakeholder networks.',
  },
} as const;

type IndustryKey = keyof typeof INDUSTRY_BENCHMARKS;

// Industry-specific sample assessments
const industrySamples: Record<IndustryKey, typeof sampleAssessment> = {
  technology: {
    id: 'sample-tech-001',
    projectName: 'Cloud Migration Initiative',
    clientName: 'TechStart Inc.',
    organizationName: 'TechStart Inc.',
    assessmentPurpose: 'Digital Transformation',
    createdAt: new Date().toISOString(),
    overallMaturityLevel: 3.8,
    overallMaturityLabel: 'Defined',
    averageQualityScore: 78,
    totalDocuments: 15,
    gapsCount: 6,
    status: 'complete' as const,
  },
  finance: {
    id: 'sample-finance-001',
    projectName: 'Regulatory Compliance Program',
    clientName: 'Global Finance Corp',
    organizationName: 'Global Finance Corp',
    assessmentPurpose: 'Compliance Assessment',
    createdAt: new Date().toISOString(),
    overallMaturityLevel: 3.5,
    overallMaturityLabel: 'Defined',
    averageQualityScore: 75,
    totalDocuments: 18,
    gapsCount: 7,
    status: 'complete' as const,
  },
  healthcare: {
    id: 'sample-healthcare-001',
    projectName: 'Clinical Trial Management',
    clientName: 'MedLife Systems',
    organizationName: 'MedLife Systems',
    assessmentPurpose: 'Quality Assurance',
    createdAt: new Date().toISOString(),
    overallMaturityLevel: 3.2,
    overallMaturityLabel: 'Defined',
    averageQualityScore: 72,
    totalDocuments: 20,
    gapsCount: 9,
    status: 'complete' as const,
  },
  manufacturing: {
    id: 'sample-manufacturing-001',
    projectName: 'Production Line Optimization',
    clientName: 'Industrial Solutions Ltd',
    organizationName: 'Industrial Solutions Ltd',
    assessmentPurpose: 'Process Improvement',
    createdAt: new Date().toISOString(),
    overallMaturityLevel: 3.0,
    overallMaturityLabel: 'Defined',
    averageQualityScore: 70,
    totalDocuments: 14,
    gapsCount: 8,
    status: 'complete' as const,
  },
  government: {
    id: 'sample-government-001',
    projectName: 'Public Service Modernization',
    clientName: 'City Administration',
    organizationName: 'City Administration',
    assessmentPurpose: 'Digital Government',
    createdAt: new Date().toISOString(),
    overallMaturityLevel: 2.8,
    overallMaturityLabel: 'Developing',
    averageQualityScore: 68,
    totalDocuments: 16,
    gapsCount: 10,
    status: 'complete' as const,
  },
};

// Sample assessment data (default)
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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryKey | 'default'>('default');
  
  // Get current assessment data based on selected industry
  const currentAssessment = selectedIndustry === 'default' 
    ? sampleAssessment 
    : industrySamples[selectedIndustry];

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

        {/* Industry Selector */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                  View Sample Results by Industry
                </h3>
                <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                  Explore how assessment results vary across different industries
                </p>
              </div>
              <div className="flex flex-col gap-2 min-w-[250px]">
                <Label style={{ color: maturityTheme.colors.text.primary }}>Select Industry</Label>
                <select
                  value={selectedIndustry}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedIndustry(e.target.value as IndustryKey | 'default')}
                  className="text-sm rounded-md px-3 py-2 border bg-transparent"
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                    backgroundColor: maturityTheme.colors.background.tertiary,
                  }}
                >
                  <option value="default">General (Default)</option>
                  {Object.entries(INDUSTRY_BENCHMARKS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                {selectedIndustry !== 'default' && (
                  <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                    {INDUSTRY_BENCHMARKS[selectedIndustry].description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value)}
          className="mb-6"
        >
          <TabsList 
            style={{ 
              backgroundColor: maturityTheme.colors.background.tertiary,
              borderColor: maturityTheme.colors.border.default,
            }}
            className="grid w-full grid-cols-5 lg:grid-cols-10"
          >
            <TabsTrigger 
              value="overview"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="journey"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Maturity Journey
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Documents
            </TabsTrigger>
            <TabsTrigger 
              value="gaps"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Gaps
            </TabsTrigger>
            <TabsTrigger 
              value="recommendations"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Recommendations
            </TabsTrigger>
            <TabsTrigger 
              value="benchmarks"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Benchmarks
            </TabsTrigger>
            <TabsTrigger 
              value="roi"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              ROI
            </TabsTrigger>
            <TabsTrigger 
              value="domains"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Performance Domains
            </TabsTrigger>
            <TabsTrigger 
              value="quality"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Quality Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="action"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Action Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* Assessment Overview */}
            <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                  {currentAssessment.projectName}
                </CardTitle>
                <CardDescription className="text-base" style={{ color: maturityTheme.colors.text.secondary }}>
                  <Building className="inline h-4 w-4 mr-2" />
                  {currentAssessment.clientName} • {currentAssessment.organizationName}
                  {selectedIndustry !== 'default' && (
                    <Badge variant="outline" className="ml-2" style={{ borderColor: maturityTheme.colors.border.default, color: maturityTheme.colors.text.secondary }}>
                      {INDUSTRY_BENCHMARKS[selectedIndustry].label}
                    </Badge>
                  )}
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
                    level={scoreToLevel(currentAssessment.overallMaturityLevel)}
                    label={getMaturityLabel(currentAssessment.overallMaturityLevel)}
                    score={currentAssessment.overallMaturityLevel}
                    size="lg" 
                  />
                  <span className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    {getMaturityLabel(currentAssessment.overallMaturityLevel)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Quality Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Progress value={currentAssessment.averageQualityScore} className="h-2" />
                  </div>
                  <span className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                    {currentAssessment.averageQualityScore}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Documents Analyzed</p>
                <p className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                  {currentAssessment.totalDocuments}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Improvement Areas</p>
                <p className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                  {currentAssessment.gapsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="domains" className="mt-6">
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
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
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
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
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
          </TabsContent>

          <TabsContent value="journey" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <Target className="h-5 w-5" />
                  Maturity Journey Planner
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Plan your path to higher maturity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaturityJourneyPlanner
                  currentLevel={scoreToLevel(currentAssessment.overallMaturityLevel)}
                  currentScore={currentAssessment.overallMaturityLevel}
                  averageQualityScore={currentAssessment.averageQualityScore}
                  totalDocuments={currentAssessment.totalDocuments}
                  gapsCount={currentAssessment.gapsCount}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <AlertCircle className="h-5 w-5" />
                  Identified Gaps
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Areas requiring improvement to reach target maturity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { documentType: 'Risk Register', currentLevel: 2, targetLevel: 4, priority: 'critical', description: 'Risk management processes are below standard. Immediate action required.' },
                    { documentType: 'Quality Management Plan', currentLevel: 3, targetLevel: 4, priority: 'high', description: 'Quality assurance processes need enhancement to meet best practices.' },
                    { documentType: 'Communication Plan', currentLevel: 3, targetLevel: 4, priority: 'medium', description: 'Communication planning could be more structured and comprehensive.' },
                    { documentType: 'Change Management Plan', currentLevel: 3, targetLevel: 4, priority: 'medium', description: 'Change management processes are adequate but could be improved.' },
                  ].map((gap, index) => (
                    <motion.div
                      key={gap.documentType}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card style={{ backgroundColor: maturityTheme.colors.surface.hover }}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                  {gap.documentType}
                                </h4>
                                <Badge variant={gap.priority === 'critical' ? 'destructive' : gap.priority === 'high' ? 'default' : 'secondary'}>
                                  {gap.priority}
                                </Badge>
                              </div>
                              <p className="text-sm mb-3" style={{ color: maturityTheme.colors.text.secondary }}>
                                {gap.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span style={{ color: maturityTheme.colors.text.secondary }}>
                                  Current: Level {gap.currentLevel}
                                </span>
                                <span style={{ color: maturityTheme.colors.text.muted }}>→</span>
                                <span style={{ color: maturityTheme.colors.text.primary }}>
                                  Target: Level {gap.targetLevel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <BarChart3 className="h-5 w-5" />
                  Industry Benchmarks
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Compare your maturity against industry standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                    <div className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                      Industry Average
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                      3.2
                    </div>
                    <Progress value={64} className="h-2 mt-2" />
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                    <div className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                      Top Performers
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                      4.5
                    </div>
                    <Progress value={90} className="h-2 mt-2" />
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                    <div className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                      Your Score
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{ color: maturityTheme.colors.primary[400] }}>
                      {currentAssessment.overallMaturityLevel.toFixed(1)}
                    </div>
                    <Progress value={(currentAssessment.overallMaturityLevel / 5) * 100} className="h-2 mt-2" />
                  </div>
                </div>
                {selectedIndustry !== 'default' && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.info.bg, borderColor: maturityTheme.colors.info.border }}>
                    <div className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                      Industry Context: {INDUSTRY_BENCHMARKS[selectedIndustry].label}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span style={{ color: maturityTheme.colors.text.secondary }}>Industry Avg: </span>
                        <span style={{ color: maturityTheme.colors.text.primary }}>{INDUSTRY_BENCHMARKS[selectedIndustry].industryAverage}%</span>
                      </div>
                      <div>
                        <span style={{ color: maturityTheme.colors.text.secondary }}>Top Performers: </span>
                        <span style={{ color: maturityTheme.colors.text.primary }}>{INDUSTRY_BENCHMARKS[selectedIndustry].topPerformers}%</span>
                      </div>
                      <div>
                        <span style={{ color: maturityTheme.colors.text.secondary }}>PMO Presence: </span>
                        <span style={{ color: maturityTheme.colors.text.primary }}>{INDUSTRY_BENCHMARKS[selectedIndustry].pmoPresence}%</span>
                      </div>
                      <div>
                        <span style={{ color: maturityTheme.colors.text.secondary }}>Tool Adoption: </span>
                        <span style={{ color: maturityTheme.colors.text.primary }}>{INDUSTRY_BENCHMARKS[selectedIndustry].toolAdoption}%</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.info.bg, borderColor: maturityTheme.colors.info.border }}>
                  <p className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                    <strong>Percentile:</strong> You're in the <strong>65th percentile</strong> compared to similar organizations in your industry.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roi" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <TrendingUp className="h-5 w-5" />
                  Return on Investment
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Expected benefits and ROI from improving documentation maturity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                      Expected Benefits & ROI
                    </h3>
                    <ul className="space-y-2">
                      {[
                        '25-30% improvement in on-time delivery',
                        '20-25% reduction in budget overruns',
                        'Standardized quality across projects',
                        'Improved stakeholder satisfaction',
                        'Better resource allocation',
                      ].map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                          <span style={{ color: maturityTheme.colors.text.secondary }}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                      Financial Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                        <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
                          Annual Savings
                        </div>
                        <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                          $125,000
                        </div>
                      </div>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                        <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
                          ROI
                        </div>
                        <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                          1,150%
                        </div>
                      </div>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                        <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
                          Payback Period
                        </div>
                        <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                          1.2 months
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <Target className="h-5 w-5" />
                  Quality Analysis
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Detailed quality assessment across 10 dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { dimension: 'Completeness', score: 78, description: 'Documents cover most required sections' },
                    { dimension: 'Clarity', score: 82, description: 'Clear and well-structured content' },
                    { dimension: 'Accuracy', score: 75, description: 'Generally accurate with minor gaps' },
                    { dimension: 'Relevance', score: 80, description: 'Content is relevant to project needs' },
                    { dimension: 'Consistency', score: 72, description: 'Some inconsistencies across documents' },
                    { dimension: 'Timeliness', score: 85, description: 'Documents are up-to-date' },
                    { dimension: 'Traceability', score: 70, description: 'Limited cross-references between documents' },
                    { dimension: 'Standards Compliance', score: 68, description: 'Partial alignment with PMBOK standards' },
                    { dimension: 'Stakeholder Alignment', score: 75, description: 'Good stakeholder consideration' },
                    { dimension: 'Actionability', score: 73, description: 'Moderately actionable recommendations' },
                  ].map((dim, index) => (
                    <div key={dim.dimension} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                          {dim.dimension}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                          {dim.score}%
                        </span>
                      </div>
                      <Progress value={dim.score} className="h-2" />
                      <p className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                        {dim.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="action" className="mt-6">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                  <Rocket className="h-5 w-5" />
                  Action Plan
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Prioritized roadmap for maturity improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { phase: 'Phase 1: Quick Wins (Weeks 1-4)', items: ['Enhance Risk Register with comprehensive risk identification', 'Improve Quality Management Plan structure', 'Standardize document templates'] },
                    { phase: 'Phase 2: Foundation Building (Weeks 5-12)', items: ['Implement structured communication planning', 'Enhance change management processes', 'Establish quality metrics and KPIs'] },
                    { phase: 'Phase 3: Optimization (Weeks 13-24)', items: ['Achieve full PMBOK 8 alignment', 'Implement continuous improvement processes', 'Establish maturity monitoring dashboard'] },
                  ].map((phase, index) => (
                    <motion.div
                      key={phase.phase}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                    >
                      <Card style={{ backgroundColor: maturityTheme.colors.surface.hover }}>
                        <CardHeader>
                          <CardTitle className="text-lg" style={{ color: maturityTheme.colors.text.primary }}>
                            {phase.phase}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {phase.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2">
                                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                                <span style={{ color: maturityTheme.colors.text.secondary }}>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Note about full features */}
        <Card className="mb-6" style={{ backgroundColor: maturityTheme.colors.info.bg, borderColor: maturityTheme.colors.info.border }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: maturityTheme.colors.info.text }} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                  This is a simplified preview
                </p>
                <p className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                  This preview shows all 10 tabs available in the full assessment results. Start your own assessment to see your personalized analysis!
                </p>
              </div>
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

