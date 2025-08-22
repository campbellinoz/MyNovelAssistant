import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useFeatureAccess, getUpgradeMessage, type FeatureAccess } from '@/hooks/useFeatureAccess';

interface FeatureGateProps {
  feature: keyof FeatureAccess;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export default function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const featureAccess = useFeatureAccess();
  const hasAccess = featureAccess[feature];
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (!showUpgradePrompt) {
    return null;
  }
  
  return (
    <Card className="border-2 border-dashed border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-amber-600" />
          Premium Feature
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 mb-4">
          {getUpgradeMessage(feature)}
        </p>
        <Link href="/subscription">
          <Button className="w-full" variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}