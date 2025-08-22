import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OpenAITTSOptions {
  voice: string;
  speed?: number; // 0.25 to 4.0, default 1.0
  quality: 'standard' | 'hd';
  model: 'tts-1' | 'tts-1-hd';
}

export interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  description: string;
  gender: 'Male' | 'Female';
  quality: 'standard' | 'hd';
  pricing: 'basic' | 'premium';
  sampleText: string;
}

// OpenAI TTS Voice Options
export const OPENAI_VOICE_OPTIONS: VoiceOption[] = [
  // BASIC TIER ($9/month) - Standard Quality TTS-1
  { 
    id: 'alloy', name: 'Alloy', accent: 'American (USA)', description: 'Balanced, Professional Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Hello! I\'m Alloy, offering clear and professional narration for your audiobooks with balanced tone.'
  },
  { 
    id: 'echo', name: 'Echo', accent: 'American (USA)', description: 'Warm, Friendly Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Hi there! I\'m Echo, bringing warmth and friendliness to your storytelling with natural speech.'
  },
  { 
    id: 'fable', name: 'Fable', accent: 'British-Irish Blend', description: 'Soft, Gentle Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Good day! I\'m Fable, perfect for gentle storytelling with a soft British-Irish accent.'
  },
  { 
    id: 'nova', name: 'Nova', accent: 'American (USA)', description: 'Energetic, Young Female', 
    gender: 'Female', quality: 'standard', pricing: 'basic',
    sampleText: 'Hello! I\'m Nova, bringing energy and youthful enthusiasm to your narratives.'
  },
  { 
    id: 'onyx', name: 'Onyx', accent: 'American (USA)', description: 'Deep, Authoritative Male', 
    gender: 'Male', quality: 'standard', pricing: 'basic',
    sampleText: 'Greetings! I\'m Onyx, delivering deep, authoritative American narration perfect for compelling audiobooks.'
  },
  { 
    id: 'shimmer', name: 'Shimmer', accent: 'American (USA)', description: 'Smooth, Elegant Female', 
    gender: 'Female', quality: 'standard', pricing: 'basic',
    sampleText: 'Hello! I\'m Shimmer, providing smooth and elegant narration with refined American pronunciation.'
  },

  
  // PREMIUM TIER ($19/month) - HD Quality TTS-1-HD  
  { 
    id: 'alloy-hd', name: 'Alloy HD', accent: 'American (USA)', description: 'Enhanced Professional Male - Crystal Clear', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Alloy HD, offering enhanced clarity and professional narration with superior audio quality for your audiobooks.'
  },
  { 
    id: 'echo-hd', name: 'Echo HD', accent: 'American (USA)', description: 'Enhanced Warm Male - Rich & Friendly', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Hi there! I\'m Echo HD, bringing enhanced warmth and friendliness with superior audio quality to your storytelling.'
  },
  { 
    id: 'fable-hd', name: 'Fable HD', accent: 'British-Irish Blend', description: 'Enhanced Gentle Male - Refined & Soft', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Good day! I\'m Fable HD, perfect for gentle storytelling with enhanced British-Irish accent and superior clarity.'
  },
  { 
    id: 'nova-hd', name: 'Nova HD', accent: 'American (USA)', description: 'Enhanced Energetic Female - Vibrant & Clear', 
    gender: 'Female', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Nova HD, bringing enhanced energy and youthful enthusiasm with crystal-clear audio quality.'
  },
  { 
    id: 'onyx-hd', name: 'Onyx HD', accent: 'American (USA)', description: 'Enhanced Authoritative Male - Deep & Rich', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Greetings! I\'m Onyx HD, delivering enhanced deep, authoritative American narration with superior audio quality.'
  },
  { 
    id: 'shimmer-hd', name: 'Shimmer HD', accent: 'American (USA)', description: 'Enhanced Elegant Female - Smooth & Refined', 
    gender: 'Female', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Shimmer HD, providing enhanced smooth and elegant narration with superior audio quality and refined pronunciation.'
  },

  // NEW 2024/2025 EXPRESSIVE VOICES - Premium Tier
  { 
    id: 'ash', name: 'Ash', accent: 'American (USA)', description: 'Expressive Male - Versatile & Dynamic', 
    gender: 'Male', quality: 'standard', pricing: 'premium',
    sampleText: 'Hello! I\'m Ash, one of OpenAI\'s new expressive voices, bringing dynamic range and versatility to your audiobook narration.'
  },
  { 
    id: 'ash-hd', name: 'Ash HD', accent: 'American (USA)', description: 'Enhanced Expressive Male - Superior Dynamic Range', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Ash HD, delivering enhanced expressive narration with superior audio quality and dynamic emotional range.'
  },
  { 
    id: 'ballad', name: 'Ballad', accent: 'American (USA)', description: 'Expressive Female - Melodic & Emotional', 
    gender: 'Female', quality: 'standard', pricing: 'premium',
    sampleText: 'Hello! I\'m Ballad, bringing melodic expressiveness and emotional depth to your storytelling with natural, flowing narration.'
  },
  { 
    id: 'ballad-hd', name: 'Ballad HD', accent: 'American (USA)', description: 'Enhanced Expressive Female - Rich Emotional Range', 
    gender: 'Female', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Ballad HD, offering enhanced melodic expressiveness with superior audio quality and rich emotional depth.'
  },
  { 
    id: 'coral', name: 'Coral', accent: 'American (USA)', description: 'Expressive Female - Warm & Adaptable', 
    gender: 'Female', quality: 'standard', pricing: 'premium',
    sampleText: 'Hello! I\'m Coral, providing warm, adaptable narration with expressive range that brings characters and stories to life.'
  },
  { 
    id: 'coral-hd', name: 'Coral HD', accent: 'American (USA)', description: 'Enhanced Expressive Female - Superior Warmth & Clarity', 
    gender: 'Female', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Coral HD, delivering enhanced warm, adaptable narration with superior audio quality and expressive character range.'
  },
  { 
    id: 'sage', name: 'Sage', accent: 'American (USA)', description: 'Expressive Male - Wise & Controlled', 
    gender: 'Male', quality: 'standard', pricing: 'premium',
    sampleText: 'Hello! I\'m Sage, offering wise, controlled narration with expressive emotional range, perfect for thoughtful storytelling.'
  },
  { 
    id: 'sage-hd', name: 'Sage HD', accent: 'American (USA)', description: 'Enhanced Expressive Male - Superior Wisdom & Depth', 
    gender: 'Male', quality: 'hd', pricing: 'premium',
    sampleText: 'Hello! I\'m Sage HD, providing enhanced wise, controlled narration with superior audio quality and expressive emotional depth.'
  },
];

// Pricing per million characters
export const PRICING_TIERS = {
  basic: { cost: 15, name: 'Basic ($9/month)', description: 'Standard quality voices' },
  premium: { cost: 30, name: 'Premium ($19/month)', description: 'HD quality voices' }
};

function splitTextForTTS(text: string, maxChars: number = 4000): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let chunkEnd = currentPos + maxChars;
    
    if (chunkEnd >= text.length) {
      chunks.push(text.slice(currentPos));
      break;
    }

    // Find the last sentence end within the chunk
    const chunk = text.slice(currentPos, chunkEnd);
    const lastSentence = Math.max(
      chunk.lastIndexOf('.'),
      chunk.lastIndexOf('!'),
      chunk.lastIndexOf('?')
    );

    if (lastSentence > maxChars * 0.5) {
      chunkEnd = currentPos + lastSentence + 1;
    } else {
      // Fall back to word boundary
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > maxChars * 0.5) {
        chunkEnd = currentPos + lastSpace;
      }
    }

    chunks.push(text.slice(currentPos, chunkEnd));
    currentPos = chunkEnd;
  }

  return chunks;
}

export async function generateChapterAudio(
  text: string,
  options: OpenAITTSOptions,
  outputPath: string
): Promise<{ success: boolean; filePath?: string; duration?: number; error?: string }> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return { 
        success: false, 
        error: "OpenAI API key not available. Please check your API key configuration." 
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

    // Split long text into chunks for processing
    const chunks = splitTextForTTS(cleanText, 4000);
    const audioBuffers: Buffer[] = [];

    console.log(`🔄 Generating audio for ${chunks.length} chunks with OpenAI TTS...`);
    console.log(`📊 Original text: ${text.length} chars, Clean text: ${cleanText.length} chars`);
    chunks.forEach((chunk, i) => {
      console.log(`📝 Chunk ${i + 1}: ${chunk.length} chars - "${chunk.substring(0, 50)}..."`);
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      // Map HD voices to base voices for OpenAI API
      const baseVoice = options.voice.replace('-hd', '') as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage';
      const model = options.quality === 'hd' || options.voice.includes('-hd') ? 'tts-1-hd' : 'tts-1';

      const mp3Response = await openai.audio.speech.create({
        model,
        voice: baseVoice,
        input: chunk,
        speed: options.speed || 1.0,
        response_format: 'mp3'
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      audioBuffers.push(buffer);
    }

    // Combine audio buffers (simple concatenation for MP3)
    const finalBuffer = Buffer.concat(audioBuffers);
    
    // Write to file
    await writeFile(outputPath, finalBuffer);

    // Estimate duration (rough calculation: ~150 words per minute, ~5 chars per word)
    const estimatedDuration = Math.round((cleanText.length / 5) / 150 * 60);

    console.log(`OpenAI TTS audio generated successfully: ${outputPath} (${estimatedDuration}s estimated)`);

    return {
      success: true,
      filePath: outputPath,
      duration: estimatedDuration
    };

  } catch (error) {
    console.error('Error generating OpenAI TTS audio:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to generate audio'
    };
  }
}

// Preview function for voice samples
export async function generateVoicePreview(
  voiceId: string, 
  sampleText: string
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { 
        success: false, 
        error: "OpenAI API key not available" 
      };
    }

    // Map HD voices to base voices for OpenAI API
    const baseVoice = voiceId.replace('-hd', '') as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage';
    const model = voiceId.includes('-hd') ? 'tts-1-hd' : 'tts-1';

    const mp3Response = await openai.audio.speech.create({
      model,
      voice: baseVoice,
      input: sampleText,
      speed: 1.0,
      response_format: 'mp3'
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const audioUrl = `data:audio/mp3;base64,${buffer.toString('base64')}`;

    return {
      success: true,
      audioUrl
    };

  } catch (error) {
    console.error('Error generating voice preview:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to generate preview'
    };
  }
}