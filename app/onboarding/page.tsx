'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { RegistrationDialog } from '@/components/onboarding/RegistrationDialog';
import { MaturityJourneyIntro } from '@/components/onboarding/MaturityJourneyIntro';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sparkles,
  Upload,
  BarChart3,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Award,
  FileText,
  Brain,
  Shield,
  Zap,
  Users,
  Rocket,
  ArrowDown,
  Star,
  Quote,
  Lock,
  BadgeCheck,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { InteractiveDemo } from '@/components/onboarding/InteractiveDemo';

// Features will be defined with theme colors inside the component
const getFeatures = () => [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced AI evaluates your project documentation, identifying quality, completeness, and alignment with PM best practices.',
    iconColor: '#5eb8ff',
    bgColor: '#1f2d3d',
  },
  {
    icon: BarChart3,
    title: 'Maturity Scoring',
    description: 'Receive comprehensive maturity scores across 8 Performance Domains and 7 Knowledge Areas based on PMBOK 8 standards.',
    iconColor: '#4d9cff',
    bgColor: '#00142e',
  },
  {
    icon: Target,
    title: 'Actionable Insights',
    description: 'Get specific, actionable recommendations to improve your project management practices and organizational maturity.',
    iconColor: '#6bff9f',
    bgColor: '#1f3d2a',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents are processed securely with enterprise-grade encryption. All data is kept confidential and private.',
    iconColor: '#80b8ff',
    bgColor: '#00295c',
  },
  {
    icon: Zap,
    title: 'Fast Processing',
    description: 'Get results in minutes, not days. Our AI processes documents quickly and provides instant feedback on quality and maturity.',
    iconColor: '#ffd96b',
    bgColor: '#3d2f1f',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share assessment results with your team, track progress over time, and collaborate on improvement initiatives.',
    iconColor: '#1ab0ff',
    bgColor: '#003d5c',
  },
];

// ROI Calculator Component
function ROICalculator() {
  const [numDocuments, setNumDocuments] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [timeSavings, setTimeSavings] = useState(70);
  const [manualDocHours, setManualDocHours] = useState(8);
  const [manualReviewHours, setManualReviewHours] = useState(2);
  const [licenseCost, setLicenseCost] = useState(10000);

  // Calculate ROI
  const hoursPerDoc = manualDocHours + manualReviewHours;
  const estimatedHoursSaved = numDocuments * hoursPerDoc * (timeSavings / 100);
  const estimatedCostSavings = estimatedHoursSaved * hourlyRate;
  const annualSavings = estimatedCostSavings; // Assuming this is annual
  const roi = licenseCost > 0 ? ((annualSavings - licenseCost) / licenseCost) * 100 : 0;
  const paybackMonths = annualSavings > 0 ? Math.ceil((licenseCost / annualSavings) * 12) : 0;

  return (
    <div className="space-y-8">
      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Number of Documents
          </Label>
          <div className="space-y-2">
            <Slider
              value={[numDocuments]}
              onValueChange={(value) => setNumDocuments(value[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <Input
              type="number"
              min="1"
              max="1000"
              value={numDocuments}
              onChange={(e) => setNumDocuments(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              style={{
                color: maturityTheme.colors.text.primary,
                backgroundColor: maturityTheme.colors.background.tertiary,
                borderColor: maturityTheme.colors.border.default,
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Hourly Rate ($)
          </Label>
          <div className="space-y-2">
            <Slider
              value={[hourlyRate]}
              onValueChange={(value) => setHourlyRate(value[0])}
              min={25}
              max={200}
              step={5}
              className="w-full"
            />
            <Input
              type="number"
              min="25"
              max="500"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Math.max(25, Math.min(500, parseInt(e.target.value) || 75)))}
              style={{
                color: maturityTheme.colors.text.primary,
                backgroundColor: maturityTheme.colors.background.tertiary,
                borderColor: maturityTheme.colors.border.default,
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Time Savings (%)
          </Label>
          <div className="space-y-2">
            <Slider
              value={[timeSavings]}
              onValueChange={(value) => setTimeSavings(value[0])}
              min={30}
              max={90}
              step={5}
              className="w-full"
            />
            <Input
              type="number"
              min="30"
              max="90"
              value={timeSavings}
              onChange={(e) => setTimeSavings(Math.max(30, Math.min(90, parseInt(e.target.value) || 70)))}
              style={{
                color: maturityTheme.colors.text.primary,
                backgroundColor: maturityTheme.colors.background.tertiary,
                borderColor: maturityTheme.colors.border.default,
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Manual Document Creation (hours)
          </Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={manualDocHours}
            onChange={(e) => setManualDocHours(Math.max(1, Math.min(20, parseInt(e.target.value) || 8)))}
            style={{
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
              borderColor: maturityTheme.colors.border.default,
            }}
          />
        </div>

        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Manual Review Time (hours)
          </Label>
          <Input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={manualReviewHours}
            onChange={(e) => setManualReviewHours(Math.max(0.5, Math.min(10, parseFloat(e.target.value) || 2)))}
            style={{
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
              borderColor: maturityTheme.colors.border.default,
            }}
          />
        </div>

        <div className="space-y-2">
          <Label style={{ color: maturityTheme.colors.text.primary }}>
            Annual License Cost ($)
          </Label>
          <Input
            type="number"
            min="1000"
            max="50000"
            step="1000"
            value={licenseCost}
            onChange={(e) => setLicenseCost(Math.max(1000, Math.min(50000, parseInt(e.target.value) || 10000)))}
            style={{
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
              borderColor: maturityTheme.colors.border.default,
            }}
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t" style={{ borderColor: maturityTheme.colors.border.default }}>
        <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
            Hours Saved
          </div>
          <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
            {Math.round(estimatedHoursSaved).toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
            Per year
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
            Annual Savings
          </div>
          <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
            ${Math.round(annualSavings).toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
            Cost savings
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
            ROI
          </div>
          <div className="text-2xl font-bold" style={{ color: roi > 0 ? maturityTheme.colors.success.text : maturityTheme.colors.error.text }}>
            {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
          </div>
          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
            Return on investment
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.secondary }}>
            Payback Period
          </div>
          <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
            {paybackMonths > 0 ? paybackMonths : 'N/A'}
          </div>
          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
            {paybackMonths > 0 ? 'months' : 'No payback'}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-6 text-center">
        <Button
          onClick={() => window.location.href = '/onboarding/upload'}
          size="lg"
          style={{
            background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
            color: 'white',
          }}
        >
          Start Your Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

const benefits = [
  {
    title: 'Understand Your Current State',
    description: 'Get a clear picture of your project management maturity across all key domains and knowledge areas.',
    icon: CheckCircle,
  },
  {
    title: 'Identify Improvement Opportunities',
    description: 'Discover specific areas where your PM practices can be enhanced to drive better project outcomes.',
    icon: Lightbulb,
  },
  {
    title: 'Benchmark Against Standards',
    description: 'Compare your practices against PMBOK 8 Performance Domains and Knowledge Areas to ensure alignment.',
    icon: Award,
  },
  {
    title: 'Track Progress Over Time',
    description: 'Monitor your maturity journey as you implement improvements and see measurable progress.',
    icon: TrendingUp,
  },
];

const processSteps = [
  {
    step: 1,
    title: 'Register & Upload',
    description: 'Create your account and upload your project documents. We support PDF, DOCX, TXT, and Markdown formats.',
    icon: Upload,
  },
  {
    step: 2,
    title: 'AI Analysis',
    description: 'Our AI analyzes your documents, extracts key information, and evaluates quality and completeness.',
    icon: Brain,
  },
  {
    step: 3,
    title: 'Get Results',
    description: 'Receive comprehensive maturity scores, quality assessments, and actionable recommendations.',
    icon: BarChart3,
  },
  {
    step: 4,
    title: 'Take Action',
    description: 'Use the insights to improve your PM practices and track your progress over time.',
    icon: Rocket,
  },
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'PMO Director',
    company: 'TechCorp Inc.',
    quote: 'ADPA transformed our project management maturity assessment process. The AI-powered insights helped us identify critical gaps and prioritize improvements.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Senior Project Manager',
    company: 'Global Solutions',
    quote: 'The comprehensive analysis and actionable recommendations saved us weeks of manual assessment work. Highly recommend!',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'VP of Operations',
    company: 'InnovateCo',
    quote: 'The PMBOK 8 alignment and detailed performance domain analysis gave us exactly what we needed to improve our project delivery.',
    rating: 5,
  },
];

const faqs = [
  {
    question: 'How long does an assessment take?',
    answer: 'The assessment process typically takes 2-3 minutes per document. For a portfolio of 10-15 documents, you can expect results within 30-45 minutes. The AI analysis runs automatically after document upload.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'We support PDF, DOCX (Word), TXT (plain text), and Markdown (.md) files. Each file can be up to 10MB in size, and you can upload up to 100 files per assessment.',
  },
  {
    question: 'Is my data secure and private?',
    answer: 'Yes, absolutely. All documents are processed with enterprise-grade encryption. Your data is kept confidential and private. We never share your information with third parties, and you can delete your data at any time.',
  },
  {
    question: 'How accurate are the assessment results?',
    answer: 'Our AI-powered analysis uses advanced natural language processing and is trained on PMBOK 8 standards. The system evaluates documents across 10 quality dimensions and 8 performance domains, providing highly accurate maturity assessments. Results are validated against industry benchmarks.',
  },
  {
    question: 'What happens after I complete an assessment?',
    answer: 'After your assessment is complete, you\'ll receive a comprehensive report with maturity scores, gap analysis, actionable recommendations, and ROI projections. You can export reports in PDF, CSV, or JSON formats, and track your progress over time with follow-up assessments.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'Yes, a free account is required to upload documents and view assessment results. Registration is quick and only requires an email address. No credit card is required for the free assessment.',
  },
  {
    question: 'Can I compare multiple assessments?',
    answer: 'Yes! You can run multiple assessments over time and compare results to track your maturity improvement. The system stores your assessment history and provides trend analysis.',
  },
  {
    question: 'What if I need help or have questions?',
    answer: 'We provide comprehensive documentation and support. You can access help guides, view sample results, or contact our support team for assistance with your assessment.',
  },
];

export default function OnboardingLandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const features = getFeatures();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // If authenticated, navigate to upload page
      router.push('/onboarding/upload');
    } else {
      // If not authenticated, show registration dialog
      setShowRegistrationDialog(true);
    }
  };

  const handleRegistrationSuccess = () => {
    // After successful registration, navigate to upload page
    // The registration dialog already handles redirect, but we ensure it goes to upload
    router.push('/onboarding/upload');
  };

  const handleLearnMore = () => {
    setShowIntro(true);
  };

  return (
    <>
      {/* Registration Dialog */}
      <RegistrationDialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Journey Intro Modal */}
      {showIntro && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <MaturityJourneyIntro 
              onComplete={() => setShowIntro(false)} 
              onSkip={() => setShowIntro(false)}
            />
          </div>
        </div>
      )}

      <div
        className="min-h-screen"
        style={{
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="h-12 w-12 md:h-16 md:w-16" style={{ color: maturityTheme.colors.info.text }} />
              <h1
                className="text-4xl md:text-6xl font-bold"
                style={{ color: maturityTheme.colors.text.primary }}
              >
                Project Management
                <br />
                Maturity Assessment
              </h1>
            </div>
            <p
              className="text-xl md:text-2xl mb-8"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Transform your project management practices with AI-powered insights
              <br />
              aligned with PMBOK 8 Performance Domains
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                  color: 'white',
                }}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Your Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={handleLearnMore}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 shadow-lg"
                style={{
                  backgroundColor: maturityTheme.colors.info.bg,
                  borderColor: maturityTheme.colors.info.border,
                  color: maturityTheme.colors.info.text,
                }}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Learn How It Works
              </Button>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-12 flex justify-center"
            >
              <ArrowDown className="h-6 w-6 animate-bounce" style={{ color: maturityTheme.colors.text.secondary }} />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Powerful Features
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Everything you need to assess and improve your project management maturity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card 
                  className="h-full hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: maturityTheme.colors.surface.default }}
                >
                  <CardHeader>
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: feature.bgColor }}
                    >
                      <feature.icon className="h-6 w-6" style={{ color: feature.iconColor }} />
                    </div>
                    <CardTitle className="text-xl" style={{ color: maturityTheme.colors.text.primary }}>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base" style={{ color: maturityTheme.colors.text.secondary }}>
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              How It Works
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Simple, fast, and effective - get started in minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                <Card 
                  className="h-full text-center"
                  style={{ backgroundColor: maturityTheme.colors.surface.default }}
                >
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-white">{step.step}</span>
                    </div>
                    <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                      <step.icon className="h-8 w-8" style={{ color: maturityTheme.colors.primary[400] }} />
                    </div>
                    <CardTitle className="text-xl" style={{ color: maturityTheme.colors.text.primary }}>
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base" style={{ color: maturityTheme.colors.text.secondary }}>
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6" style={{ color: maturityTheme.colors.text.secondary }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Why Choose Our Assessment?
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Unlock the full potential of your project management organization
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card 
                  className="h-full"
                  style={{ backgroundColor: maturityTheme.colors.surface.default }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                          {benefit.title}
                        </h3>
                        <p className="text-base" style={{ color: maturityTheme.colors.text.secondary }}>
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ROI Calculator Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Calculate Your ROI
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              See how much time and money you can save with AI-powered document assessment
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardContent className="p-8">
                <ROICalculator />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              See Your Results Before You Start
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Explore an interactive preview of your assessment results with sample data
            </p>
          </motion.div>
          <div className="max-w-4xl mx-auto">
            <InteractiveDemo />
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Trusted by Project Management Professionals
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto mb-8"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Join 500+ organizations using ADPA to improve their project management maturity
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
              <div className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                <Shield className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                <span className="text-sm font-medium">Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                <BadgeCheck className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                <span className="text-sm font-medium">PMBOK 8 Certified</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                <Lock className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                <span className="text-sm font-medium">Data Privacy</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full" style={{ backgroundColor: maturityTheme.colors.surface.default }}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <Quote className="h-8 w-8 mb-4" style={{ color: maturityTheme.colors.text.muted, opacity: 0.5 }} />
                      <p className="text-sm mb-4 italic" style={{ color: maturityTheme.colors.text.secondary }}>
                        "{testimonial.quote}"
                      </p>
                      <div className="border-t pt-4" style={{ borderColor: maturityTheme.colors.border.default }}>
                        <p className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {testimonial.name}
                        </p>
                        <p className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                          {testimonial.role} • {testimonial.company}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Everything you need to know about our assessment platform
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <Card style={{ backgroundColor: maturityTheme.colors.surface.default }}>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger
                        style={{ color: maturityTheme.colors.text.primary }}
                        className="text-left"
                      >
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent style={{ color: maturityTheme.colors.text.secondary }}>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Card 
              className="p-8 md:p-12 shadow-2xl" 
              style={{ 
                backgroundColor: maturityTheme.colors.surface.default,
                borderColor: maturityTheme.colors.border.accent,
              }}
            >
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl md:text-4xl mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Ready to Get Started?
                </CardTitle>
                <CardDescription className="text-lg md:text-xl mb-8" style={{ color: maturityTheme.colors.text.secondary }}>
                  Join organizations worldwide who are transforming their project management practices
                  with AI-powered insights and PMBOK 8 alignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                      color: 'white',
                    }}
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    Start Your Assessment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => router.push('/onboarding/sample-results')}
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 shadow-lg"
                    style={{
                      backgroundColor: maturityTheme.colors.primary[800],
                      borderColor: maturityTheme.colors.primary[700],
                      color: maturityTheme.colors.text.primary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.primary[700];
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.primary[800];
                      e.currentTarget.style.color = maturityTheme.colors.text.primary;
                    }}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    View Sample Results
                  </Button>
                </div>
                <p className="text-sm mt-6" style={{ color: maturityTheme.colors.text.secondary }}>
                  No credit card required • Free assessment • Results in minutes
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Footer Note */}
        <footer className="container mx-auto px-6 py-8 text-center">
          <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
            Powered by AI • PMBOK 8 Inspired Assessment • Built for Project Management Excellence
          </p>
        </footer>
      </div>
    </>
  );
}

