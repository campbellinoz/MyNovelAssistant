import { useAuth } from './useAuth';
import { type User } from '@shared/schema';

export interface FeatureAccess {
  // AI Features
  aiSuggestions: boolean;
  aiChat: boolean;
  aiLiteraryAnalysis: boolean;
  aiDetection: boolean;
  aiGhostwriter: boolean;
  historicalResearch: boolean;
  
  // Writing Features
  unlimitedProjects: boolean;
  advancedExport: boolean;
  prioritySupport: boolean;
  
  // Query Limits
  monthlyQueryLimit: number;
  hasQueryAccess: boolean;
}

const TIER_FEATURES = {
  free: {
    aiSuggestions: true,
    aiChat: false,
    aiLiteraryAnalysis: false,
    aiDetection: false,
    aiGhostwriter: false,
    historicalResearch: false,
    unlimitedProjects: false,
    advancedExport: false,
    prioritySupport: false,
    monthlyQueryLimit: 10,
  },
  basic: {
    aiSuggestions: true,
    aiChat: true,
    aiLiteraryAnalysis: false,
    aiDetection: false,
    aiGhostwriter: false,
    historicalResearch: true,
    unlimitedProjects: true,
    advancedExport: true,
    prioritySupport: false,
    monthlyQueryLimit: 100,
  },
  premium: {
    aiSuggestions: true,
    aiChat: true,
    aiLiteraryAnalysis: true,
    aiDetection: true,
    aiGhostwriter: true,
    historicalResearch: true,
    unlimitedProjects: true,
    advancedExport: true,
    prioritySupport: true,
    monthlyQueryLimit: 500,
  },
  studio: {
    aiSuggestions: true,
    aiChat: true,
    aiLiteraryAnalysis: true,
    aiDetection: true,
    aiGhostwriter: true,
    historicalResearch: true,
    unlimitedProjects: true,
    advancedExport: true,
    prioritySupport: true,
    monthlyQueryLimit: 1000, // Highest tier gets most AI queries
  },
} as const;

export function useFeatureAccess(): FeatureAccess {
  const { user } = useAuth();
  
  const typedUser = user as User;
  const tier = (typedUser?.subscriptionTier || 'free') as keyof typeof TIER_FEATURES;
  const tierFeatures = TIER_FEATURES[tier] || TIER_FEATURES.free; // Fallback to free if tier not found
  
  const currentQueries = typedUser?.monthlyAiQueries || 0;
  const hasQueryAccess = currentQueries < tierFeatures.monthlyQueryLimit;
  
  return {
    ...tierFeatures,
    hasQueryAccess,
  };
}

export function getUpgradeMessage(feature: keyof FeatureAccess): string {
  switch (feature) {
    case 'aiChat':
      return 'AI Chat is available with Basic, Premium and Studio plans. Upgrade to start conversations with your AI writing assistant.';
    case 'aiLiteraryAnalysis':
      return 'AI Literary Analysis is a Premium/Studio feature. Upgrade to get detailed feedback on your chapters.';
    case 'aiDetection':
      return 'AI Detection is a Premium/Studio feature. Upgrade to analyze content authenticity.';
    case 'aiGhostwriter':
      return 'AI Ghostwriter is a Premium/Studio feature. Upgrade for advanced writing assistance.';
    case 'historicalResearch':
      return 'Historical Research is available with Basic, Premium and Studio plans. Upgrade to access period-specific research.';
    default:
      return 'This feature requires an upgraded plan. Choose Basic, Premium or Studio to unlock more tools.';
  }
}