import textToSpeech from '@google-cloud/text-to-speech';
import { writeFile } from 'fs/promises';
import path from 'path';

// Initialize Google Cloud TTS client with proper credential handling
function createTTSClient() {
  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!credentialsJson || !projectId) {
      console.warn('Google TTS credentials not found. TTS features will be unavailable.');
      return null;
    }

    // Parse the JSON credentials
    const credentials = JSON.parse(credentialsJson);
    
    // Create client with parsed credentials
    return new textToSpeech.TextToSpeechClient({
      credentials,
      projectId
    });
  } catch (error) {
    console.error('Failed to initialize Google TTS client:', error);
    return null;
  }
}

// Google Cloud TTS client
const client = createTTSClient();

export interface GoogleTTSOptions {
  voice: string;
  speed?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0.0
  quality: 'standard' | 'wavenet' | 'neural2' | 'studio';
  gender: 'male' | 'female' | 'neutral';
}

export interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  description: string;
  gender: string;
  sampleText: string;
  quality: 'standard' | 'wavenet' | 'neural2' | 'studio';
  pricing: 'basic' | 'premium' | 'studio';
}

// Google Cloud TTS Voice Options with Tiered Pricing
export const GOOGLE_VOICE_OPTIONS: VoiceOption[] = [
  // BASIC TIER ($9/month) - Standard Voices
  { 
    id: 'en-US-Standard-A', name: 'Madison', accent: 'American (USA)', description: 'Standard Female', 
    gender: 'Female', quality: 'standard', pricing: 'basic',
    sampleText: 'Hello! I\'m Madison, speaking with a clear American accent perfect for your audiobooks.'
  },
  { 
    id: 'en-US-Standard-B', name: 'Mason', accent: 'American (USA)', description: 'Standard Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Hi there! I\'m Mason, delivering your content with a professional American male voice.'
  },
  { 
    id: 'en-GB-Standard-A', name: 'Emma', accent: 'British (UK)', description: 'Standard British Female', 
    gender: 'Female', quality: 'standard', pricing: 'basic',
    sampleText: 'Good day! I\'m Emma, speaking with a lovely British accent for your storytelling needs.'
  },
  { 
    id: 'en-GB-Standard-B', name: 'Oliver', accent: 'British (UK)', description: 'Standard British Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Hello there! I\'m Oliver, bringing you quality British narration with authentic pronunciation.'
  },
  
  // PREMIUM TIER ($19/month) - WaveNet & Neural2 Voices  
  { 
    id: 'en-US-Neural2-A', name: 'Aria', accent: 'American (USA)', description: 'Neural Female', 
    gender: 'Female', quality: 'neural2', pricing: 'premium',
    sampleText: 'Hi! I\'m Aria, using advanced neural technology for incredibly natural speech synthesis.'
  },
  { 
    id: 'en-US-Neural2-D', name: 'Marcus', accent: 'American (USA)', description: 'Neural Male', 
    gender: 'Male', quality: 'neural2', pricing: 'premium',
    sampleText: 'Hello! I\'m Marcus, delivering your audiobooks with cutting-edge neural voice quality.'
  },
  { 
    id: 'en-GB-Neural2-A', name: 'Sophia', accent: 'British (UK)', description: 'Neural British Female', 
    gender: 'Female', quality: 'neural2', pricing: 'premium',
    sampleText: 'Good morning! I\'m Sophia, providing premium British narration with remarkable clarity and emotion.'
  },
  { 
    id: 'en-GB-Neural2-B', name: 'Thomas', accent: 'British (UK)', description: 'Neural British Male', 
    gender: 'Male', quality: 'neural2', pricing: 'premium',
    sampleText: 'Greetings! I\'m Thomas, offering sophisticated British storytelling with neural voice technology.'
  },
  { 
    id: 'en-US-Wavenet-A', name: 'Isabella', accent: 'American (USA)', description: 'WaveNet Female', 
    gender: 'Female', quality: 'wavenet', pricing: 'premium',
    sampleText: 'Hello! I\'m Isabella, using WaveNet technology for beautifully expressive audiobook narration.'
  },
  { 
    id: 'en-US-Wavenet-D', name: 'Alexander', accent: 'American (USA)', description: 'WaveNet Male', 
    gender: 'Male', quality: 'wavenet', pricing: 'premium',
    sampleText: 'Hi there! I\'m Alexander, bringing your stories to life with premium WaveNet voice quality.'
  },
  
  // STUDIO TIER ($39/month) - Studio Voices
  { 
    id: 'en-GB-Studio-B', name: 'Benedict', accent: 'British (UK)', description: 'Studio British Male', 
    gender: 'Male', quality: 'studio', pricing: 'studio',
    sampleText: 'Good day! I\'m Benedict, delivering professional studio-quality British narration with warm, gentle tones.'
  },
  { 
    id: 'en-GB-Studio-C', name: 'Charlotte', accent: 'British (UK)', description: 'Studio British Female', 
    gender: 'Female', quality: 'studio', pricing: 'studio',
    sampleText: 'Good day! I\'m Charlotte, delivering exceptional studio-grade British narration for discerning listeners.'
  },
  { 
    id: 'en-US-Studio-M', name: 'Scarlett', accent: 'American (USA)', description: 'Studio American Female', 
    gender: 'Female', quality: 'studio', pricing: 'studio',
    sampleText: 'Hello! I\'m Scarlett, offering the finest studio-quality American narration for professional audiobooks.'
  },
  { 
    id: 'en-US-Studio-O', name: 'Harrison', accent: 'American (USA)', description: 'Studio American Male', 
    gender: 'Male', quality: 'studio', pricing: 'studio',
    sampleText: 'Greetings! I\'m Harrison, providing premium studio-grade American voice work for exceptional audiobooks.'
  },
  
  // ADDITIONAL BRITISH MALE VOICES - CORRECTED with real male voices only
  { 
    id: 'en-GB-Standard-D', name: 'James', accent: 'British (UK)', description: 'Standard British Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Good afternoon! I\'m James, delivering classic British narration with distinguished pronunciation.'
  },
  { 
    id: 'en-GB-Wavenet-B', name: 'William', accent: 'British (UK)', description: 'WaveNet British Male', 
    gender: 'Male', quality: 'wavenet', pricing: 'premium',
    sampleText: 'Good evening! I\'m William, providing premium WaveNet British narration with exceptional clarity.'
  },
  { 
    id: 'en-GB-Wavenet-D', name: 'Charles', accent: 'British (UK)', description: 'WaveNet British Male', 
    gender: 'Male', quality: 'wavenet', pricing: 'premium',
    sampleText: 'Hello! I\'m Charles, offering sophisticated WaveNet British voice work for professional audiobooks.'
  },
  { 
    id: 'en-GB-Neural2-C', name: 'Henry', accent: 'British (UK)', description: 'Neural2 British Male', 
    gender: 'Male', quality: 'neural2', pricing: 'premium',
    sampleText: 'Greetings! I\'m Henry, using advanced Neural2 technology for natural British storytelling.'
  },
  
  // AUSTRALIAN VOICE - Verified Working
  { 
    id: 'en-AU-Standard-B', name: 'Jack', accent: 'Australian', description: 'Standard Australian Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'G\'day mate! I\'m Jack, delivering authentic Australian storytelling with clear, natural pronunciation.'
  },
  

];

// Pricing per million characters
export const PRICING_TIERS = {
  basic: { cost: 4, name: 'Basic ($9/month)', description: 'Standard quality voices' },
  premium: { cost: 16, name: 'Premium ($19/month)', description: 'Neural & WaveNet voices' },
  studio: { cost: 16, name: 'Studio ($39/month)', description: 'Professional studio voices' }
};

function splitTextForTTS(text: string, maxBytes: number = 4500): string[] {
  // Helper function to get byte length
  const getByteLength = (str: string) => Buffer.byteLength(str, 'utf8');
  
  if (getByteLength(text) <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let chunkEnd = Math.min(currentPos + Math.floor(maxBytes * 0.8), text.length);
    
    if (chunkEnd >= text.length) {
      chunks.push(text.slice(currentPos));
      break;
    }

    // Start with a reasonable chunk size and work backwards to find a good break point
    let testChunk = text.slice(currentPos, chunkEnd);
    
    // Ensure we don't exceed byte limit
    while (getByteLength(testChunk) > maxBytes && chunkEnd > currentPos + 100) {
      chunkEnd -= 50;
      testChunk = text.slice(currentPos, chunkEnd);
    }

    // Find the last sentence end within the safe chunk
    const lastSentence = Math.max(
      testChunk.lastIndexOf('.'),
      testChunk.lastIndexOf('!'),
      testChunk.lastIndexOf('?')
    );

    if (lastSentence > testChunk.length * 0.3) {
      chunkEnd = currentPos + lastSentence + 1;
    } else {
      // Fall back to word boundary
      const lastSpace = testChunk.lastIndexOf(' ');
      if (lastSpace > testChunk.length * 0.3) {
        chunkEnd = currentPos + lastSpace;
      }
    }

    const finalChunk = text.slice(currentPos, chunkEnd);
    
    // Double-check byte limit
    if (getByteLength(finalChunk) > maxBytes) {
      // Emergency fallback: find the largest safe chunk
      let safeEnd = currentPos + 1;
      while (safeEnd < chunkEnd && getByteLength(text.slice(currentPos, safeEnd)) <= maxBytes) {
        safeEnd++;
      }
      chunkEnd = safeEnd - 1;
    }

    chunks.push(text.slice(currentPos, chunkEnd));
    currentPos = chunkEnd;
  }

  return chunks;
}

export async function generateChapterAudio(
  text: string,
  options: GoogleTTSOptions,
  outputPath: string
): Promise<{ success: boolean; filePath?: string; duration?: number; error?: string }> {
  try {
    // Check if Google TTS client is available
    if (!client) {
      return { 
        success: false, 
        error: "Google TTS client not available. Please check your Google Cloud credentials." 
      };
    }

    // Clean and prepare text for TTS
    const cleanText = text
      .replace(/[\*\#\>\<\[\]]/g, '') // Remove markdown characters
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim();

    if (cleanText.length === 0) {
      return { success: false, error: "No content to convert" };
    }

    // Split long text into chunks (Google TTS has a 5000 byte limit)
    const chunks = splitTextForTTS(cleanText, 4500);
    const audioBuffers: Buffer[] = [];

    console.log(`Generating audio for ${chunks.length} chunks with Google TTS...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      // Determine gender from voice ID
      const voiceConfig = GOOGLE_VOICE_OPTIONS.find(v => v.id === options.voice);
      const gender = voiceConfig?.gender.toUpperCase() as 'MALE' | 'FEMALE' | 'NEUTRAL' || 'NEUTRAL';

      const request = {
        input: { text: chunk },
        voice: {
          languageCode: options.voice.startsWith('en-GB') ? 'en-GB' : 'en-US',
          name: options.voice,
          ssmlGender: gender
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: options.speed || 1.0,
          pitch: options.pitch || 0.0
        }
      };

      const [response] = await client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error(`No audio content received for chunk ${i + 1}`);
      }

      audioBuffers.push(response.audioContent as Buffer);
    }

    // Combine audio buffers (simple concatenation for MP3)
    const finalBuffer = Buffer.concat(audioBuffers);
    
    // Write to file
    await writeFile(outputPath, finalBuffer);

    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = cleanText.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60); // in seconds

    console.log(`Google TTS audio generated successfully: ${outputPath} (${estimatedDuration}s estimated)`);

    return {
      success: true,
      filePath: outputPath,
      duration: estimatedDuration
    };

  } catch (error) {
    console.error('Error generating Google TTS audio:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to generate audio'
    };
  }
}

export function calculateGoogleTTSCost(characterCount: number, voiceQuality: 'basic' | 'premium' | 'studio'): number {
  const tier = PRICING_TIERS[voiceQuality];
  return (characterCount / 1000000) * tier.cost;
}

export function getVoicesByTier(tier: 'basic' | 'premium' | 'studio'): VoiceOption[] {
  return GOOGLE_VOICE_OPTIONS.filter(voice => voice.pricing === tier);
}