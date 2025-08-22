import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Crown, Zap, Infinity, AlertTriangle, Settings, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'wouter';

interface SubscriptionStatus {
  tier: 'free' | 'basic' | 'premium' | 'studio';
  status: string;
  subscriptionId?: string;
  startDate?: string;
  endDate?: string;
  monthlyAiQueries: number;
  canUseAI: boolean;
  limits: {
    free: number;
    basic: number;
    premium: number;
    studio: number;
  };
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Check,
    tier: 0,
    features: [
      'Basic AI Assistance (10 queries/month)',
      'Rich Text Editor',
      'Export Options (PDF, Word, plain text)',
      'Project Management',
      'Community support'
    ],
    limits: {
      aiQueries: 10,
      projects: 1
    }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$7',
    period: '/month',
    icon: Zap,
    tier: 1,
    popular: true,
    features: [
      'AI Audiobooks (100k chars/month)',
      '6 Premium Voices (OpenAI TTS)',
      'AI Writing Assistant (100 queries/month)',
      'Character Development Tools',
      'Historical Research',
      'All Free features'
    ],
    limits: {
      aiQueries: 100,
      projects: -1
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$15',
    period: '/month',
    icon: Crown,
    tier: 2,
    features: [
      '2x More Audiobooks (200k chars/month)',
      'HD Audio Quality',
      'Translation Services (100k chars/month)',
      'Advanced AI Tools',
      'Literary Analysis & Ghostwriter',
      'All Basic features'
    ],
    limits: {
      aiQueries: 200,
      projects: -1
    }
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$35',
    period: '/month',
    icon: Infinity,
    tier: 3,
    features: [
      '5x More Audiobooks (500k chars/month)',
      'HD Quality Included (no extra charges)',
      'Full Translation Suite (250k chars/month)',
      'Priority Support',
      'Advanced Literary Analysis',
      'All Premium features'
    ],
    limits: {
      aiQueries: 500,
      projects: -1
    }
  }
];

export default function Subscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Complete subscription mutation
  const completeSubscriptionMutation = useMutation({
    mutationFn: async ({ orderId, tier }: { orderId: string; tier: string }) => {
      const response = await apiRequest('POST', '/api/subscription/complete', { orderId, tier });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Subscription Activated",
        description: "Your subscription has been activated successfully!",
      });
      // Clear localStorage
      localStorage.removeItem('pendingSubscriptionTier');
      // Remove query parameters from URL  
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (error: any) => {
      toast({
        title: "Activation Error",
        description: error.message || "Failed to activate subscription",
        variant: "destructive",
      });
    },
  });

  // Check for PayPal return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const payerId = urlParams.get('PayerID');
    const success = urlParams.get('success');
    
    if (success === 'true' && token) {
      const pendingTier = localStorage.getItem('pendingSubscriptionTier');
      if (pendingTier) {
        completeSubscriptionMutation.mutate({ orderId: token, tier: pendingTier });
      }
    } else if (urlParams.get('cancelled') === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
      // Remove query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch current subscription status with optimized caching
  const { data: subscription, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ tier, demo }: { tier: string; demo?: boolean }) => {
      const response = await apiRequest('POST', '/api/subscription/create', { tier, demo });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to PayPal for payment
      if (data.links) {
        const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;
        if (approvalUrl) {
          // Store tier in localStorage for completion
          localStorage.setItem('pendingSubscriptionTier', selectedPlan || '');
          window.location.href = approvalUrl;
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/cancel', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planId: string, demo = false) => {
    if (planId === 'free' && !demo) return;
    setSelectedPlan(planId);
    createSubscriptionMutation.mutate({ tier: planId, demo });
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      cancelSubscriptionMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentLimit = subscription?.limits[subscription.tier] || 10;
  const usagePercent = Math.min(100, (subscription?.monthlyAiQueries || 0) / currentLimit * 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mb-2">
          Written by writers for writers
        </p>
        <p className="text-muted-foreground text-lg">
          Unlock the full potential of MyNovelCraft with our affordable plans
        </p>
      </div>

      {/* PayPal Sandbox Issue Notice */}
      <Alert className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <div className="space-y-2">
            <p className="font-semibold">PayPal Sandbox Notice</p>
            <p className="text-sm">
              Our PayPal integration is working (order creation successful), but the sandbox checkout may show 
              "Sorry, something went wrong." This is a known PayPal sandbox environment issue.
            </p>
            <div className="flex gap-4 mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/paypal-debug">
                  <Settings className="w-4 h-4 mr-2" />
                  Test PayPal Integration
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpgrade('basic', true)}
                disabled={createSubscriptionMutation.isPending}
              >
                Try Demo Mode (Basic)
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Current Status */}
      {subscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Plan: 
              <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'} className="capitalize">
                {subscription.tier}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>AI Queries This Month</span>
                  <span>{subscription.monthlyAiQueries} / {currentLimit === 1000 ? '1,000' : currentLimit}</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
              
              {subscription.tier !== 'free' && subscription.subscriptionId && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {subscription.status === 'active' ? 'Active until' : 'Status'}: {' '}
                      {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : subscription.status}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancel}
                    disabled={cancelSubscriptionMutation.isPending}
                  >
                    {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                  </Button>
                </div>
              )}

              {!subscription.canUseAI && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    You've reached your monthly AI query limit. Upgrade to continue using AI features.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = subscription?.tier === plan.id;
          
          // Get current tier level for comparison
          const currentTierLevel = plans.find(p => p.id === subscription?.tier)?.tier ?? 0;
          const targetTierLevel = plan.tier;
          
          const isUpgrade = subscription && targetTierLevel > currentTierLevel;
          const isDowngrade = subscription && targetTierLevel < currentTierLevel;

          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''} ${
                isCurrentPlan ? 'bg-primary/5 border-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "secondary" : isDowngrade ? "outline" : "default"}
                    disabled={isCurrentPlan || createSubscriptionMutation.isPending}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrentPlan ? 'Current Plan' : 
                     isUpgrade ? `Upgrade to ${plan.name}` : 
                     isDowngrade ? `Downgrade to ${plan.name}` :
                     plan.id === 'free' ? 'Free Forever' : 
                     createSubscriptionMutation.isPending && selectedPlan === plan.id ? 'Processing...' :
                     `Get ${plan.name}`}
                  </Button>
                  
                  {plan.id !== 'free' && !isCurrentPlan && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      size="sm"
                      disabled={createSubscriptionMutation.isPending}
                      onClick={() => handleUpgrade(plan.id, true)}
                    >
                      Demo Mode (Test)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6 text-left">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens if I exceed my AI query limit?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                AI features will be temporarily disabled until your next billing cycle or until you upgrade to a higher plan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can cancel your subscription at any time. Your access will continue until the end of your current billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Do unused queries roll over?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No, unused AI queries reset each month. We recommend choosing a plan that fits your typical usage.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is my data secure?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Absolutely. All payments are processed securely through PayPal, and your writing data is encrypted and stored safely.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}