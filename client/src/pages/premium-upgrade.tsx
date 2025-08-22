import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionTier {
  name: string;
  price: number;
  audioCharacterLimit: number;
  translationCharacterLimit: number;
  features: string[];
  overageRateAudio: number;
  overageRateTranslation: number;
}

interface UsageSummary {
  tier: SubscriptionTier;
  audioUsage: number;
  audioLimit: number;
  translationUsage: number;
  translationLimit: number;
  currentOverageCharges: number;
}

export default function PremiumUpgrade() {
  const { user } = useAuth();
  
  const { data: usageSummary } = useQuery<UsageSummary>({
    queryKey: ["/api/subscription/usage-summary"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const tiers = {
    free: {
      name: "Free",
      price: 0,
      features: ["Basic writing tools", "Project management", "Export to DOCX/PDF"]
    },
    basic: {
      name: "Basic",
      price: 7,
      features: ["All Free features", "AI writing assistance", "OpenAI TTS Audiobooks (100k chars/month)", "6 premium voices", "Character development", "Historical research"]
    },
    premium: {
      name: "Premium", 
      price: 15,
      features: ["All Basic features", "Premium OpenAI TTS Audiobooks (200k chars/month)", "Standard & HD quality", "Advanced AI tools", "Translation services", "Literary analysis"]
    },
    studio: {
      name: "Studio",
      price: 35,
      features: [
        "All Premium features",
        "Studio OpenAI TTS Audiobooks (500k chars/month)",
        "HD quality included",
        "All 6 OpenAI premium voices",
        "Premium translation services (250k chars/month)",
        "Priority support",
        "Pay-per-use overages"
      ]
    }
  };

  const formatCharacters = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Back</span>
        </div>

        <div className="text-center mb-8">
          <Crown className="mx-auto h-12 w-12 text-purple-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Unlock OpenAI TTS audiobook generation with 6 premium voices and cost controls
          </p>
        </div>

        {/* Current Usage Summary */}
        {usageSummary && usageSummary.tier.name !== 'premium' && (
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                Premium Features Needed
              </CardTitle>
              <CardDescription>
                Audiobook generation and translation require a Premium subscription
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Usage Dashboard for Premium Users */}
        {usageSummary && usageSummary.tier.name === 'premium' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Premium Usage</CardTitle>
              <CardDescription>Current month usage and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audio Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Audiobook Generation</span>
                  <span className="text-sm text-gray-500">
                    {formatCharacters(usageSummary.audioUsage)} / {formatCharacters(usageSummary.audioLimit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${Math.min(100, (usageSummary.audioUsage / usageSummary.audioLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Translation Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Translation Services</span>
                  <span className="text-sm text-gray-500">
                    {formatCharacters(usageSummary.translationUsage)} / {formatCharacters(usageSummary.translationLimit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ 
                      width: `${Math.min(100, (usageSummary.translationUsage / usageSummary.translationLimit) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Overage Charges */}
              {usageSummary.currentOverageCharges > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <span className="text-sm font-medium text-orange-800">
                    Current Overage Charges: ${(usageSummary.currentOverageCharges / 100).toFixed(2)}
                  </span>
                  <p className="text-xs text-orange-600 mt-1">
                    Charges for usage beyond monthly limits
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tiers).map(([key, tier]) => (
            <Card 
              key={key}
              className={`relative ${key === 'premium' ? 'border-2 border-purple-500 shadow-lg' : ''}`}
            >
              {key === 'premium' && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-600">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  {key === 'premium' && <Crown className="h-5 w-5 text-purple-600" />}
                  {tier.name}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${tier.price}
                  </span>
                  <span className="text-gray-500">/month</span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full"
                  variant={key === 'premium' ? 'default' : 'outline'}
                  disabled={usageSummary?.tier.name === key}
                >
                  {usageSummary?.tier.name === key ? 'Current Plan' : `Upgrade to ${tier.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Overage Pricing */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Premium Overage Pricing</CardTitle>
            <CardDescription>
              Transparent pay-per-use pricing when you exceed monthly limits
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Audiobook Generation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                $1.50 per 1,000 characters beyond your 500k monthly limit
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Translation Services</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                $2.00 per 1,000 characters beyond your 250k monthly limit
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}