import { db } from "./db";
import { users, usageRecords, type User } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

export interface SubscriptionTier {
  name: string;
  price: number; // monthly price in dollars
  audioCharacterLimit: number; // characters per month
  translationCharacterLimit: number; // characters per month
  features: string[];
  overageRateAudio: number; // cents per character
  overageRateTranslation: number; // cents per character
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    name: "Free",
    price: 0,
    audioCharacterLimit: 0,
    translationCharacterLimit: 0,
    features: ["Basic writing tools", "Project management", "Export to DOCX/PDF"],
    overageRateAudio: 0, // No overage for free tier
    overageRateTranslation: 0
  },
  basic: {
    name: "Basic",
    price: 7,
    audioCharacterLimit: 100000, // 100k characters = Standard OpenAI TTS voices
    translationCharacterLimit: 0,
    features: ["All Free features", "AI writing assistance", "OpenAI TTS Audiobooks (100k chars/month)", "6 high-quality voices", "Character development", "Historical research"],
    overageRateAudio: 1.5, // $15 per 1M chars = $0.015 per 1k chars = 1.5 cents per 1k chars
    overageRateTranslation: 0
  },
  premium: {
    name: "Premium", 
    price: 15,
    audioCharacterLimit: 200000, // 200k characters = Standard & HD OpenAI TTS voices
    translationCharacterLimit: 100000, // 100k characters = Basic translation
    features: ["All Basic features", "Premium OpenAI TTS Audiobooks (200k chars/month)", "Standard & HD quality options", "All 6 OpenAI voices", "Translation services (100k chars/month)", "Advanced AI tools"],
    overageRateAudio: 1.5, // $15 per 1M chars standard, $30 per 1M chars HD
    overageRateTranslation: 2.0 // $0.02 per 1000 characters
  },
  studio: {
    name: "Studio",
    price: 35,
    audioCharacterLimit: 500000, // 500k characters = Full OpenAI TTS access
    translationCharacterLimit: 250000, // 250k characters = Premium translation
    features: [
      "All Premium features", 
      "Studio Quality OpenAI TTS Audiobooks (500k chars/month)", 
      "All OpenAI TTS voice options with HD quality",
      "Unlimited standard quality, HD quality included",
      "Premium translation services (250k chars/month)",
      "Priority support",
      "Advanced literary analysis"
    ],
    overageRateAudio: 1.5, // Standard $15 per 1M chars, HD $30 per 1M chars
    overageRateTranslation: 2.0 // $0.02 per 1000 characters
  }
};

export class SubscriptionManager {
  /**
   * Check if user can perform an action with given character count
   */
  async canPerformAction(
    userId: string, 
    serviceType: 'audiobook' | 'translation', 
    characterCount: number
  ): Promise<{
    canProceed: boolean;
    withinLimit: boolean;
    estimatedCost: number; // in cents
    overageCost: number; // in cents
    remainingQuota: number; // characters
  }> {
    const user = await this.getUser(userId);
    const tierName = user.subscriptionTier || 'free';
    
    // Admin bypass for campbellinoz@gmail.com
    if (user.email === 'campbellinoz@gmail.com') {
      return {
        canProceed: true,
        withinLimit: true,
        estimatedCost: 0,
        overageCost: 0,
        remainingQuota: 999999999 // Effectively unlimited
      };
    }
    const tier = SUBSCRIPTION_TIERS[tierName];
    
    if (!tier) {
      throw new Error(`Invalid subscription tier: ${tierName}`);
    }

    // Admin gets unlimited access to all features
    console.log(`Subscription check for user: ${user.id}, email: ${user.email}, service: ${serviceType}`);
    if (user.email === 'campbellinoz@gmail.com') {
      console.log('Admin override applied - unlimited access granted');
      return {
        canProceed: true,
        withinLimit: true,
        estimatedCost: 0,
        overageCost: 0,
        remainingQuota: 999999999 // Unlimited for admin
      };
    }

    // Free/Basic/Pro users cannot use premium features
    if ((serviceType === 'audiobook' || serviceType === 'translation') && 
        user.subscriptionTier !== 'premium') {
      return {
        canProceed: false,
        withinLimit: false,
        estimatedCost: 0,
        overageCost: 0,
        remainingQuota: 0
      };
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyUsage = await this.getMonthlyUsage(userId, serviceType, currentMonth);
    
    const limit = serviceType === 'audiobook' 
      ? tier.audioCharacterLimit 
      : tier.translationCharacterLimit;
    
    const remainingQuota = Math.max(0, limit - monthlyUsage);
    const overageCharacters = Math.max(0, characterCount - remainingQuota);
    const withinLimitCharacters = characterCount - overageCharacters;
    
    // Calculate costs
    const baseCharactersUsed = Math.min(characterCount, remainingQuota);
    const overageRate = serviceType === 'audiobook' 
      ? tier.overageRateAudio 
      : tier.overageRateTranslation;
    
    const overageCost = Math.ceil(overageCharacters * overageRate / 10); // Convert to cents
    const estimatedCost = overageCost; // Base usage is covered by subscription
    
    return {
      canProceed: true, // Premium users can always proceed with pay-per-use
      withinLimit: overageCharacters === 0,
      estimatedCost,
      overageCost,
      remainingQuota
    };
  }

  /**
   * Record usage after successful operation
   */
  async recordUsage(
    userId: string,
    serviceType: 'audiobook' | 'translation',
    resourceId: string,
    characterCount: number,
    costCents: number,
    wasOverage: boolean
  ): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    await db.insert(usageRecords).values({
      userId,
      serviceType,
      resourceId,
      characterCount,
      costCents,
      wasOverage,
      billingMonth: currentMonth
    });

    // Update user's monthly tracking
    await this.updateUserUsage(userId, serviceType, characterCount);
  }

  /**
   * Get monthly usage for a specific service
   */
  private async getMonthlyUsage(
    userId: string, 
    serviceType: 'audiobook' | 'translation',
    month: string
  ): Promise<number> {
    const records = await db
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          eq(usageRecords.serviceType, serviceType),
          eq(usageRecords.billingMonth, month)
        )
      );

    return records.reduce((total, record) => total + (record.characterCount || 0), 0);
  }

  /**
   * Update user's monthly usage counters
   */
  private async updateUserUsage(
    userId: string,
    serviceType: 'audiobook' | 'translation',
    characterCount: number
  ): Promise<void> {
    const user = await this.getUser(userId);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    
    // Reset monthly counters if it's a new month
    const userMonth = user.monthlyResetDate?.toISOString().slice(0, 7);
    if (userMonth !== currentMonth) {
      await db.update(users)
        .set({
          monthlyAudioCharacters: 0,
          monthlyTranslationCharacters: 0,
          currentMonthOverageCharges: 0,
          monthlyResetDate: now
        })
        .where(eq(users.id, userId));
    }

    // Update the appropriate counter
    const updateData = serviceType === 'audiobook'
      ? { monthlyAudioCharacters: (user.monthlyAudioCharacters || 0) + characterCount }
      : { monthlyTranslationCharacters: (user.monthlyTranslationCharacters || 0) + characterCount };

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  private async getUser(userId: string): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  /**
   * Get subscription tier information
   */
  getTierInfo(tierName: string): SubscriptionTier {
    return SUBSCRIPTION_TIERS[tierName] || SUBSCRIPTION_TIERS.free;
  }

  /**
   * Get user's current usage summary
   */
  async getUserUsageSummary(userId: string): Promise<{
    tier: SubscriptionTier;
    audioUsage: number;
    audioLimit: number;
    translationUsage: number;
    translationLimit: number;
    currentOverageCharges: number;
  }> {
    const user = await this.getUser(userId);
    const tier = this.getTierInfo(user.subscriptionTier || 'free');
    
    return {
      tier,
      audioUsage: user.monthlyAudioCharacters || 0,
      audioLimit: tier.audioCharacterLimit,
      translationUsage: user.monthlyTranslationCharacters || 0,
      translationLimit: tier.translationCharacterLimit,
      currentOverageCharges: user.currentMonthOverageCharges || 0
    };
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();