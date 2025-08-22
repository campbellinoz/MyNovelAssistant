import { generateChapterAudio, type OpenAITTSOptions } from './openai-tts';
import path from 'path';
import fs from 'fs/promises';

export interface AudiobookProgress {
  chapterIndex: number;
  totalChapters: number;
  chapterTitle: string;
  progress: number; // 0 to 100
}

export async function generateFullAudiobook(
  projectId: string,
  chapters: Array<{ id: string; title: string; content: string }>,
  options: OpenAITTSOptions,
  onProgress?: (progress: AudiobookProgress) => void
): Promise<{ success: boolean; filePaths?: string[]; totalDuration?: number; error?: string }> {
  const chapterFiles: string[] = [];
  let totalDuration = 0;

  try {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      // Sanitize filename to remove problematic characters
      const sanitizedTitle = chapter.title
        .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length

      const chapterFileName = `chapter_${i + 1}_${sanitizedTitle}_${chapter.id.slice(0, 8)}.mp3`;
      const chapterPath = `uploads/audiobooks/${projectId}/${chapterFileName}`;

      // Create directory if it doesn't exist
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

      console.log(`Generating OpenAI TTS audio for chapter ${i + 1}/${chapters.length}: ${chapter.title}`);

      // Skip empty chapters
      if (!chapter.content || chapter.content.trim().length === 0) {
        console.log(`Skipping empty chapter: ${chapter.title}`);
        continue;
      }

      // Prepend chapter title to content for more polished audiobook experience
      const contentWithTitle = `${chapter.title}. ${chapter.content}`;

      // Generate audio for this chapter using OpenAI TTS
      const result = await generateChapterAudio(
        contentWithTitle,
        options,
        chapterPath
      );

      if (result.success && result.filePath) {
        chapterFiles.push(result.filePath);
        totalDuration += result.duration || 0;
        console.log(`✅ Chapter ${i + 1} completed: ${result.filePath} (${result.duration}s)`);
      } else {
        console.error(`❌ Chapter ${i + 1} failed: ${result.error}`);
        throw new Error(`Failed to generate audio for chapter ${i + 1}: ${result.error}`);
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        chapterIndex: chapters.length,
        totalChapters: chapters.length,
        chapterTitle: "Complete",
        progress: 100
      });
    }

    console.log(`OpenAI TTS audiobook generation complete! Generated ${chapterFiles.length} chapters, total duration: ${totalDuration}s`);

    return {
      success: true,
      filePaths: chapterFiles,
      totalDuration
    };

  } catch (error) {
    console.error('Error generating audiobook:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}