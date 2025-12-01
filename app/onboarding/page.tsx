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
} from 'lucide-react';

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

export default function OnboardingLandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
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
                Get Started Free
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

