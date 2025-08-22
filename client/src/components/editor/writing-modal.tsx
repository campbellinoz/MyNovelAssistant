import { useState, useEffect, useRef, KeyboardEvent, MouseEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAutoSave } from "@/hooks/use-autosave";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import FeatureGate from "@/components/feature-gate";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Chapter, type Project } from "@shared/schema";
import { 
  Bold, Italic, Underline, Search, Replace, Target, Clock, 
  Palette, Moon, Sun, RotateCcw, RotateCw, Save, X,
  Type, Zap, FileText, Timer, Maximize2, Minimize2, Book, Indent, BookOpen, Shield
} from "lucide-react";
import AdvancedEditor from "./advanced-editor";

interface WritingModalProps {
  chapter: Chapter;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

type WritingMode = 'normal' | 'focus' | 'distraction-free';
type Theme = 'light' | 'dark' | 'sepia';

interface WritingSession {
  startTime: Date;
  wordCount: number;
  target: number;
}

interface ThesaurusEntry {
  word: string;
  synonyms: string[];
  antonyms?: string[];
}

interface SpellCheckEntry {
  word: string;
  suggestions: string[];
  isCorrect: boolean;
}

interface WordToolsState {
  isOpen: boolean;
  word: string;
  position: { x: number; y: number };
  mode: 'menu' | 'thesaurus' | 'spellcheck';
}

export default function WritingModal({ chapter, project, isOpen, onClose }: WritingModalProps) {
  const [content, setContent] = useState(chapter.content || "");
  const [title, setTitle] = useState(chapter.title);
  const featureAccess = useFeatureAccess();
  const [writingMode, setWritingMode] = useState<WritingMode>('normal');
  const [theme, setTheme] = useState<Theme>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [writingSession, setWritingSession] = useState<WritingSession | null>(null);
  const [sessionTarget, setSessionTarget] = useState(500);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [wordTools, setWordTools] = useState<WordToolsState>({
    isOpen: false,
    word: "",
    position: { x: 0, y: 0 },
    mode: 'menu'
  });
  const [currentLineSpacing, setCurrentLineSpacing] = useState<'single' | '1.5' | 'double'>('single');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isLiteraryEditorOpen, setIsLiteraryEditorOpen] = useState(false);
  const [literaryEditorInput, setLiteraryEditorInput] = useState('');
  const [literaryEditorMessages, setLiteraryEditorMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isLiteraryEditorLoading, setIsLiteraryEditorLoading] = useState(false);
  const [aiDetectionResult, setAiDetectionResult] = useState<{
    humanPercentage: number;
    aiPercentage: number;
    verdict: 'PASS' | 'FAIL';
    confidence: string;
  } | null>(null);
  const [isAiDetectionLoading, setIsAiDetectionLoading] = useState(false);
  
  // Drag functionality states
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize writing session when modal opens
  useEffect(() => {
    if (isOpen) {
      setWritingSession({
        startTime: new Date(),
        wordCount: getWordCount(content),
        target: sessionTarget
      });
    }
  }, [isOpen, chapter.id]);

  // Update local state when chapter changes
  useEffect(() => {
    setContent(chapter.content || "");
    setTitle(chapter.title);
    setUndoStack([]);
    setRedoStack([]);
    setWordTools({ isOpen: false, word: "", position: { x: 0, y: 0 }, mode: 'menu' });
  }, [chapter.id, chapter.content, chapter.title]);

  // Thesaurus API query
  const { data: thesaurusData, isLoading: isThesaurusLoading } = useQuery<ThesaurusEntry>({
    queryKey: ["/api/thesaurus", wordTools.word],
    enabled: wordTools.isOpen && wordTools.mode === 'thesaurus' && wordTools.word.length > 0,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/thesaurus/${wordTools.word}`);
      return response.json();
    },
  });

  // Spell check API query
  const { data: spellCheckData, isLoading: isSpellCheckLoading } = useQuery<SpellCheckEntry>({
    queryKey: ["/api/spellcheck", wordTools.word],
    enabled: wordTools.isOpen && wordTools.mode === 'spellcheck' && wordTools.word.length > 0,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/spellcheck/${wordTools.word}`);
      return response.json();
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async (data: { title?: string; content?: string }) => {
      const response = await apiRequest("PATCH", `/api/chapters/${chapter.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters", chapter.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "chapters", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
    },
  });

  // Auto-save content changes
  useAutoSave(
    () => {
      if (content !== chapter.content) {
        updateChapterMutation.mutate({ content });
      }
    },
    [content],
    2000
  );

  // Auto-save title changes
  useAutoSave(
    () => {
      if (title !== chapter.title) {
        updateChapterMutation.mutate({ title });
      }
    },
    [title],
    1000
  );

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string): number => {
    return text.length;
  };

  const getReadingTime = (text: string): number => {
    const words = getWordCount(text);
    return Math.ceil(words / 200);
  };

  const handleContentChange = (newContent: string) => {
    if (content !== newContent) {
      setUndoStack(prev => [...prev.slice(-19), content]);
      setRedoStack([]);
    }
    setContent(newContent);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle paragraph indentation on Enter key
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Check if we're at the end of a paragraph (no content after cursor on current line)
      const beforeCursor = content.substring(0, start);
      const afterCursor = content.substring(end);
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLineContent = beforeCursor.substring(currentLineStart);
      
      // Only add indentation if there's content on the current line
      if (currentLineContent.trim().length > 0) {
        // Add single line break and indentation for new paragraph (1.27cm = 9 spaces at 12pt)
        const newContent = beforeCursor + '\n         ' + afterCursor;
        e.preventDefault();
        handleContentChange(newContent);
        
        // Set cursor position after the inserted content (after the indentation)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 10; // 1 for \n + 9 for spaces
        }, 0);
      }
    }
    
    // Keyboard shortcuts
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      handleRedo();
    }
    // Text formatting shortcuts
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      handleTextFormat('bold');
    }
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      handleTextFormat('italic');
    }
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      handleTextFormat('underline');
    }
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      setIsSearchOpen(true);
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      if (writingMode === 'distraction-free') {
        e.preventDefault();
        setWritingMode('normal');
      } else if (!isSearchOpen) {
        onClose();
      }
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, content]);
      setUndoStack(prev => prev.slice(0, -1));
      setContent(lastState);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, content]);
      setRedoStack(prev => prev.slice(0, -1));
      setContent(nextState);
    }
  };

  const handleSave = () => {
    updateChapterMutation.mutate({ content, title });
    toast({
      title: "Saved",
      description: "Your chapter has been saved successfully.",
    });
  };

  const handleFormatText = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Check if all text is selected
    const isAllSelected = start === 0 && end === content.length && content.length > 0;
    
    if (isAllSelected) {
      // Format the text by adding proper paragraph spacing
      const formattedContent = formatParagraphs(content);
      handleContentChange(formattedContent);
      
      toast({
        title: "Text Formatted",
        description: "Applied Bookman Old Style 12pt with paragraph indentation",
      });
    } else {
      toast({
        title: "Select All Text",
        description: "Please select all text (Ctrl+A) before applying formatting",
        variant: "destructive",
      });
    }
  };

  const formatParagraphs = (text: string): string => {
    // Split by double line breaks (paragraph separators)
    const paragraphs = text.split(/\n\s*\n/);
    
    // Process each paragraph
    const formattedParagraphs = paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return '';
      
      // Add indentation spaces for all paragraphs except the first
      if (index === 0) {
        return trimmedParagraph;
      } else {
        return '         ' + trimmedParagraph; // 9 spaces for 1.27cm indentation
      }
    });
    
    // Join paragraphs with double line breaks
    return formattedParagraphs.filter(p => p.length > 0).join('\n\n');
  };

  const handleLineSpacing = (spacing: 'single' | '1.5' | 'double') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Automatically select all text first
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    
    setCurrentLineSpacing(spacing);
    
    const spacingLabels = {
      'single': 'Single',
      '1.5': '1.5x',
      'double': 'Double'
    };
    
    toast({
      title: "Line Spacing Updated",
      description: `Applied ${spacingLabels[spacing]} line spacing to entire chapter`,
    });
  };

  const handleIndentLines = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    
    // Find the start and end of the lines that contain the selection
    const beforeSelection = text.substring(0, start);
    const selection = text.substring(start, end);
    const afterSelection = text.substring(end);
    
    // Find line boundaries
    const lineStart = beforeSelection.lastIndexOf('\n') + 1;
    const lineEnd = afterSelection.indexOf('\n');
    const fullLineEnd = lineEnd === -1 ? text.length : end + lineEnd;
    
    // Get the lines to indent
    const linesToIndent = text.substring(lineStart, fullLineEnd);
    const lines = linesToIndent.split('\n');
    
    // Add 1.27cm indentation (9 spaces) to each line
    const indentedLines = lines.map(line => {
      if (line.trim().length === 0) return line; // Don't indent empty lines
      return '         ' + line; // 9 spaces for 1.27cm indentation
    });
    
    // Reconstruct the content
    const newContent = text.substring(0, lineStart) + indentedLines.join('\n') + text.substring(fullLineEnd);
    
    // Update content
    handleContentChange(newContent);
    
    // Restore cursor position (adjusted for added indentation)
    const indentationAdded = lines.filter(line => line.trim().length > 0).length * 9;
    setTimeout(() => {
      textarea.selectionStart = start + (start > lineStart ? 9 : 0);
      textarea.selectionEnd = end + indentationAdded;
      textarea.focus();
    }, 0);
    
    toast({
      title: "Lines Indented",
      description: `Added 1.27cm indentation to ${lines.filter(line => line.trim().length > 0).length} line(s)`,
    });
  };

  const handleTextFormat = (format: 'bold' | 'italic' | 'underline') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
      toast({
        title: "No Text Selected",
        description: "Please select text to apply formatting.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Rich Text Formatting",
      description: "Visual formatting (bold, italic, underline) is available in the Advanced Editor. Use the expand button to access full formatting features.",
      variant: "default"
    });
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
    
    // Show immediate feedback to user
    toast({
      title: "Analysis in Progress",
      description: "Analyzing your chapter content...",
    });
    
    try {
      const analysisPrompt = `As a professional literary editor, please analyze this chapter and provide detailed feedback on:

1. **Structure & Pacing**: How well does the chapter flow? Are there pacing issues?
2. **Character Development**: How effectively are characters portrayed and developed?
3. **Dialogue**: Is the dialogue natural and purposeful?
4. **Prose Style**: Comment on sentence structure, word choice, and voice
5. **Narrative Techniques**: Use of perspective, tension, and literary devices
6. **Areas for Improvement**: Specific suggestions for enhancement

Chapter Title: "${title}"
Content: "${content}"

Please provide constructive, actionable feedback in a professional yet encouraging tone.`;

      const response = await apiRequest("POST", "/api/ai/query", {
        query: analysisPrompt,
        context: {
          projectId: project.id,
          chapterId: chapter.id,
          type: "literary_analysis"
        }
      });

      const data = await response.json();
      
      setLiteraryEditorMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: 'Please analyze this chapter and provide detailed literary feedback.',
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
      ]);

      setIsLiteraryEditorOpen(true);

    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the chapter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiteraryEditorLoading(false);
    }
  };

  const handleLiteraryEditorSubmit = async () => {
    if (!literaryEditorInput.trim()) return;

    const userMessage = literaryEditorInput.trim();
    setLiteraryEditorInput('');
    setIsLiteraryEditorLoading(true);

    // Add user message immediately
    setLiteraryEditorMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }
    ]);

    try {
      const contextPrompt = `As a professional literary editor, please respond to this question about the chapter:

Chapter Title: "${title}"
Current Chapter Content: "${content}"

Writer's Question: "${userMessage}"

Please provide helpful, specific advice that considers the context of the chapter and the writer's needs.`;

      const response = await apiRequest("POST", "/api/ai/query", {
        query: contextPrompt,
        context: {
          projectId: project.id,
          chapterId: chapter.id,
          type: "literary_consultation"
        }
      });

      const data = await response.json();
      
      setLiteraryEditorMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
      ]);

    } catch (error) {
      console.error("Literary Editor chat error:", error);
      toast({
        title: "Response Failed",
        description: "Unable to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiteraryEditorLoading(false);
    }
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
    setAiDetectionResult(null);
    
    toast({
      title: "AI Detection Analysis",
      description: "Analyzing text for AI-generated patterns...",
    });

    try {
      const detectionPrompt = `As an expert in text analysis and AI detection, analyze the following text to determine if it was likely written by a human or AI. Consider factors like:

1. **Writing Patterns**: Natural flow vs formulaic structure
2. **Vocabulary Diversity**: Varied word choice vs repetitive patterns  
3. **Sentence Structure**: Natural variation vs predictable patterns
4. **Content Authenticity**: Personal voice vs generic tone
5. **Stylistic Inconsistencies**: Human quirks vs AI smoothness

Text to analyze: "${content}"

Provide your analysis in this exact JSON format:
{
  "humanPercentage": [0-100 number],
  "aiPercentage": [0-100 number], 
  "verdict": "[PASS or FAIL]",
  "confidence": "[HIGH, MEDIUM, or LOW]",
  "reasoning": "[brief explanation of key indicators]"
}

PASS = Likely human-written (>60% human confidence)
FAIL = Likely AI-generated (>60% AI confidence)`;

      const response = await apiRequest("POST", "/api/ai/query", {
        query: detectionPrompt,
        context: {
          projectId: project.id,
          chapterId: chapter.id,
          type: "ai_detection"
        }
      });

      const data = await response.json();
      
      try {
        let analysisResult;
        
        // Check if response is already parsed JSON
        if (typeof data.response === 'object') {
          analysisResult = data.response;
        } else {
          // Try to extract JSON from string response
          const jsonMatch = data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not find JSON in response");
          }
        }
        
        // Validate required fields
        if (!analysisResult.humanPercentage || !analysisResult.aiPercentage || !analysisResult.verdict) {
          throw new Error("Invalid analysis result format");
        }
        
        setAiDetectionResult({
          humanPercentage: Number(analysisResult.humanPercentage),
          aiPercentage: Number(analysisResult.aiPercentage),
          verdict: analysisResult.verdict,
          confidence: analysisResult.confidence || 'MEDIUM'
        });
        
        toast({
          title: "AI Detection Complete",
          description: `Analysis shows ${analysisResult.humanPercentage}% human-written (${analysisResult.verdict})`,
          variant: analysisResult.verdict === 'PASS' ? 'default' : 'destructive',
        });
        
      } catch (parseError) {
        console.error("AI Detection parsing error:", parseError, "Response:", data.response);
        toast({
          title: "Analysis Error",
          description: "Could not analyze the text properly. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Detection Failed",
        description: "Unable to analyze text for AI detection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiDetectionLoading(false);
    }
  };

  // Drag functionality handlers
  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (isFullscreen || writingMode === 'distraction-free') return;
    
    setIsDragging(true);
    const rect = modalRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!isDragging || isFullscreen || writingMode === 'distraction-free') return;
    
    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };

    // Keep modal within viewport bounds
    const maxX = window.innerWidth - (isFullscreen ? 0 : 800);
    const maxY = window.innerHeight - (isFullscreen ? 0 : 600);
    
    setModalPosition({
      x: Math.max(0, Math.min(newPosition.x, maxX)),
      y: Math.max(0, Math.min(newPosition.y, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Reset position when toggling fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  const handleSearch = () => {
    if (!searchQuery || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value;
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    
    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + searchQuery.length);
    } else {
      toast({
        title: "Not found",
        description: `"${searchQuery}" was not found in the text.`,
        variant: "destructive",
      });
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    
    const newContent = content.replace(
      new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      replaceQuery
    );
    
    const replacements = (content.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    if (replacements > 0) {
      handleContentChange(newContent);
      toast({
        title: "Replaced",
        description: `Replaced ${replacements} occurrence(s) of "${searchQuery}".`,
      });
    } else {
      toast({
        title: "Not found",
        description: `"${searchQuery}" was not found in the text.`,
        variant: "destructive",
      });
    }
  };

  const handleTextSelection = (e: MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
    
    if (selectedText && selectedText.split(' ').length === 1 && /^[a-zA-Z]+$/.test(selectedText)) {
      const rect = textarea.getBoundingClientRect();
      const position = {
        x: e.clientX,
        y: e.clientY
      };
      
      setWordTools({
        isOpen: true,
        word: selectedText.toLowerCase(),
        position,
        mode: 'menu'
      });
    } else {
      setWordTools(prev => ({ ...prev, isOpen: false }));
    }
  };

  const replaceSelectedWord = (newWord: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (selectedText.trim()) {
      const newContent = content.substring(0, start) + newWord + content.substring(end);
      handleContentChange(newContent);
      
      // Update selection to the new word
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + newWord.length);
      }, 0);
    }
    
    setWordTools(prev => ({ ...prev, isOpen: false }));
  };

  const wordCount = getWordCount(content);
  const characterCount = getCharacterCount(content);
  const readingTime = getReadingTime(content);
  
  const sessionWordProgress = writingSession ? wordCount - writingSession.wordCount : 0;
  const sessionProgressPercent = writingSession ? Math.min((sessionWordProgress / writingSession.target) * 100, 100) : 0;

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
        return 'max-w-4xl mx-auto px-16';
      default:
        return 'max-w-4xl mx-auto';
    }
  };

  const modalSize = isFullscreen ? 'w-screen h-screen max-w-none' : 'w-[95vw] h-[90vh] max-w-7xl';
  
  // Position styles for draggable modal
  const modalStyle: React.CSSProperties = isFullscreen ? {} : {
    position: 'fixed',
    left: modalPosition.x,
    top: modalPosition.y,
    transform: 'none',
  };

  // Handle distraction-free mode as a separate overlay
  if (writingMode === 'distraction-free') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        theme === 'dark' ? 'bg-neutral-900' : 
        theme === 'sepia' ? 'bg-amber-50' : 'bg-white'
      }`}>
        {/* Subtle exit button */}
        <Button
          variant="ghost"
          size="sm"
          className={`fixed top-4 right-4 z-60 opacity-20 hover:opacity-80 transition-opacity ${
            theme === 'dark' ? 'text-white hover:bg-neutral-800' : 
            theme === 'sepia' ? 'text-amber-900 hover:bg-amber-100' : 'text-neutral-900 hover:bg-neutral-100'
          }`}
          onClick={() => setWritingMode('normal')}
          title="Exit distraction-free mode (Escape)"
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
        
        {/* ESC hint */}
        <div className={`fixed top-16 right-4 z-60 text-xs opacity-10 hover:opacity-30 transition-opacity ${
          theme === 'dark' ? 'text-white' : 
          theme === 'sepia' ? 'text-amber-700' : 'text-neutral-600'
        }`}>
          Press ESC to exit
        </div>
        
        <div className={`w-full max-w-4xl mx-auto px-16 ${
          theme === 'dark' ? 'text-white' : 
          theme === 'sepia' ? 'text-amber-900' : 'text-neutral-900'
        }`}>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseUp={handleTextSelection}
            className={`w-full h-screen resize-none border-0 bg-transparent bookman-font text-editor-content focus:outline-none focus:ring-0 ${
              theme === 'dark' ? 'text-white placeholder:text-neutral-500' : 
              theme === 'sepia' ? 'text-amber-900 placeholder:text-amber-700' : 'text-neutral-900 placeholder:text-neutral-500'
            }`}
            placeholder="Start writing your story..."
            style={{
              lineHeight: currentLineSpacing === 'single' ? '1.0' : 
                         currentLineSpacing === '1.5' ? '1.5' : '2.0'
            }}
          />
        </div>
      </div>
    );
  }

  // Normal dialog layout for normal and focus modes
  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className={`${modalSize} p-0 ${getThemeClasses()} ${isDragging ? 'cursor-grabbing select-none' : ''}`}
        style={modalStyle}
        onInteractOutside={(e) => {
          if (isFullscreen) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isFullscreen) {
            setIsFullscreen(false);
            e.preventDefault();
          } else {
            onClose();
          }
        }}
      >
        {/* Header with toolbar */}
        <DialogHeader 
          className={`border-b border-neutral-200 p-4 ${!isFullscreen ? 'cursor-grab' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Writing: {chapter.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Advanced text editor for writing and editing chapter content with formatting tools, themes, and writing modes.
            </DialogDescription>
            
            <div className="flex items-center gap-2">
              {/* Formatting Tools - Only show in basic mode */}
              {!isAdvancedMode && (
                <>
                  <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleFormatText}
                  title="Format Text - Bookman Old Style (Select All First)"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                
                {/* Line Spacing */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Line Spacing (Select All First)">
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

                {/* Indent Lines */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleIndentLines}
                  title="Indent Lines (1.27cm)"
                >
                  <Indent className="w-4 h-4" />
                </Button>
                
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
                  </div>

                  <Separator orientation="vertical" className="h-6" />
                </>
              )}

              {/* Edit Tools */}
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsSearchOpen(true)}
                  title="Find & Replace (Ctrl+F)"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* AI Literary Features */}
              <div className="flex items-center gap-1">
                <FeatureGate 
                  feature="aiLiteraryAnalysis"
                  fallback={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled
                      title="Literary Editor - Pro Feature"
                      className="opacity-50"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  }
                  showUpgradePrompt={false}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLiteraryEditorAnalysis}
                    disabled={isLiteraryEditorLoading}
                    title="Literary Editor Analysis"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </FeatureGate>
                
                <FeatureGate 
                  feature="aiDetection"
                  fallback={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled
                      title="AI Detection - Pro Feature"
                      className="opacity-50"
                    >
                      <Shield className="w-4 h-4" />
                    </Button>
                  }
                  showUpgradePrompt={false}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAiDetection}
                    disabled={isAiDetectionLoading}
                    title="AI Detection Test"
                  >
                    <Shield className="w-4 h-4" />
                  </Button>
                </FeatureGate>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* View Tools */}
              <div className="flex items-center gap-1">
                {/* Writing Mode */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Writing Mode">
                      <Type className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Writing Mode</Label>
                      <div className="space-y-1">
                        <Button
                          variant={writingMode === 'normal' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setWritingMode('normal')}
                        >
                          <Type className="w-4 h-4 mr-2" />
                          Normal
                        </Button>
                        <Button
                          variant={writingMode === 'focus' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setWritingMode('focus')}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Focus Mode
                        </Button>
                        <Button
                          variant={writingMode === 'distraction-free' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setWritingMode('distraction-free')}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Distraction-Free
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Theme */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Theme">
                      <Palette className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Theme</Label>
                      <div className="space-y-1">
                        <Button
                          variant={theme === 'light' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setTheme('light')}
                        >
                          <Sun className="w-4 h-4 mr-2" />
                          Light
                        </Button>
                        <Button
                          variant={theme === 'dark' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setTheme('dark')}
                        >
                          <Moon className="w-4 h-4 mr-2" />
                          Dark
                        </Button>
                        <Button
                          variant={theme === 'sepia' ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setTheme('sepia')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Sepia
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="h-6" />

                {/* Save */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSave}
                  disabled={updateChapterMutation.isPending}
                  title="Save (Ctrl+S)"
                >
                  <Save className="w-4 h-4" />
                </Button>

                {/* Advanced Editor Toggle */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                  title={isAdvancedMode ? "Exit Advanced Editor" : "Open Advanced Editor"}
                >
                  {isAdvancedMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

                {/* Writing Statistics */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-neutral-600">
                      {wordCount} words
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <h4 className="font-medium">Writing Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Words:</span>
                          <span>{wordCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Characters:</span>
                          <span>{characterCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reading time:</span>
                          <span>{readingTime} min</span>
                        </div>
                        {project.targetWordCount && (
                          <div className="flex justify-between">
                            <span>Progress:</span>
                            <span>{Math.round((wordCount / project.targetWordCount) * 100)}%</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Session Target Setting */}
                      <div className="border-t pt-3">
                        <Label className="text-sm">Session Target</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            value={sessionTarget}
                            onChange={(e) => setSessionTarget(Number(e.target.value))}
                            className="h-8"
                            min="50"
                            max="5000"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => setWritingSession({
                              startTime: new Date(),
                              wordCount: wordCount,
                              target: sessionTarget
                            })}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={isFullscreen ? () => setIsFullscreen(false) : onClose} 
                  title={isFullscreen ? "Exit Fullscreen (Esc)" : "Close (Esc)"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Editor Content */}
        {isAdvancedMode ? (
          <AdvancedEditor chapter={chapter} project={project} onClose={() => setIsAdvancedMode(false)} />
        ) : (
          <div className={`flex-1 p-8 overflow-y-auto ${getThemeClasses()}`}>
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
                
                {/* Chapter Content */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onMouseUp={handleTextSelection}
                    className={`min-h-[500px] border-none outline-none shadow-none resize-none bookman-font text-editor-content ${
                      theme === 'dark' 
                        ? 'bg-gray-900 text-gray-100' 
                        : theme === 'sepia' 
                        ? 'bg-amber-50 text-amber-900' 
                        : 'bg-white text-neutral-700'
                    }`}
                    placeholder="Start writing your story..."
                    style={{
                      lineHeight: currentLineSpacing === 'single' ? '1.0' : 
                                 currentLineSpacing === '1.5' ? '1.5' : '2.0'
                    }}
                  />
                
                {/* Word Tools Popover - Only show in normal/focus modes */}
                {wordTools.isOpen && (
                  <div
                    className="fixed z-50 bg-white border border-neutral-200 rounded-lg shadow-lg p-3 w-64"
                    style={{
                      left: Math.min(wordTools.position.x, window.innerWidth - 270),
                      top: Math.min(wordTools.position.y + 10, window.innerHeight - 300),
                    }}
                  >
                    {/* Header with close button */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">"{wordTools.word}"</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0"
                        onClick={() => setWordTools(prev => ({ ...prev, isOpen: false }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Menu Mode - Choose tool */}
                    {wordTools.mode === 'menu' && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setWordTools(prev => ({ ...prev, mode: 'thesaurus' }))}
                        >
                          <Book className="w-4 h-4" />
                          Find Synonyms
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setWordTools(prev => ({ ...prev, mode: 'spellcheck' }))}
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
                          <span className="text-xs text-neutral-500 font-medium">SYNONYMS</span>
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
                          <div className="text-sm text-neutral-600">Looking up synonyms...</div>
                        ) : thesaurusData && 'synonyms' in thesaurusData && (thesaurusData as ThesaurusEntry).synonyms.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {(thesaurusData as ThesaurusEntry).synonyms.slice(0, 8).map((synonym: string, index: number) => (
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
                            {(thesaurusData as ThesaurusEntry).synonyms.length > 8 && (
                              <div className="text-xs text-neutral-400">
                                +{(thesaurusData as ThesaurusEntry).synonyms.length - 8} more options
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-neutral-600">
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
                          <span className="text-xs text-neutral-500 font-medium">SPELLING</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 ml-auto text-xs"
                            onClick={() => setWordTools(prev => ({ ...prev, mode: 'menu' }))}
                          >
                            Back
                          </Button>
                        </div>
                        
                        {isSpellCheckLoading ? (
                          <div className="text-sm text-neutral-600">Checking spelling...</div>
                        ) : spellCheckData ? (
                          <div className="space-y-2">
                            {spellCheckData.isCorrect ? (
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
                                {spellCheckData.suggestions.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-neutral-500">SUGGESTIONS</div>
                                    <div className="flex flex-wrap gap-1">
                                      {spellCheckData.suggestions.slice(0, 6).map((suggestion: string, index: number) => (
                                        <Button
                                          key={index}
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs hover:bg-green-50 hover:border-green-300"
                                          onClick={() => replaceSelectedWord(suggestion)}
                                        >
                                          {suggestion}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-neutral-600">
                            Could not check spelling
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Detection Results */}
        {aiDetectionResult && (
          <div className="border-t border-neutral-200 p-4 bg-neutral-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${aiDetectionResult.verdict === 'PASS' ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-medium text-sm">AI Detection Results</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">{aiDetectionResult.humanPercentage}% Human</span>
                    <span className="text-neutral-500 mx-2">|</span>
                    <span className="text-red-600 font-medium">{aiDetectionResult.aiPercentage}% AI</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    aiDetectionResult.verdict === 'PASS' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {aiDetectionResult.verdict} ({aiDetectionResult.confidence} Confidence)
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiDetectionResult(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Session Progress Indicator - Only show in normal/focus modes */}
        {writingSession && (
          <div className="border-t border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="w-4 h-4" />
                  <span>Session: {sessionWordProgress}/{writingSession.target} words</span>
                </div>
                <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${sessionProgressPercent}%` }}
                  />
                </div>
                {sessionProgressPercent >= 100 && (
                  <span className="text-green-600 text-sm font-medium">Goal reached! 🎉</span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Literary Editor Dialog */}
    <Dialog open={isLiteraryEditorOpen} onOpenChange={setIsLiteraryEditorOpen}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Literary Editor
          </DialogTitle>
          <DialogDescription>
            Get professional feedback and analysis for your chapter
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-4 bg-neutral-50">
              {literaryEditorMessages.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-2">Welcome to Literary Editor</p>
                  <p className="text-sm">Click "Analyze Chapter" to get detailed feedback, or ask specific questions about your writing.</p>
                </div>
              ) : (
                literaryEditorMessages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white border border-neutral-200'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-neutral-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLiteraryEditorLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-white border border-neutral-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600"></div>
                      Analyzing your writing...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="mt-4 flex gap-2">
              <Textarea
                value={literaryEditorInput}
                onChange={(e) => setLiteraryEditorInput(e.target.value)}
                placeholder="Ask about character development, pacing, dialogue, style, or any writing aspect..."
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleLiteraryEditorSubmit();
                  }
                }}
              />
              <Button 
                onClick={handleLiteraryEditorSubmit}
                disabled={!literaryEditorInput.trim() || isLiteraryEditorLoading}
                className="px-6"
              >
                Send
              </Button>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="w-80 space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Quick Analysis</h4>
                <Button 
                  onClick={handleLiteraryEditorAnalysis}
                  disabled={isLiteraryEditorLoading || !content.trim()}
                  className="w-full mb-2"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Analyze Chapter
                </Button>
                <p className="text-xs text-neutral-600">
                  Get comprehensive feedback on structure, pacing, characters, dialogue, and style.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Quick Questions</h4>
                <div className="space-y-2">
                  {[
                    "How can I improve the pacing of this chapter?",
                    "Is the dialogue natural and engaging?",
                    "How effectively are my characters developed?",
                    "What literary devices could enhance this scene?",
                    "How can I strengthen the narrative voice?"
                  ].map((question, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-2 text-xs"
                      onClick={() => {
                        setLiteraryEditorInput(question);
                        // Use setTimeout to ensure state is updated before submit
                        setTimeout(() => handleLiteraryEditorSubmit(), 10);
                      }}
                      disabled={isLiteraryEditorLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Chapter Info</h4>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">Title:</span> {title}
                  </div>
                  <div>
                    <span className="font-medium">Words:</span> {getWordCount(content)}
                  </div>
                  <div>
                    <span className="font-medium">Project:</span> {project.title}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
