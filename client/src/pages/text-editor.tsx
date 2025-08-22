import { useState, useRef, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import FeatureGate from '@/components/feature-gate';
import { 
  Save, 
  ArrowLeft, 
  Bold, 
  Italic, 
  Underline,
  FileText,
  RotateCcw,
  RotateCw,
  Search,
  Replace,
  Eye,
  EyeOff,
  Palette,
  Timer,
  Target,
  Indent,
  BookCheck,
  Shield,
  Type,
  Moon,
  Sun,
  PenTool,
  Book,
  Clock
} from 'lucide-react';
import type { Chapter, Project } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

type WritingMode = 'normal' | 'focus' | 'distraction-free';
type Theme = 'light' | 'dark' | 'sepia';

interface WritingSession {
  startTime: Date;
  wordCount: number;
  target: number;
}

export default function TextEditor() {
  const [, params] = useRoute('/text-editor/:chapterId');
  const [, setLocation] = useLocation();
  const chapterId = params?.chapterId;

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [writingMode, setWritingMode] = useState<WritingMode>('normal');
  const [theme, setTheme] = useState<Theme>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [writingSession, setWritingSession] = useState<WritingSession | null>(null);
  const [sessionTarget, setSessionTarget] = useState(500);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentLineSpacing, setCurrentLineSpacing] = useState<'single' | '1.5' | 'double'>(() => {
    const saved = localStorage.getItem('textEditor-lineSpacing');
    return (saved as 'single' | '1.5' | 'double') || 'single';
  });
  const [isLiteraryEditorOpen, setIsLiteraryEditorOpen] = useState(false);
  const [literaryEditorInput, setLiteraryEditorInput] = useState('');
  const [literaryEditorMessages, setLiteraryEditorMessages] = useState<Array<{
    type: 'user' | 'assistant' | 'writer';
    content: string;
    source?: string;
  }>>([]);
  const [isLiteraryEditorLoading, setIsLiteraryEditorLoading] = useState(false);
  const [literaryEditorProgress, setLiteraryEditorProgress] = useState(0);
  const [isWriterConsultantLoading, setIsWriterConsultantLoading] = useState(false);

  // AI Ghostwriter states
  const [isGhostwriterOpen, setIsGhostwriterOpen] = useState(false);
  const [ghostwriterMessages, setGhostwriterMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);
  const [ghostwriterInput, setGhostwriterInput] = useState('');
  const [isGhostwriterLoading, setIsGhostwriterLoading] = useState(false);

  // Word Tools states
  const [wordTools, setWordTools] = useState<{
    isOpen: boolean;
    word: string;
    position: { x: number; y: number };
    mode: 'menu' | 'thesaurus' | 'spellcheck';
    spellCheckResult?: {
      word: string;
      suggestions: string[];
      isCorrect: boolean;
    };
  }>({
    isOpen: false,
    word: '',
    position: { x: 0, y: 0 },
    mode: 'menu'
  });
  const [selectedWordRange, setSelectedWordRange] = useState<{ start: number; end: number } | null>(null);
  const [lastSelection, setLastSelection] = useState<string>('');
  const [thesaurusData, setThesaurusData] = useState<any>(null);
  const [isThesaurusLoading, setIsThesaurusLoading] = useState(false);
  const [isAiDetectionLoading, setIsAiDetectionLoading] = useState(false);
  const [aiDetectionProgress, setAiDetectionProgress] = useState(0);
  const [aiDetectionResult, setAiDetectionResult] = useState<{
    humanPercentage: number;
    aiPercentage: number;
    verdict: string;
    confidence: string;
    reasoning: string;
  } | null>(null);
  const [isAiDetectionOpen, setIsAiDetectionOpen] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const richEditorRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevChapterRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const featureAccess = useFeatureAccess();

  // Utility functions for text processing
  const getWordCount = (text: string): number => {
    // Strip HTML tags and decode HTML entities for accurate word count
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string): number => {
    // Count characters in plain text, not HTML markup
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    return plainText.length;
  };

  const getReadingTime = (text: string): number => {
    const words = getWordCount(text);
    return Math.ceil(words / 200);
  };

  // Fetch chapter data
  const { data: chapter, isLoading: chapterLoading } = useQuery({
    queryKey: ['/api/chapters', chapterId],
    enabled: !!chapterId,
  });

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ['/api/projects', (chapter as any)?.projectId],
    enabled: !!(chapter as any)?.projectId,
  });

  // Initialize content when chapter loads - ONE TIME ONLY
  useEffect(() => {
    if (chapter && !content && !title) {
      console.log('🎯 ONE-TIME INITIALIZATION - Setting initial content');
      setContent((chapter as any).content || '');
      setTitle((chapter as any).title || '');
    }
  }, [chapter]);

  // Keyboard shortcuts for all features
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            setIsSearchOpen(!isSearchOpen);
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            handleTextFormat('bold');
            break;
          case 'i':  
            e.preventDefault();
            handleTextFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            handleTextFormat('underline'); 
            break;
        }
      }
      if (e.key === 'Escape' && writingMode === 'distraction-free') {
        setWritingMode('normal');
      }
    };

    // Global selection tracking
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const text = selection.toString().trim();
        console.log('🔍 GLOBAL SELECTION CAPTURED:', `"${text}"`);
        setLastSelection(text);
      } else {
        // Clear selection if nothing is selected
        if (lastSelection) {
          console.log('🗑️ CLEARING STALE SELECTION');
          setLastSelection('');
        }
      }
    };

    // Clear selection on clicks outside of selected text
    const handleDocumentClick = (e: MouseEvent) => {
      // Only clear if clicking in the editor area but not maintaining selection
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          if (lastSelection) {
            console.log('👆 CLICK DETECTED - Clearing selection');
            setLastSelection('');
          }
        }
      }, 10);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [writingMode]);

  // Auto-save mutation
  const updateChapterMutation = useMutation({
    mutationFn: async ({ content, title }: { content: string; title: string }) => {
      return apiRequest('PATCH', `/api/chapters/${chapterId}`, { content, title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chapters', chapterId] });
      if ((chapter as any)?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', (chapter as any).projectId, 'chapters', 'metadata'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', (chapter as any).projectId] });
      }
    },
  });

  // Initialize writing session
  useEffect(() => {
    const startSession = () => {
      setWritingSession({
        startTime: new Date(),
        wordCount: getWordCount(content),
        target: sessionTarget
      });
    };
    startSession();
  }, [chapterId]);

  // Improved auto-save functionality - lightweight and non-intrusive
  useEffect(() => {
    if (!chapter) {
      return; // No chapter to save to
    }
    
    const autoSave = setTimeout(() => {
      // Only check if user is actively typing right now
      if (isUserTyping) {
        return; // Skip if actively typing
      }
      
      const currentChapterContent = (chapter as any)?.content || '';
      const currentChapterTitle = (chapter as any)?.title || '';
      
      // Save if content has actually changed
      if (content !== currentChapterContent || title !== currentChapterTitle) {
        updateChapterMutation.mutate({ content, title });
      }
    }, 3000); // Reduced to 3 seconds for better responsiveness

    return () => clearTimeout(autoSave);
  }, [content, title, chapter, isUserTyping]);

  const handleContentChange = (newContent: string) => {
    // Mark user as typing
    setIsUserTyping(true);
    
    // Clear previous timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset typing flag after user stops typing for 2 seconds (optimal balance)
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 2000);
    
    // Add to undo stack before changing
    if (content !== newContent) {
      setUndoStack(prev => [...prev.slice(-19), content]); // Keep last 20 states
      setRedoStack([]); // Clear redo stack on new change
    }
    setContent(newContent);
  };

  const wordCount = getWordCount(content);
  const sessionWordProgress = writingSession ? wordCount - writingSession.wordCount : 0;
  const sessionProgressPercent = writingSession ? Math.min(100, (sessionWordProgress / writingSession.target) * 100) : 0;

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, content]);
      setUndoStack(prev => prev.slice(0, -1));
      setContent(lastState);
      if (richEditorRef.current) {
        richEditorRef.current.innerHTML = lastState;
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, content]);
      setRedoStack(prev => prev.slice(0, -1));
      setContent(nextState);
      if (richEditorRef.current) {
        richEditorRef.current.innerHTML = nextState;
      }
    }
  };

  const handleSave = () => {
    updateChapterMutation.mutate({ content, title });
    toast({
      title: "Saved",
      description: "Your chapter has been saved successfully.",
    });
  };

  const handleTextFormat = (format: 'bold' | 'italic' | 'underline') => {
    if (!richEditorRef.current) return;
    
    richEditorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "No Text Selected",
        description: "Please select text to apply formatting.",
        variant: "destructive"
      });
      return;
    }

    let command = '';
    switch (format) {
      case 'bold':
        command = 'bold';
        break;
      case 'italic':
        command = 'italic';
        break;
      case 'underline':
        command = 'underline';
        break;
    }

    document.execCommand(command, false);
    
    const newContent = richEditorRef.current.innerHTML;
    handleContentChange(newContent);
    
    toast({
      title: "Text Formatted",
      description: `Applied ${format} formatting to selected text.`,
    });
  };

  const handleLineSpacing = (spacing: 'single' | '1.5' | 'double') => {
    if (!richEditorRef.current) return;
    
    richEditorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(richEditorRef.current);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    setCurrentLineSpacing(spacing);
    localStorage.setItem('textEditor-lineSpacing', spacing);
    
    const spacingLabels = {
      'single': 'Single',
      '1.5': '1.5x',
      'double': 'Double'
    };
    
    toast({
      title: "Line Spacing Updated",
      description: `Applied ${spacingLabels[spacing]} line spacing to entire chapter (saved for future sessions)`,
    });
  };

  const handleIndentLines = () => {
    if (!richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const selectedText = selection.toString();
      
      if (selectedText) {
        const indentedText = selectedText.split('\n').map(line => {
          if (line.trim().length === 0) return line;
          return '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + line;
        }).join('<br>');
        
        document.execCommand('insertHTML', false, indentedText);
        handleContentChange(editor.innerHTML);
        
        toast({
          title: "Lines Indented",
          description: "Added 1.27cm indentation to selected lines",
        });
      } else {
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
        handleContentChange(editor.innerHTML);
        
        toast({
          title: "Line Indented",
          description: "Added 1.27cm indentation",
        });
      }
    }
  };

  // Progress simulation helper
  const simulateProgress = (setProgress: (progress: number) => void, duration: number = 20000) => {
    const interval = 100; // Update every 100ms
    const steps = duration / interval;
    const increment = 100 / steps;
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 95) {
        setProgress(95); // Cap at 95%, final 5% when request completes
        clearInterval(progressInterval);
      } else {
        setProgress(Math.min(currentProgress, 95));
      }
    }, interval);

    return progressInterval;
  };

  // Literary Editor handlers
  const handleLiteraryEditorAnalysis = async () => {
    if (!content.trim()) {
      toast({
        title: "No Content",
        description: "Please write some content first before requesting analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsLiteraryEditorLoading(true);
    setLiteraryEditorProgress(0);
    const progressInterval = simulateProgress(setLiteraryEditorProgress, 20000);

    try {
      console.log('Starting literary analysis for chapter:', title);
      console.log('Project ID:', (chapter as any)?.projectId);
      
      const analysisPrompt = `As a professional literary editor, please analyze this chapter and provide detailed feedback on:

1. **Story Structure**: Pacing, plot development, and narrative flow
2. **Character Development**: Character voices, consistency, and growth
3. **Dialogue**: Authenticity, purpose, and effectiveness
4. **Prose Style**: Writing quality, tone, and clarity
5. **Technical Elements**: Grammar, punctuation, and sentence structure

Please provide specific examples and actionable suggestions for improvement.

Chapter Title: ${title}
Chapter Content: ${content}`;

      const response = await apiRequest('POST', '/api/ai/query', {
        query: analysisPrompt,
        context: {
          projectId: (chapter as any)?.projectId,
          chapterId: chapterId,
          type: "literary_analysis"
        }
      });

      const data = await response.json();
      console.log('Literary analysis response:', data);

      clearInterval(progressInterval);
      setLiteraryEditorProgress(100);

      setLiteraryEditorMessages(prev => [
        ...prev,
        { type: 'user', content: 'Analyze this chapter' },
        { type: 'assistant', content: data.response, source: 'Literary Editor' }
      ]);
      setIsLiteraryEditorOpen(true);

      // Automatically get writer consultant response
      setTimeout(() => {
        handleWriterConsultantResponse(data.response);
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      setLiteraryEditorProgress(0);
      console.error("Literary Editor error:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze chapter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiteraryEditorLoading(false);
      setTimeout(() => setLiteraryEditorProgress(0), 1000); // Reset progress after delay
    }
  };

  const handleLiteraryEditorSubmit = async () => {
    if (!literaryEditorInput.trim()) return;
    
    const userMessage = literaryEditorInput;
    setLiteraryEditorInput('');
    setIsLiteraryEditorLoading(true);
    
    setLiteraryEditorMessages(prev => [
      ...prev,
      { type: 'user', content: userMessage }
    ]);

    try {
      console.log('Literary editor follow-up question:', userMessage);
      const response = await apiRequest('POST', '/api/ai/query', {
        query: `${userMessage}\n\nContext - Chapter: "${title}"\nContent: ${content}`,
        context: {
          projectId: (chapter as any)?.projectId,
          chapterId: chapterId,
          type: "literary_analysis"
        }
      });

      const data = await response.json();
      console.log('Literary editor follow-up response:', data);

      setLiteraryEditorMessages(prev => [
        ...prev,
        { type: 'assistant', content: data.response, source: 'Literary Editor' }
      ]);
    } catch (error) {
      console.error("Literary Editor chat error:", error);
      toast({
        title: "Chat Failed",
        description: "Unable to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiteraryEditorLoading(false);
    }
  };

  const handleWriterConsultantResponse = async (literaryAnalysis: string) => {
    setIsWriterConsultantLoading(true);
    
    try {
      const writerPrompt = `As an experienced creative writer and storytelling consultant, you've just read this literary analysis of a chapter. Your role is to inspire and guide the writer with creative suggestions that complement the editor's feedback.

Literary Editor's Analysis:
"${literaryAnalysis}"

Chapter Context:
Title: "${title}"
Content: "${content}"

Please provide inspiring, actionable advice that:
1. **Builds on the editor's suggestions** - Take their feedback and turn it into creative opportunities
2. **Sparks imagination** - Offer specific techniques, approaches, or alternatives the writer can try
3. **Encourages experimentation** - Suggest "what if" scenarios or creative challenges
4. **Provides concrete examples** - Show how suggestions could be implemented in this specific chapter
5. **Motivates the writer** - Frame feedback as exciting possibilities rather than problems to fix

Write as a supportive mentor who sees potential and wants to unlock the writer's creativity.`;

      const response = await apiRequest('POST', '/api/ai/query', {
        query: writerPrompt,
        context: {
          projectId: (chapter as any)?.projectId,
          chapterId: chapterId,
          type: "writer_consultation"
        }
      });

      const data = await response.json();
      console.log('Writer consultant response:', data);

      setLiteraryEditorMessages(prev => [
        ...prev,
        { type: 'writer', content: data.response, source: 'Writer Consultant' }
      ]);

    } catch (error) {
      console.error("Writer Consultant error:", error);
      // Fail silently - the literary analysis still works without this
    } finally {
      setIsWriterConsultantLoading(false);
    }
  };

  // AI Ghostwriter handlers
  const handleGhostwriterSubmit = async () => {
    if (!ghostwriterInput.trim()) return;

    const userMessage = ghostwriterInput.trim();
    setGhostwriterInput('');
    setIsGhostwriterLoading(true);

    setGhostwriterMessages(prev => [
      ...prev,
      { type: 'user', content: userMessage }
    ]);

    try {
      // Enhanced Novel Writer detection - much more inclusive
      const isContentGenerationRequest = 
        userMessage.toLowerCase().includes('write') ||
        userMessage.toLowerCase().includes('continue') ||
        userMessage.toLowerCase().includes('expand') ||
        userMessage.toLowerCase().includes('scene') ||
        userMessage.toLowerCase().includes('dialogue') ||
        userMessage.toLowerCase().includes('more') ||
        userMessage.toLowerCase().includes('add') ||
        userMessage.toLowerCase().includes('create') ||
        userMessage.toLowerCase().includes('develop') ||
        userMessage.toLowerCase().includes('show') ||
        userMessage.toLowerCase().includes('describe') ||
        /\d+\s*words?/i.test(userMessage) ||
        userMessage.length > 50; // Longer requests are likely content requests
      
      // Extract word count if specified
      const wordCountMatch = userMessage.match(/(\d{1,5})\s*words?/i);
      const requestedWordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : null;
      
      // Determine if this is a long-form request (>1500 words)
      const isLongFormRequest = requestedWordCount ? requestedWordCount > 1500 : 
        (userMessage.toLowerCase().includes('chapter') || 
         userMessage.toLowerCase().includes('full') ||
         userMessage.toLowerCase().includes('complete'));

      const ghostwriterPrompt = isContentGenerationRequest 
        ? `You are a professional novelist. Your ONLY job is to write story content. Never give advice, suggestions, or ask questions. Start writing immediately.

**CURRENT CHAPTER:** "${title}"
**EXISTING CONTENT:** "${content}"
**REQUEST:** ${userMessage}

**INSTRUCTIONS:**
${isLongFormRequest ? `- Write ${requestedWordCount ? requestedWordCount + ' words minimum' : 'substantial content (800+ words)'}
- Create full, complete scenes with rich detail
- Include extensive dialogue with character voice
- Add sensory descriptions and atmosphere` : `- Write complete scenes (minimum 300-500 words)
- Include detailed dialogue and action
- Add setting descriptions and character reactions`}
- Continue the existing narrative naturally
- Use "show don't tell" storytelling
- Write in present or past tense to match existing content
- End scenes at natural stopping points

**START WRITING NOW:**`
        : `I am a professional scene writer. I write complete story scenes, not advice. I start writing immediately without questions or explanations.

**CHAPTER:** "${title}"
**EXISTING CONTENT:** "${content}"
**REQUEST:** ${userMessage}

**MY APPROACH:**
I will write a complete scene (400+ words minimum) that:
- Continues the story naturally from where it left off
- Includes rich dialogue with distinct character voices
- Contains detailed sensory descriptions and atmosphere
- Advances the plot meaningfully
- Uses professional storytelling techniques
- Matches the established tone and style

**SCENE CONTENT:**`;

      const response = await apiRequest('POST', '/api/ai/query', {
        query: ghostwriterPrompt,
        context: {
          projectId: (chapter as any)?.projectId,
          chapterId: chapterId,
          type: "ghostwriting"
        }
      });

      const data = await response.json();
      console.log('Ghostwriter response:', data);

      setGhostwriterMessages(prev => [
        ...prev,
        { type: 'assistant', content: data.response }
      ]);

    } catch (error) {
      console.error("Ghostwriter error:", error);
      toast({
        title: "Ghostwriter Failed",
        description: "Unable to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGhostwriterLoading(false);
    }
  };





  // Helper function to find text position in DOM
  const findTextInDOM = (element: Node, searchText: string, startOffset = 0): { node: Text; offset: number } | null => {
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent || '';
      const index = text.toLowerCase().indexOf(searchText.toLowerCase(), startOffset);
      if (index !== -1) {
        return { node: element as Text, offset: index };
      }
    } else {
      for (let i = 0; i < element.childNodes.length; i++) {
        const result = findTextInDOM(element.childNodes[i], searchText, 0);
        if (result) return result;
      }
    }
    return null;
  };

  const handleFind = () => {
    if (!searchQuery.trim() || !richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const text = editor.textContent || '';
    
    // Check if text exists in content
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = Array.from(text.matchAll(regex));
    
    if (matches.length > 0) {
      toast({
        title: "Search Results",
        description: `Found ${matches.length} matches for "${searchQuery}"`,
      });
      
      // Find and highlight first match in DOM
      const textPosition = findTextInDOM(editor, searchQuery);
      if (textPosition) {
        try {
          const range = document.createRange();
          range.setStart(textPosition.node, textPosition.offset);
          range.setEnd(textPosition.node, textPosition.offset + searchQuery.length);
          
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Scroll to the selection with better compatibility
            const selectedElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
              ? range.commonAncestorContainer.parentElement 
              : range.commonAncestorContainer as Element;
            
            if (selectedElement && selectedElement.scrollIntoView) {
              selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        } catch (error) {
          console.error('Error creating text selection:', error);
          toast({
            title: "Search Error",
            description: "Found the text but couldn't highlight it. Try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Search Error",
          description: "Found the text but couldn't locate it in the editor structure.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not Found",
        description: `"${searchQuery}" not found in the text.`,
        variant: "destructive",
      });
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery.trim() || !richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const currentContent = editor.innerHTML;
    
    // Use a more careful replacement that preserves HTML structure
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentContent;
    
    const walkTextNodes = (node: Node): number => {
      let replacements = 0;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const newText = text.replace(regex, (match) => {
          replacements++;
          return replaceQuery;
        });
        if (newText !== text) {
          node.textContent = newText;
        }
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          replacements += walkTextNodes(node.childNodes[i]);
        }
      }
      return replacements;
    };
    
    const totalReplacements = walkTextNodes(tempDiv);
    
    if (totalReplacements > 0) {
      const newContent = tempDiv.innerHTML;
      handleContentChange(newContent);
      editor.innerHTML = newContent;
      
      toast({
        title: "Replace Complete",
        description: `Replaced ${totalReplacements} occurrences of "${searchQuery}" with "${replaceQuery}"`,
      });
    } else {
      toast({
        title: "Nothing to Replace", 
        description: `"${searchQuery}" not found in the text.`,
        variant: "destructive",
      });
    }
  };

  // Initialize writing session when chapter loads
  useEffect(() => {
    if (chapter && typeof chapter === 'object' && 'id' in chapter) {
      setWritingSession({
        startTime: new Date(),
        wordCount: getWordCount(content),
        target: sessionTarget
      });
    }
  }, [chapter, content]);

  // Initialize editor content when chapter loads (but not during typing)
  
  useEffect(() => {
    // COMPLETELY DISABLE content refresh from database during any editing session
    // This prevents autosave from overwriting DOM structure and breaking Enter key formatting
    if (richEditorRef.current && chapter && chapter !== prevChapterRef.current && !isUserTyping) {
      const chapterContent = (chapter as any)?.content || '';
      const currentEditorContent = richEditorRef.current.innerHTML;
      
      // Only sync content on initial load, never during editing sessions
      if (prevChapterRef.current === null && !content) {
        console.log('📄 INITIAL CONTENT LOAD - Syncing from database');
        richEditorRef.current.innerHTML = chapterContent;
        setContent(chapterContent);
      } else {
        console.log('🚫 CONTENT SYNC BLOCKED - Preventing database overwrite during editing');
      }
      prevChapterRef.current = chapter;
    }
  }, [chapter, isUserTyping, content]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Replace word functionality for spell checking
  const replaceWord = (oldWord: string, newWord: string) => {
    if (!richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    
    // Find and replace the word in the editor content
    let currentContent = editor.innerHTML;
    
    // Create a regex to find the exact word (with word boundaries)
    const wordRegex = new RegExp(`\\b${oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    // Replace the first occurrence of the word
    const newContent = currentContent.replace(wordRegex, newWord);
    
    if (newContent !== currentContent) {
      editor.innerHTML = newContent;
      handleContentChange(newContent);
      
      toast({
        title: "Word Replaced",
        description: `"${oldWord}" replaced with "${newWord}"`,
      });
    } else {
      // Fallback: try to find and replace without word boundaries
      const simpleRegex = new RegExp(oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const fallbackContent = currentContent.replace(simpleRegex, newWord);
      
      if (fallbackContent !== currentContent) {
        editor.innerHTML = fallbackContent;
        handleContentChange(fallbackContent);
        
        toast({
          title: "Word Replaced",
          description: `"${oldWord}" replaced with "${newWord}"`,
        });
      } else {
        toast({
          title: "Replace Failed",
          description: `Could not find "${oldWord}" to replace`,
          variant: "destructive",
        });
      }
    }
    
    // Close word tools
    setWordTools(prev => ({ ...prev, isOpen: false }));
  };

  // Simplified double-click word selection handler
  const handleDoubleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('=== DOUBLE CLICK DETECTED ===');
    console.log('Mouse position:', e.clientX, e.clientY);
    
    // Small delay to let selection settle
    setTimeout(async () => {
      const selection = window.getSelection();
      let selectedText = '';
      
      if (selection && selection.toString().trim()) {
        selectedText = selection.toString().trim();
        console.log('✓ DOUBLE-CLICK SELECTION FOUND:', `"${selectedText}"`);
      } else {
        console.log('❌ NO SELECTION FROM DOUBLE-CLICK');
        setWordTools(prev => ({ ...prev, isOpen: false }));
        return;
      }
    
    console.log('Final selected text:', `"${selectedText}"`, 'Length:', selectedText.length);
    
    console.log('About to validate word:', {
      selectedText,
      hasText: !!selectedText,
      wordCount: selectedText ? selectedText.split(' ').length : 0,
      isAlphabetic: selectedText ? /^[a-zA-Z]+$/.test(selectedText) : false
    });
    
    if (selectedText && selectedText.split(' ').length === 1 && /^[a-zA-Z]+$/.test(selectedText)) {
      console.log('✓ VALID WORD DETECTED:', selectedText);
        
      const position = {
        x: e.clientX,
        y: e.clientY
      };
      
      console.log('Setting word tools with position:', position);
      
      // Check if word is misspelled first
      console.log('About to call fetchSpellCheck for:', selectedText);
      try {
        const spellResult = await fetchSpellCheck(selectedText);
        console.log('Spell check result received:', spellResult);
        console.log('Is correct?', spellResult.isCorrect);
        console.log('Suggestions:', spellResult.suggestions);
      
        if (!spellResult.isCorrect) {
          console.log('Word is misspelled, opening spell check mode');
          setWordTools({
            isOpen: true,
            word: selectedText.toLowerCase(),
            position,
            mode: 'spellcheck',
            spellCheckResult: spellResult
          });
        } else {
          console.log('Word is correct, opening menu mode');
          setWordTools({
            isOpen: true,
            word: selectedText.toLowerCase(),
            position,
            mode: 'menu'
          });
        }
      } catch (error) {
        console.error('❌ ERROR in spell check:', error);
        setWordTools({
          isOpen: true,
          word: selectedText.toLowerCase(),
          position,
          mode: 'menu'
        });
      }
      
      console.log('✓ WORD TOOLS STATE SET for word:', selectedText);
    } else {
      console.log('❌ TEXT SELECTION FAILED VALIDATION - not showing word tools');
      console.log('Validation failure reasons:', {
        hasText: !!selectedText,
        isSingleWord: selectedText ? selectedText.split(' ').length === 1 : false,
        isAlphabetic: selectedText ? /^[a-zA-Z]+$/.test(selectedText) : false,
        actualText: `"${selectedText}"`
      });
      setWordTools(prev => ({ ...prev, isOpen: false }));
    }
    }, 50); // Complete the setTimeout
  };

  const fetchSynonyms = async (word: string) => {
    setIsThesaurusLoading(true);
    try {
      const response = await apiRequest('GET', `/api/thesaurus/${encodeURIComponent(word)}`);
      const data = await response.json();
      setThesaurusData(data);
    } catch (error) {
      console.error('Error fetching synonyms:', error);
      // Fallback to synonyms endpoint if thesaurus fails
      try {
        const fallbackResponse = await apiRequest('GET', `/api/synonyms/${encodeURIComponent(word)}`);
        const fallbackData = await fallbackResponse.json();
        setThesaurusData(fallbackData);
      } catch (fallbackError) {
        setThesaurusData({ synonyms: [] });
      }
    } finally {
      setIsThesaurusLoading(false);
    }
  };

  const fetchSpellCheck = async (word: string) => {
    console.log('Spell checking word using API:', word);
    
    try {
      const response = await apiRequest('GET', `/api/spellcheck/${encodeURIComponent(word)}`);
      const data = await response.json();
      
      console.log('API spell check result:', data);
      
      return {
        word: data.word,
        suggestions: data.suggestions || [],
        isCorrect: data.isCorrect
      };
    } catch (error) {
      console.error('Spell check API error:', error);
      
      // Fallback to basic misspelling dictionary
      const commonMisspellings: { [key: string]: string[] } = {
        'recieve': ['receive'],
        'seperate': ['separate'],
        'occured': ['occurred'],
        'neccessary': ['necessary'],
        'definate': ['definite'],
        'begining': ['beginning'],
        'embarass': ['embarrass'],
        'accomodate': ['accommodate'],
        'acheive': ['achieve'],
        'beleive': ['believe'],
        'concious': ['conscious'],
        'existance': ['existence'],
        'goverment': ['government'],
        'independant': ['independent'],
        'wierd': ['weird'],
        'freind': ['friend'],
        'tommorow': ['tomorrow']
      };
      
      const lowerWord = word.toLowerCase();
      const isCorrect = !commonMisspellings[lowerWord];
      const suggestions = commonMisspellings[lowerWord] || [];
      
      console.log('Fallback spell check result:', { word, isCorrect, suggestions });
      
      return {
        word,
        isCorrect,
        suggestions
      };
    }
  };

  const replaceSelectedWord = (newWord: string) => {
    if (!richEditorRef.current || !wordTools.word) return;
    
    const editor = richEditorRef.current;
    const oldWord = wordTools.word;
    
    // Find and replace the word in the editor content using the same logic as replaceWord
    let currentContent = editor.innerHTML;
    
    // Create a regex to find the exact word (with word boundaries)
    const wordRegex = new RegExp(`\\b${oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    // Replace the first occurrence of the word
    const newContent = currentContent.replace(wordRegex, newWord);
    
    if (newContent !== currentContent) {
      editor.innerHTML = newContent;
      handleContentChange(newContent);
      
      toast({
        title: "Word Replaced",
        description: `"${oldWord}" replaced with "${newWord}"`,
      });
    } else {
      // Fallback: try to find and replace without word boundaries
      const simpleRegex = new RegExp(oldWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const fallbackContent = currentContent.replace(simpleRegex, newWord);
      
      if (fallbackContent !== currentContent) {
        editor.innerHTML = fallbackContent;
        handleContentChange(fallbackContent);
        
        toast({
          title: "Word Replaced", 
          description: `"${oldWord}" replaced with "${newWord}"`,
        });
      } else {
        toast({
          title: "Replace Failed",
          description: `Could not find "${oldWord}" to replace`,
          variant: "destructive",
        });
      }
    }
    
    // Close word tools
    setWordTools(prev => ({ ...prev, isOpen: false }));
  };

  // AI Detection handler
  const handleAiDetection = async () => {
    if (!content.trim()) {
      toast({
        title: "No Content",
        description: "Please write some content first before testing for AI detection.",
        variant: "destructive",
      });
      return;
    }

    setIsAiDetectionLoading(true);
    setAiDetectionProgress(0);
    const progressInterval = simulateProgress(setAiDetectionProgress, 15000);

    try {
      console.log('Starting AI detection analysis');
      console.log('Content length:', content.length);
      
      const detectionPrompt = `As an expert in text analysis and AI detection, analyze the following text to determine if it was likely written by a human or AI. Consider factors like:

1. Writing patterns and style consistency
2. Vocabulary choices and complexity
3. Sentence structure variation
4. Natural flow and rhythm
5. Creative elements and originality
6. Common AI writing markers

Provide your analysis in this exact JSON format:
{
  "humanPercentage": [number 0-100],
  "aiPercentage": [number 0-100], 
  "verdict": "[Human-written/AI-generated/Mixed/Uncertain]",
  "confidence": "[High/Medium/Low]",
  "reasoning": "[detailed explanation of your analysis]"
}

Text to analyze: "${content}"`;

      const response = await apiRequest('POST', '/api/ai/query', {
        query: detectionPrompt,
        context: {
          projectId: (chapter as any)?.projectId,
          chapterId: chapterId,
          type: "ai_detection"
        }
      });

      const data = await response.json();
      console.log('AI detection response:', data);

      let analysisResult;
      try {
        // Check if response.response is already a parsed object or if it's a string
        if (typeof data.response === 'object') {
          analysisResult = data.response;
        } else {
          // Try to extract JSON from the string response
          const jsonMatch = data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error("Invalid response format - unable to parse AI detection result");
      }

      if (!analysisResult.humanPercentage || !analysisResult.aiPercentage || !analysisResult.verdict) {
        throw new Error("Invalid response format");
      }

      clearInterval(progressInterval);
      setAiDetectionProgress(100);

      setAiDetectionResult(analysisResult);
      setIsAiDetectionOpen(true);
    } catch (error) {
      clearInterval(progressInterval);
      setAiDetectionProgress(0);
      console.error("AI Detection error:", error);
      toast({
        title: "Detection Failed",
        description: "Unable to analyze content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiDetectionLoading(false);
      setTimeout(() => setAiDetectionProgress(0), 1000); // Reset progress after delay
    }
  };

  // Bookman formatting handler
  const handleBookmanFormat = () => {
    if (!richEditorRef.current) return;

    const editor = richEditorRef.current;
    
    // Apply Bookman Old Style formatting with CSS but preserve current line spacing
    editor.style.fontFamily = '"Bookman Old Style", "Times New Roman", serif';
    editor.style.fontSize = '12pt';
    // Don't override line spacing - let the line spacing control handle it
    editor.classList.add('bookman-formatted');
    
    // Process the content to add paragraph indentation
    const currentContent = editor.innerHTML;
    const lines = currentContent.split('<br>');
    
    const formattedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      // If this is the start of a new paragraph (non-empty line after empty line or first line)
      if (trimmedLine && (index === 0 || !lines[index - 1].trim())) {
        // Add indentation if not already present
        if (!trimmedLine.startsWith('<span style="margin-left: 1.27cm">') && !trimmedLine.startsWith('&nbsp;&nbsp;&nbsp;&nbsp;')) {
          return `<span style="margin-left: 1.27cm; text-indent: 1.27cm; display: block;">${trimmedLine}</span>`;
        }
      }
      return line;
    });
    
    const formattedContent = formattedLines.join('<br>');
    editor.innerHTML = formattedContent;
    handleContentChange(formattedContent);
    
    toast({
      title: "Bookman Format Applied",
      description: "Text formatted with Bookman Old Style 12pt and paragraph indentation. Line spacing preserved.",
    });
  };

  // Theme handler
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    toast({
      title: "Theme Changed",
      description: `Switched to ${newTheme} theme`,
    });
  };

  // Writing mode handler
  const handleWritingModeChange = (mode: WritingMode) => {
    setWritingMode(mode);
    toast({
      title: "Writing Mode",
      description: `Switched to ${mode} mode`,
    });
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-900 text-gray-100';
      case 'sepia':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-white text-gray-900';
    }
  };

  const getWritingModeClasses = () => {
    switch (writingMode) {
      case 'focus':
        return 'max-w-2xl mx-auto';
      case 'distraction-free':
        return 'max-w-4xl mx-auto';
      default:
        return 'max-w-4xl mx-auto';
    }
  };

  if (chapterLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Chapter not found</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${getThemeClasses()}`}>
      {/* Header */}
      {writingMode !== 'distraction-free' && (
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.close()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Writer
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{(project as any)?.title || 'Project'}</h1>
                <p className="text-sm text-neutral-500">{(chapter as any)?.title || 'Chapter'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Word Count */}
              <div className="text-sm text-neutral-500">
                {wordCount} words
              </div>

              {/* Writing Session Progress */}
              {writingSession && sessionWordProgress < writingSession.target && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="w-4 h-4" />
                  <span>{sessionWordProgress}/{writingSession.target}</span>
                  <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${sessionProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Save Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSave}
                disabled={updateChapterMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateChapterMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-t px-4 py-2">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Text Formatting */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleTextFormat('bold')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleTextFormat('italic')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleTextFormat('underline')}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBookmanFormat}
                  title="Format as Bookman Old Style 12pt with paragraph indentation"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Find & Replace */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  title="Find & Replace (Ctrl+F)"
                  className={isSearchOpen ? "bg-accent" : ""}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Formatting Tools */}
              <div className="flex items-center gap-1">
                {/* Line Spacing */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Line Spacing">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 3v18" />
                      </svg>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Line Spacing</Label>
                      <div className="space-y-1">
                        <Button
                          variant={currentLineSpacing === 'single' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleLineSpacing('single')}
                        >
                          Single
                        </Button>
                        <Button
                          variant={currentLineSpacing === '1.5' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleLineSpacing('1.5')}
                        >
                          1.5x
                        </Button>
                        <Button
                          variant={currentLineSpacing === 'double' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleLineSpacing('double')}
                        >
                          Double
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Indent Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleIndentLines}
                  title="Indent Lines (1.27cm)"
                >
                  <Indent className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* AI Literary Analysis */}
              <FeatureGate 
                feature="aiLiteraryAnalysis" 
                fallback={
                  <div className="flex flex-col items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled
                            className="opacity-50"
                          >
                            <BookCheck className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
                        <p>AI Literary Editor Analysis - Get professional feedback on story structure, character development, dialogue, and prose style. Upgrade to Pro to unlock detailed chapter analysis.</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="text-xs text-neutral-500">🔒 Pro</div>
                  </div>
                }
                showUpgradePrompt={false}
              >
                <div className="flex flex-col items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLiteraryEditorAnalysis}
                    disabled={isLiteraryEditorLoading || !content.trim()}
                    title={isLiteraryEditorLoading ? `Analyzing... ${Math.round(literaryEditorProgress)}%` : "AI Literary Editor Analysis"}
                    className={isLiteraryEditorLoading ? "relative" : ""}
                  >
                    {isLiteraryEditorLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    ) : (
                      <BookCheck className="w-4 h-4" />
                    )}
                  </Button>
                  {isLiteraryEditorLoading && (
                    <div className="w-20 space-y-1">
                      <Progress value={literaryEditorProgress} className="h-2" />
                      <div className="text-xs text-center text-blue-600 font-medium">
                        {Math.round(literaryEditorProgress)}%
                      </div>
                    </div>
                  )}
                </div>
              </FeatureGate>

              <Separator orientation="vertical" className="h-6" />

              {/* AI Detection */}
              <div className="flex items-center gap-1">
                <FeatureGate 
                  feature="aiDetection" 
                  fallback={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled
                            className="opacity-50"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
                        <p>AI Detection Test - Analyze your text to determine if it reads as human-written or AI-generated. Upgrade to Pro to verify content authenticity.</p>
                      </TooltipContent>
                    </Tooltip>
                  }
                  showUpgradePrompt={false}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAiDetection}
                    disabled={isAiDetectionLoading || !content.trim()}
                    title={isAiDetectionLoading ? `Detecting... ${Math.round(aiDetectionProgress)}%` : "AI Detection Test"}
                    className={isAiDetectionLoading ? "relative" : ""}
                  >
                    {isAiDetectionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </Button>
                </FeatureGate>

                {/* AI Ghostwriter */}
                <FeatureGate 
                  feature="aiGhostwriter" 
                  fallback={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled
                            className="text-emerald-600 opacity-50"
                          >
                            <PenTool className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
                        <p>AI Ghostwriter Assistant - Get direct writing help with dialogue, descriptions, scene continuation, and creative rewrites. Upgrade to Pro for advanced writing assistance.</p>
                      </TooltipContent>
                    </Tooltip>
                  }
                  showUpgradePrompt={false}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsGhostwriterOpen(true)}
                    title="AI Ghostwriter Assistant"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <PenTool className="w-4 h-4" />
                  </Button>
                </FeatureGate>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Writing Mode */}
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Writing Mode">
                      <Type className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <p className="font-medium text-sm mb-2">Writing Mode</p>
                      <Button
                        variant={writingMode === 'normal' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleWritingModeChange('normal')}
                        className="w-full justify-start"
                      >
                        Normal
                      </Button>
                      <Button
                        variant={writingMode === 'focus' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleWritingModeChange('focus')}
                        className="w-full justify-start"
                      >
                        Focus
                      </Button>
                      <Button
                        variant={(writingMode as WritingMode) === 'distraction-free' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleWritingModeChange('distraction-free')}
                        className="w-full justify-start"
                      >
                        Distraction-Free
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Theme */}
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Theme">
                      <Palette className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <p className="font-medium text-sm mb-2">Theme</p>
                      <Button
                        variant={theme === 'light' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleThemeChange('light')}
                        className="w-full justify-start"
                      >
                        <Sun className="w-4 h-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleThemeChange('dark')}
                        className="w-full justify-start"
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === 'sepia' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleThemeChange('sepia')}
                        className="w-full justify-start"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Sepia
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Writing Modes */}
              <div className="flex items-center gap-1">
                <Button
                  variant={writingMode === 'normal' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWritingMode('normal')}
                >
                  Normal
                </Button>
                <Button
                  variant={writingMode === 'focus' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWritingMode('focus' as WritingMode)}
                >
                  Focus
                </Button>
                <Button
                  variant={(writingMode as WritingMode) === 'distraction-free' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWritingMode('distraction-free' as WritingMode)}
                >
                  Distraction-Free
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Themes */}
              <div className="flex items-center gap-1">
                <Button
                  variant={theme === 'light' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'sepia' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme('sepia')}
                >
                  Sepia
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Writing Statistics */}
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="font-medium">Words: {getWordCount(content)}</span>
                <span>•</span>
                <span>Characters: {getCharacterCount(content)}</span>
                <span>•</span>
                <span>Reading: {getReadingTime(content)} min</span>
              </div>
            </div>
          </div>

          {/* Find & Replace Panel */}
          {isSearchOpen && (
            <div className="border-t bg-neutral-50 p-4 space-y-3">
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Find..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFind();
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Replace with..."
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleFind}
                    disabled={!searchQuery.trim()}
                  >
                    Find
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleReplaceAll}
                    disabled={!searchQuery.trim()}
                  >
                    Replace All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>  
          )}

          {/* Writing Session Tracker */}
          {writingSession && (
            <div className="border-t bg-gradient-to-r from-green-50 to-blue-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Session Progress:</span>
                    <span className="text-green-700">
                      {sessionWordProgress} / {writingSession.target} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>
                      {Math.floor((Date.now() - writingSession.startTime.getTime()) / (1000 * 60))} min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-white rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, sessionProgressPercent)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-neutral-600">
                    {Math.round(sessionProgressPercent)}%
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newTarget = prompt('Set new session target:', sessionTarget.toString());
                      if (newTarget && !isNaN(parseInt(newTarget))) {
                        setSessionTarget(parseInt(newTarget));
                        setWritingSession(prev => prev ? { ...prev, target: parseInt(newTarget) } : null);
                      }
                    }}
                    title="Change session target"
                  >
                    <Target className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className={`p-8 ${getThemeClasses()}`}>
        <div className={getWritingModeClasses()}>
          <div className="prose prose-lg max-w-none">
            {/* Chapter Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`text-3xl font-bold mb-8 w-full border-none outline-none bg-transparent ${
                theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? 'text-amber-900' : 'text-neutral-800'
              }`}
              placeholder="Chapter Title"
            />
            
            {/* Rich Text Content */}
            <div
              ref={richEditorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing your story..."
              onInput={(e) => {
                const target = e.currentTarget;
                handleContentChange(target.innerHTML);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  
                  // Block autosave briefly
                  setIsUserTyping(true);
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  
                  // Ultra-simple approach: just insert HTML like modal did
                  document.execCommand('insertHTML', false, '<div style="text-indent: 1.27cm; margin: 0; padding: 0;">');
                  
                  // Update content
                  const newContent = richEditorRef.current?.innerHTML || '';
                  handleContentChange(newContent);
                  
                  // Reset typing flag quickly
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsUserTyping(false);
                  }, 1000);
                }
              }}
              onDoubleClick={handleDoubleClick}
              onSelect={(e) => {
                console.log('Selection event detected');
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) {
                  const selectedText = selection.toString().trim();
                  console.log('onSelect - storing selection:', selectedText);
                  (e.currentTarget as any)._lastSelection = selectedText;
                }
              }}
              className={`min-h-[70vh] border-none outline-none shadow-none resize-none bookman-font text-editor-content focus:ring-0 p-4 ${
                theme === 'dark' 
                  ? 'bg-gray-900 text-gray-100' 
                  : theme === 'sepia' 
                  ? 'bg-amber-50 text-amber-900' 
                  : 'bg-white text-neutral-700'
              }`}
              style={{
                lineHeight: currentLineSpacing === 'single' ? '1.0' : 
                           currentLineSpacing === '1.5' ? '1.5' : '2.0'
              }}
            />
          </div>
        </div>
      </div>

      {/* Exit button for Distraction-Free Mode */}
      {writingMode === 'distraction-free' && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 right-4 z-50 opacity-20 hover:opacity-80 transition-opacity bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          onClick={() => setWritingMode('normal')}
          title="Exit distraction-free mode (Escape)"
        >
          <Eye className="w-4 h-4" />
        </Button>
      )}

      {/* Session Progress Indicator (bottom of screen in distraction-free mode) */}
      {writingMode === 'distraction-free' && writingSession && sessionWordProgress < writingSession.target && (
        <div className="fixed bottom-4 right-4">
          <Card className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4" />
                <span>{sessionWordProgress}/{writingSession.target}</span>
                <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${sessionProgressPercent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Literary Editor Dialog */}
      <Dialog open={isLiteraryEditorOpen} onOpenChange={setIsLiteraryEditorOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookCheck className="w-5 h-5" />
              Literary Editor
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto mb-4 p-4 border rounded-lg bg-neutral-50">
              {literaryEditorMessages.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <BookCheck className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-lg font-medium mb-2">Welcome to Literary Editor</p>
                  <p>Get professional feedback on your chapter's structure, style, and development.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {literaryEditorMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white ml-4' 
                          : message.type === 'writer'
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-400 mr-4'
                          : 'bg-white border mr-4'
                      }`}>
                        {message.source && (
                          <div className={`text-xs font-medium mb-2 ${
                            message.type === 'writer' ? 'text-purple-600' : 'text-neutral-500'
                          }`}>
                            📝 {message.source}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isWriterConsultantLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-400 mr-4">
                        <div className="text-xs font-medium mb-2 text-purple-600">📝 Writer Consultant</div>
                        <div className="flex items-center gap-2 text-purple-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                          Crafting creative suggestions...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {isLiteraryEditorLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border max-w-[80%] p-4 rounded-lg mr-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className="text-sm font-medium">Literary Analysis in Progress...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-neutral-600">
                        <span>Processing chapter content</span>
                        <span>{Math.round(literaryEditorProgress)}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${literaryEditorProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-2">
                        Please wait while our AI analyzes your chapter's structure, characters, dialogue, and prose style...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2">
                <Textarea
                  value={literaryEditorInput}
                  onChange={(e) => setLiteraryEditorInput(e.target.value)}
                  placeholder="Ask for specific feedback or request clarification..."
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleLiteraryEditorSubmit();
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleLiteraryEditorSubmit}
                    disabled={!literaryEditorInput.trim() || isLiteraryEditorLoading}
                    size="sm"
                  >
                    Send
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleLiteraryEditorAnalysis}
                    disabled={isLiteraryEditorLoading || !content.trim()}
                    size="sm"
                  >
                    Re-analyze
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const lastEditorMessage = literaryEditorMessages.find(msg => msg.source === 'Literary Editor');
                      if (lastEditorMessage) {
                        handleWriterConsultantResponse(lastEditorMessage.content);
                      }
                    }}
                    disabled={isWriterConsultantLoading || !literaryEditorMessages.some(msg => msg.source === 'Literary Editor')}
                    size="sm"
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {isWriterConsultantLoading ? 'Consulting...' : 'Get Writer Ideas'}
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "How can I improve the pacing?",
                  "Are my characters well-developed?",
                  "Is the dialogue realistic?",
                  "How's the prose style?",
                  "Any grammar issues?"
                ].map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLiteraryEditorInput(question);
                      setTimeout(() => handleLiteraryEditorSubmit(), 10);
                    }}
                    disabled={isLiteraryEditorLoading}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Detection Progress Toast */}
      {isAiDetectionLoading && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="p-4 bg-white shadow-lg border">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                <span className="text-sm font-medium">AI Detection Analysis</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Analyzing content authenticity</span>
                  <span>{Math.round(aiDetectionProgress)}%</span>
                </div>
                <div className="w-48 bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${aiDetectionProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-neutral-500">
                  Detecting AI vs human-written patterns...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Detection Dialog */}
      <Dialog open={isAiDetectionOpen} onOpenChange={setIsAiDetectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              AI Detection Results
            </DialogTitle>
          </DialogHeader>
          
          {aiDetectionResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {aiDetectionResult.humanPercentage}%
                  </div>
                  <div className="text-sm text-green-700">Human-written</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {aiDetectionResult.aiPercentage}%
                  </div>
                  <div className="text-sm text-blue-700">AI-generated</div>
                </div>
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Verdict:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    aiDetectionResult.verdict === 'Human-written' 
                      ? 'bg-green-100 text-green-800' 
                      : aiDetectionResult.verdict === 'AI-generated'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {aiDetectionResult.verdict}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Confidence:</span>
                  <span className="text-sm">{aiDetectionResult.confidence}</span>
                </div>
                <div>
                  <span className="font-medium mb-2 block">Analysis:</span>
                  <p className="text-sm text-neutral-600 whitespace-pre-wrap">
                    {aiDetectionResult.reasoning}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Ghostwriter Dialog */}
      <Dialog open={isGhostwriterOpen} onOpenChange={setIsGhostwriterOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-600" />
              AI Ghostwriter
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Get creative writing assistance for dialogue, descriptions, plot development, and more
            </p>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto mb-4 p-4 border rounded-lg bg-neutral-50">
              {ghostwriterMessages.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <PenTool className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                  <p className="text-lg font-medium mb-2">Welcome to AI Ghostwriter</p>
                  <p>I'm here to help you write compelling scenes, dialogue, descriptions, and more.</p>
                  <div className="mt-4 text-sm text-neutral-400">
                    <p>Try asking me to:</p>
                    <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                      <li>• "Write a dialogue between..."</li>
                      <li>• "Describe the scene where..."</li>
                      <li>• "Continue this paragraph in..."</li>
                      <li>• "Rewrite this section with more..."</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ghostwriterMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-emerald-500 text-white ml-4' 
                          : 'bg-white border-l-4 border-emerald-400 mr-4'
                      }`}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isGhostwriterLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border-l-4 border-emerald-400 max-w-[85%] p-3 rounded-lg mr-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <span className="text-sm ml-2">Writing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2">
                <Textarea
                  value={ghostwriterInput}
                  onChange={(e) => setGhostwriterInput(e.target.value)}
                  placeholder="Describe what you need help writing..."
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGhostwriterSubmit();
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleGhostwriterSubmit}
                    disabled={!ghostwriterInput.trim() || isGhostwriterLoading}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isGhostwriterLoading ? 'Writing...' : 'Send'}
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Write dialogue for this scene",
                  "Describe the setting in detail", 
                  "Continue this paragraph",
                  "Rewrite with more emotion",
                  "Add action to this scene"
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGhostwriterInput(prompt);
                      setTimeout(() => handleGhostwriterSubmit(), 10);
                    }}
                    disabled={isGhostwriterLoading}
                    className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Word Tools Popup */}
      {wordTools.isOpen && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48"
          style={{
            left: `${wordTools.position.x - 96}px`,
            top: `${wordTools.position.y - 80}px`,
          }}
        >
          {/* Menu Mode - Choose tool */}
          {wordTools.mode === 'menu' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 font-medium mb-2">
                "{wordTools.word}"
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setWordTools(prev => ({ ...prev, mode: 'thesaurus' }));
                  fetchSynonyms(wordTools.word);
                }}
              >
                <Book className="w-4 h-4" />
                Find Synonyms
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={async () => {
                  console.log('Spell check clicked for word:', wordTools.word);
                  setWordTools(prev => ({ ...prev, mode: 'spellcheck' }));
                  const spellResult = await fetchSpellCheck(wordTools.word);
                  console.log('Spell check result:', spellResult);
                  setWordTools(prev => ({ 
                    ...prev, 
                    mode: 'spellcheck',
                    spellCheckResult: spellResult
                  }));
                }}
              >
                <Type className="w-4 h-4" />
                Check Spelling
              </Button>
            </div>
          )}

          {/* Thesaurus Mode */}
          {wordTools.mode === 'thesaurus' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500 font-medium">SYNONYMS</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 ml-auto text-xs"
                  onClick={() => setWordTools(prev => ({ ...prev, mode: 'menu' }))}
                >
                  Back
                </Button>
              </div>
              
              {isThesaurusLoading ? (
                <div className="text-sm text-gray-600">Looking up synonyms...</div>
              ) : thesaurusData && 'synonyms' in thesaurusData && thesaurusData.synonyms.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {thesaurusData.synonyms.slice(0, 8).map((synonym: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => replaceSelectedWord(synonym)}
                      >
                        {synonym}
                      </Button>
                    ))}
                  </div>
                  {thesaurusData.synonyms.length > 8 && (
                    <div className="text-xs text-gray-400">
                      +{thesaurusData.synonyms.length - 8} more options
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  No synonyms found for "{wordTools.word}"
                </div>
              )}
            </div>
          )}

          {/* Spell Check Mode */}
          {wordTools.mode === 'spellcheck' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500 font-medium">SPELL CHECK</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 ml-auto text-xs"
                  onClick={() => setWordTools(prev => ({ ...prev, mode: 'menu' }))}
                >
                  Back
                </Button>
              </div>
              
              {wordTools.spellCheckResult ? (
                <div className="space-y-2">
                  {wordTools.spellCheckResult.isCorrect ? (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Spelling is correct
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Possible misspelling
                      </div>
                      {wordTools.spellCheckResult.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Suggestions:</div>
                          {wordTools.spellCheckResult.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-7"
                              onClick={() => {
                                replaceWord(wordTools.word, suggestion);
                                setWordTools(prev => ({ ...prev, isOpen: false }));
                              }}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Checking spelling...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close word tools */}
      {wordTools.isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setWordTools(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}