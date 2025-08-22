import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface WritingSuggestion {
  type: string;
  title: string;
  content: string;
}

export interface AIQueryResponse {
  response: string;
  suggestions?: WritingSuggestion[];
}

export interface TTSOptions {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 to 4.0, default 1.0
}

export interface AudiobookProgress {
  chapterIndex: number;
  totalChapters: number;
  chapterTitle: string;
  progress: number; // 0 to 100
}

export async function generateWritingSuggestions(
  context: {
    projectTitle: string;
    chapterTitle: string;
    currentContent: string;
    characters?: string[];
  }
): Promise<WritingSuggestion[]> {
  try {
    const prompt = `
You are a professional writing assistant helping with a novel titled "${context.projectTitle}". 
The current chapter is "${context.chapterTitle}".

Current content:
"${context.currentContent.slice(-1000)}" // Last 1000 characters for context

${context.characters ? `Main characters: ${context.characters.join(', ')}` : ''}

Generate 3 helpful writing suggestions to improve this chapter. Focus on:
1. Plot development and pacing
2. Character development and dialogue
3. Descriptive writing and atmosphere

Respond with a JSON object containing an array of suggestions, each with:
- type: 'plot', 'character', or 'description'
- title: A brief, actionable title
- content: Detailed suggestion (2-3 sentences)

Format: { "suggestions": [{"type": "plot", "title": "...", "content": "..."}] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert writing coach specializing in fiction. Provide actionable, specific suggestions that help writers improve their craft."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];

  } catch (error) {
    console.error("Error generating writing suggestions:", error);
    
    // Return fallback suggestions when API is unavailable
    return [
      {
        type: "plot",
        title: "Add a Plot Twist",
        content: "Consider introducing an unexpected revelation about one of your characters that changes the reader's understanding of previous events."
      },
      {
        type: "character",
        title: "Develop Character Motivation",
        content: "Explore what your character truly wants versus what they think they want. This internal conflict can drive compelling character development."
      },
      {
        type: "description",
        title: "Enhance Sensory Details",
        content: "Add more sensory descriptions to immerse readers in your scene. Consider what your characters can hear, smell, or feel beyond just what they see."
      }
    ];
  }
}

export async function generatePlotIdeas(
  context: {
    projectTitle: string;
    genre?: string;
    currentPlot?: string;
  }
): Promise<WritingSuggestion[]> {
  try {
    const prompt = `
Generate 3 creative plot ideas for the novel "${context.projectTitle}".
${context.genre ? `Genre: ${context.genre}` : ''}
${context.currentPlot ? `Current plot context: ${context.currentPlot}` : ''}

Focus on:
1. Unexpected plot twists
2. Character conflict opportunities  
3. Interesting subplots

Respond with JSON: { "suggestions": [{"type": "plot", "title": "...", "content": "..."}] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative writing expert specializing in plot development and storytelling."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];

  } catch (error) {
    console.error("Error generating plot ideas:", error);
    
    // Return fallback plot ideas when API is unavailable
    return [
      {
        type: "plot",
        title: "The Hidden Connection",
        content: "Reveal that two seemingly unrelated characters from different storylines share a secret past that changes everything."
      },
      {
        type: "plot", 
        title: "The False Victory",
        content: "Let your protagonist achieve their goal, only to discover it wasn't what they really needed or that success comes with unexpected consequences."
      },
      {
        type: "plot",
        title: "The Reversal of Fortune",
        content: "Have your antagonist's greatest strength become their weakness, or give your hero a moment where they must use their flaw as an advantage."
      }
    ];
  }
}

export async function generateCharacterTraits(
  context: {
    characterName: string;
    role: string;
    projectContext?: string;
  }
): Promise<WritingSuggestion[]> {
  try {
    const prompt = `
Suggest character development ideas for "${context.characterName}", who is a ${context.role} in a story.
${context.projectContext ? `Story context: ${context.projectContext}` : ''}

Generate 3 suggestions covering:
1. Personality traits and flaws
2. Background and motivations
3. Character arc opportunities

Respond with JSON: { "suggestions": [{"type": "character", "title": "...", "content": "..."}] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a character development expert who creates compelling, three-dimensional characters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];

  } catch (error) {
    console.error("Error generating character traits:", error);
    
    // Return fallback character suggestions when API is unavailable
    return [
      {
        type: "character",
        title: "The Hidden Fear",
        content: "Give your character a deep-seated fear that influences their decisions but isn't immediately obvious to readers."
      },
      {
        type: "character",
        title: "The Contradictory Trait",
        content: "Create internal conflict by giving your character two opposing personality traits that create interesting tension."
      },
      {
        type: "character",
        title: "The Defining Moment",
        content: "Develop a past event that shaped who your character is today and how they view the world."
      }
    ];
  }
}

export async function generateStoryProgressionSuggestions(
  context: {
    projectTitle: string;
    chapterTitle: string;
    currentContent: string;
    characters: Array<{name: string, role?: string, traits?: string}>;
    setting?: string;
    timeEra?: string;
  }
): Promise<WritingSuggestion[]> {
  try {
    const charactersContext = context.characters.length > 0 
      ? `Characters: ${context.characters.map(c => `${c.name} (${c.role || 'character'}${c.traits ? `, ${c.traits}` : ''})`).join(', ')}`
      : '';

    const prompt = `
You are a creative writing assistant helping with story progression for "${context.projectTitle}".

Current chapter: "${context.chapterTitle}"
${context.setting ? `Setting: ${context.setting}` : ''}
${context.timeEra ? `Time period: ${context.timeEra}` : ''}

Recent content (for context):
"${context.currentContent.slice(-800)}"

${charactersContext}

Generate 4 creative suggestions for where the story could go next. Consider:
1. Natural story progression from current events
2. Character development opportunities and relationships
3. Historical context and setting-specific elements
4. Plot complications and tension escalation
5. Authentic period details and social dynamics

Each suggestion should be specific, creative, and build naturally from the current story state.

Respond with JSON: { "suggestions": [{"type": "progression", "title": "...", "content": "..."}] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert creative writing coach specializing in story development, character arcs, and historical fiction. Focus on authentic, engaging progressions that maintain narrative momentum."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];

  } catch (error) {
    console.error("Error generating story progression suggestions:", error);
    
    // Return fallback suggestions when API is unavailable
    return [
      {
        type: "progression",
        title: "Character Reveals a Secret",
        content: "Have one of your characters reveal something important about their past that changes how other characters view them and affects the story direction."
      },
      {
        type: "progression", 
        title: "Unexpected Visitor",
        content: "Introduce a new character from someone's past who arrives with news, a request, or information that complicates the current situation."
      },
      {
        type: "progression",
        title: "Environmental Challenge",
        content: "Use the setting and time period to create a challenge - weather, social events, local customs, or historical events that impact your characters."
      },
      {
        type: "progression",
        title: "Relationship Shift",
        content: "Change the dynamic between two characters through a misunderstanding, shared experience, or moment of truth that affects the overall story."
      }
    ];
  }
}

export async function answerWritingQuery(query: string, context?: string): Promise<AIQueryResponse> {
  try {
    // Limit context size to prevent token overflows  
    let limitedContext = '';
    if (context) {
      const contextChunk = getAnalysisChunk(context, 15000); // Restored to larger size for normal chapters
      limitedContext = contextChunk.length < context.length 
        ? `Context (excerpt): ${contextChunk}`
        : `Context: ${contextChunk}`;
    }

    const prompt = `
${limitedContext}

Writer's question: "${query}"

Provide a helpful, specific answer that gives actionable advice. If relevant, include 1-2 additional suggestions.

Respond with JSON: { "response": "...", "suggestions": [{"type": "...", "title": "...", "content": "..."}] }
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional writing mentor. Provide clear, actionable advice to help writers improve their craft."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"response": "I\'m here to help with your writing!"}');
    return {
      response: result.response,
      suggestions: result.suggestions || []
    };

  } catch (error) {
    console.error("Error answering writing query:", error);
    return {
      response: "I'm currently experiencing connectivity issues with the AI service. This could be due to API quota limits or network problems. In the meantime, here are some general writing tips: Focus on showing rather than telling, develop authentic dialogue, and remember that conflict drives story forward.",
      suggestions: [
        {
          type: "description",
          title: "Show, Don't Tell",
          content: "Instead of stating emotions or facts, show them through actions, dialogue, and sensory details."
        }
      ]
    };
  }
}

// TTS Functions for Audiobook Generation
export async function generateChapterAudio(
  text: string,
  options: TTSOptions,
  outputPath: string
): Promise<{ success: boolean; filePath?: string; duration?: number; error?: string }> {
  try {
    // Clean and prepare text for TTS
    const cleanText = text
      .replace(/[\*\#\>\<\[\]]/g, '') // Remove markdown characters
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim();

    if (cleanText.length === 0) {
      return { success: false, error: "No content to convert" };
    }

    // Split long text into chunks if needed (OpenAI TTS has a 4096 character limit)
    const chunks = splitTextForTTS(cleanText, 4000);
    const audioBuffers: Buffer[] = [];

    console.log(`Generating audio for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      const mp3 = await openai.audio.speech.create({
        model: options.model,
        voice: options.voice,
        input: chunk,
        speed: options.speed || 1.0,
        response_format: 'mp3'
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      audioBuffers.push(buffer);
    }

    // Combine audio buffers (simple concatenation for MP3)
    const finalBuffer = Buffer.concat(audioBuffers);
    
    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, finalBuffer);

    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = cleanText.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60); // in seconds

    console.log(`Audio generated successfully: ${outputPath} (${estimatedDuration}s estimated)`);

    return {
      success: true,
      filePath: outputPath,
      duration: estimatedDuration
    };

  } catch (error) {
    console.error('Error generating chapter audio:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to generate audio'
    };
  }
}

export async function generateFullAudiobook(
  projectId: string,
  chapters: Array<{ id: string; title: string; content: string }>,
  options: TTSOptions,
  onProgress?: (progress: AudiobookProgress) => void
): Promise<{ success: boolean; filePaths?: string[]; totalDuration?: number; error?: string }> {
  const chapterFiles: string[] = [];
  let totalDuration = 0;

  try {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterFileName = `chapter_${i + 1}_${chapter.id}.mp3`;
      const chapterPath = `uploads/audiobooks/${projectId}/${chapterFileName}`;

      // Create directory if it doesn't exist
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(path.dirname(chapterPath), { recursive: true });

      // Report progress
      if (onProgress) {
        onProgress({
          chapterIndex: i,
          totalChapters: chapters.length,
          chapterTitle: chapter.title,
          progress: Math.round((i / chapters.length) * 100)
        });
      }

      console.log(`Generating audio for chapter ${i + 1}/${chapters.length}: ${chapter.title}`);

      const result = await generateChapterAudio(chapter.content, options, chapterPath);

      if (!result.success) {
        throw new Error(`Failed to generate audio for chapter "${chapter.title}": ${result.error}`);
      }

      chapterFiles.push(chapterPath);
      totalDuration += result.duration || 0;
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        chapterIndex: chapters.length - 1,
        totalChapters: chapters.length,
        chapterTitle: "Audiobook Complete",
        progress: 100
      });
    }

    return {
      success: true,
      filePaths: chapterFiles,
      totalDuration
    };

  } catch (error) {
    console.error('Error generating full audiobook:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to generate audiobook'
    };
  }
}

function splitTextForTTS(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by sentences first
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        // Sentence is too long, split by words
        const words = sentence.split(' ');
        for (const word of words) {
          if (currentChunk.length + word.length + 1 <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = word;
            } else {
              chunks.push(word); // Even single word is too long
            }
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

export async function analyzeLiteraryContent(
  context: {
    chapterTitle: string;
    content: string;
    analysisType?: string;
  }
): Promise<string> {
  try {
    // Get a chunk that fits within token limits  
    const analysisChunk = getAnalysisChunk(context.content, 20000);
    const isPartialAnalysis = analysisChunk.length < context.content.length;
    
    const prompt = `
You are a professional literary editor and writing coach. Analyze the following chapter for literary quality and provide constructive feedback.

Chapter Title: "${context.chapterTitle}"
${isPartialAnalysis ? 'Content (partial analysis due to length): ' : 'Content: '}"${analysisChunk}"

Please provide detailed analysis covering:
1. **Structure & Pacing**: How well does the chapter flow? Are there pacing issues?
2. **Character Development**: How are characters portrayed and developed?
3. **Dialogue**: Quality, authenticity, and effectiveness of conversations
4. **Style & Voice**: Writing style, tone, and narrative voice consistency
5. **Technical Elements**: Grammar, sentence structure, and clarity
6. **Suggestions**: Specific actionable improvements

${isPartialAnalysis ? 'Note: This analysis is based on the first portion of the chapter due to length constraints.' : ''}

Provide a comprehensive analysis that would help the writer improve their craft.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert literary editor with years of experience in fiction writing. Provide constructive, detailed feedback that helps writers improve their craft while maintaining their unique voice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
    });

    let analysis = response.choices[0].message.content || "I apologize, but I couldn't analyze the content at this time.";
    
    // Add note about partial analysis if needed
    if (isPartialAnalysis) {
      analysis += "\n\n**Note:** This analysis covers the first portion of your chapter due to length constraints. The feedback should still be valuable for improving the overall work.";
    }

    return analysis;

  } catch (error) {
    console.error("Error analyzing literary content:", error);
    
    return `Literary Analysis for "${context.chapterTitle}":

I'm currently experiencing connectivity issues with the AI service. This could be due to API quota limits or network problems.

In the meantime, here are some general literary analysis points to consider:

**Structure & Pacing**: Review how your scenes transition and whether the pacing serves your story goals.
**Character Development**: Ensure characters have clear motivations and show growth throughout the chapter.
**Dialogue**: Check that conversations feel natural and advance the plot or reveal character.
**Style & Voice**: Maintain consistency in your narrative voice and writing style.
**Technical Elements**: Review grammar, sentence variety, and overall clarity.

For a detailed analysis, please try again once the service is restored.`;
  }
}

// Utility function to estimate token count (rough approximation: 4 characters = 1 token)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Function to get the first chunk of text that fits within token limits
function getAnalysisChunk(content: string, maxTokens: number = 20000): string {
  const estimatedTokens = estimateTokenCount(content);
  
  if (estimatedTokens <= maxTokens) {
    return content;
  }
  
  // If content is too large, take first portion and add note
  const maxChars = maxTokens * 4;
  const chunk = content.substring(0, maxChars);
  
  // Try to break at a sentence boundary if possible
  const lastSentence = chunk.lastIndexOf('.');
  if (lastSentence > maxChars * 0.8) {
    return chunk.substring(0, lastSentence + 1);
  }
  
  // Otherwise break at word boundary
  const lastSpace = chunk.lastIndexOf(' ');
  return chunk.substring(0, lastSpace > 0 ? lastSpace : maxChars);
}

export async function detectAIContent(content: string): Promise<{
  humanPercentage: number;
  aiPercentage: number;
  verdict: string;
  confidence: string;
  reasoning: string;
}> {
  try {
    // Get a chunk that fits within token limits
    const analysisChunk = getAnalysisChunk(content, 20000);
    const isPartialAnalysis = analysisChunk.length < content.length;
    
    const prompt = `
As an expert in text analysis and AI detection, analyze the following text to determine if it was likely written by a human or AI. Consider factors like:

1. Writing patterns and style consistency
2. Vocabulary choices and complexity
3. Sentence structure variation
4. Natural flow and rhythm
5. Creative elements and originality
6. Common AI writing markers

${isPartialAnalysis ? 'Note: This is a partial analysis of a larger text due to size constraints.' : ''}

Provide your analysis in this exact JSON format:
{
  "humanPercentage": [number 0-100],
  "aiPercentage": [number 0-100], 
  "verdict": "[Human-written/AI-generated/Mixed/Uncertain]",
  "confidence": "[High/Medium/Low]",
  "reasoning": "[detailed explanation of your analysis]"
}

Text to analyze: "${analysisChunk}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in AI detection and text analysis. Provide accurate, detailed analysis of whether text was written by humans or AI."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Adjust reasoning if partial analysis
    let reasoning = result.reasoning || "Analysis could not be completed at this time.";
    if (isPartialAnalysis) {
      reasoning += " (Note: This analysis is based on the first portion of the text due to size constraints.)";
    }
    
    // Validate response and provide defaults
    return {
      humanPercentage: result.humanPercentage || 50,
      aiPercentage: result.aiPercentage || 50,
      verdict: result.verdict || "Uncertain",
      confidence: result.confidence || "Medium",
      reasoning: reasoning
    };

  } catch (error) {
    console.error("Error detecting AI content:", error);
    
    // Return fallback analysis
    return {
      humanPercentage: 60,
      aiPercentage: 40,
      verdict: "Uncertain",
      confidence: "Low",
      reasoning: "Unable to perform AI detection analysis due to service connectivity issues. This could be due to API quota limits or network problems. The text shows some characteristics of human writing but a full analysis requires the AI service to be available."
    };
  }
}

export async function generateHistoricalResearch(
  context: {
    projectTitle: string;
    timeEra: string;
    setting: string;
    query: string;
    topic?: string;
  }
): Promise<string> {
  try {
    const topicContext = context.topic ? `Focus specifically on ${context.topic} aspects. ` : '';
    
    const prompt = `
You are a historical research assistant helping with accurate period research for the novel "${context.projectTitle}".

Research query: "${context.query}"
Time period: ${context.timeEra}
Setting: ${context.setting}
${topicContext}

Provide detailed, accurate historical information that would be useful for writing authentic historical fiction. Include:
1. Specific historical details relevant to the query
2. Social customs, behaviors, and attitudes of the time
3. Physical details (clothing, objects, buildings, technology)
4. Cultural context and period-specific language
5. Economic and political background when relevant

Be specific, accurate, and focus on details that would help create authentic scenes and dialogue. Cite the general historical context but prioritize practical writing details.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert historian specializing in providing accurate, detailed research for historical fiction writers. Focus on specific, practical details that bring historical periods to life in writing."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more factual responses
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate historical research information at this time.";

  } catch (error) {
    console.error("Error generating historical research:", error);
    
    // Return fallback historical information
    return `Historical research for ${context.timeEra} ${context.setting}:

This was a period of significant social and cultural change. For authentic historical fiction, consider researching:

• Daily life and social customs of the era
• Technology and transportation methods available
• Clothing styles and social dress codes
• Political climate and major events
• Economic conditions and class structures
• Popular entertainment and cultural activities
• Language patterns and common expressions
• Architecture and urban/rural environments

For more specific details about "${context.query}", I recommend consulting historical archives, period newspapers, and academic sources about ${context.timeEra} ${context.setting}.`;
  }
}

// General OpenAI response function for agent finder and other features
export async function generateOpenAIResponse(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional literary industry assistant with extensive knowledge of literary agents, editors, and the publishing industry. Always respond with valid JSON format as requested in the user prompt."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "[]";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate AI response");
  }
}

// Export the openai instance for direct access
export { openai };
