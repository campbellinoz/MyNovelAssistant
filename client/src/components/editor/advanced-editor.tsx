import { useState, useEffect, useRef, KeyboardEvent, MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAutoSave } from "@/hooks/use-autosave";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Chapter, type Project } from "@shared/schema";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Eye, Search, Replace, Target, Clock, Zap, Type, 
  Palette, Moon, Sun, RotateCcw, RotateCw, Save, MoreHorizontal,
  CheckCircle, AlertCircle, FileText, Timer, Indent, X
} from "lucide-react";

interface AdvancedEditorProps {
  chapter: Chapter;
  project: Project;
  onClose: () => void;
}

type WritingMode = 'normal' | 'focus' | 'distraction-free';
type Theme = 'light' | 'dark' | 'sepia';

interface WritingSession {
  startTime: Date;
  wordCount: number;
  target: number;
}

export default function AdvancedEditor({ chapter, project, onClose }: AdvancedEditorProps) {
  const [content, setContent] = useState(chapter.content || "");
  const [title, setTitle] = useState(chapter.title);
  const [writingMode, setWritingMode] = useState<WritingMode>('normal');
  const [theme, setTheme] = useState<Theme>('light');
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [writingSession, setWritingSession] = useState<WritingSession | null>(null);
  const [sessionTarget, setSessionTarget] = useState(500);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentLineSpacing, setCurrentLineSpacing] = useState<'single' | '1.5' | 'double'>('single');

  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const richEditorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
  }, [chapter.id]);

  // Center modal on initial load
  useEffect(() => {
    const centerModal = () => {
      const modalWidth = 1200; // Approximate modal width
      const modalHeight = 700; // Approximate modal height
      const x = (window.innerWidth - modalWidth) / 2;
      const y = (window.innerHeight - modalHeight) / 2;
      setModalPosition({ x: Math.max(50, x), y: Math.max(50, y) });
    };
    centerModal();
  }, []);

  // Dragging functionality
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      // Use screen coordinates for better multi-monitor support
      setDragStart({
        x: e.screenX - modalPosition.x,
        y: e.screenY - modalPosition.y
      });
      console.log('Drag started:', { screenX: e.screenX, screenY: e.screenY, modalPos: modalPosition });
    }
  };

  // Remove these old handlers since we're using global event listeners
  const handleMouseMove = () => {};
  const handleMouseUp = () => {};

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
        // Use screen coordinates to properly handle multi-monitor setups
        const newX = e.screenX - dragStart.x;
        const newY = e.screenY - dragStart.y;
        
        console.log('Dragging to:', { x: newX, y: newY, screenX: e.screenX, screenY: e.screenY });
        
        // Allow unlimited movement in all directions for multi-monitor
        setModalPosition({
          x: newX,
          y: Math.max(0, newY) // Only prevent going above top
        });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        console.log('Drag ended at position:', modalPosition);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, modalPosition]);

  // Update local state when chapter changes
  useEffect(() => {
    setContent(chapter.content || "");
    setTitle(chapter.title);
    // Reset undo/redo stacks when chapter changes
    setUndoStack([]);
    setRedoStack([]);
  }, [chapter.id, chapter.content, chapter.title]);

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
    return Math.ceil(words / 200); // Average reading speed: 200 words per minute
  };

  const handleContentChange = (newContent: string) => {
    // Add current content to undo stack before changing
    if (content !== newContent) {
      setUndoStack(prev => [...prev.slice(-19), content]); // Keep last 20 states
      setRedoStack([]); // Clear redo stack on new change
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
    
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    // Ctrl+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      handleRedo();
    }
    // Ctrl+F for find
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      setIsSearchOpen(true);
    }
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
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
    if (!richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    const isAllSelected = selection && selection.toString().length === (editor.textContent?.length || 0) && editor.textContent && editor.textContent.length > 0;
    
    if (isAllSelected) {
      // Format the text by adding proper paragraph spacing
      const formattedContent = formatParagraphs(editor.textContent || '');
      editor.innerHTML = formattedContent;
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
    if (!richEditorRef.current) return;
    
    // Automatically select all text first
    richEditorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(richEditorRef.current);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
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
    if (!richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      if (selectedText) {
        // Add indentation to selected text
        const indentedText = selectedText.split('\n').map(line => {
          if (line.trim().length === 0) return line;
          return '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + line; // 9 non-breaking spaces for 1.27cm
        }).join('<br>');
        
        // Replace selection with indented text
        document.execCommand('insertHTML', false, indentedText);
        handleContentChange(editor.innerHTML);
        
        toast({
          title: "Lines Indented",
          description: "Added 1.27cm indentation to selected lines",
        });
      } else {
        // No selection, indent current line
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
        handleContentChange(editor.innerHTML);
        
        toast({
          title: "Line Indented",
          description: "Added 1.27cm indentation",
        });
      }
    }
  };

  const handleTextFormat = (format: 'bold' | 'italic' | 'underline') => {
    if (!richEditorRef.current) return;
    
    // Focus the rich text editor
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
    
    // Update content from the div
    const newContent = richEditorRef.current.innerHTML;
    handleContentChange(newContent);
    
    toast({
      title: "Text Formatted",
      description: `Applied ${format} formatting to selected text.`,
    });
  };

  const handleSearch = () => {
    if (!searchQuery || !richEditorRef.current) return;
    
    const editor = richEditorRef.current;
    const text = editor.textContent || '';
    const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    
    if (index !== -1) {
      editor.focus();
      // For contentEditable, we need to select text differently
      const range = document.createRange();
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let currentPos = 0;
      let textNode;
      
      while (textNode = walker.nextNode()) {
        const nodeLength = textNode.textContent?.length || 0;
        if (currentPos + nodeLength > index) {
          range.setStart(textNode, index - currentPos);
          range.setEnd(textNode, Math.min(index - currentPos + searchQuery.length, nodeLength));
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          break;
        }
        currentPos += nodeLength;
      }
    } else {
      toast({
        title: "Not found",
        description: `"${searchQuery}" was not found in the text.`,
        variant: "destructive",
      });
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery || !richEditorRef.current) return;
    
    const textContent = richEditorRef.current.textContent || '';
    const newContent = textContent.replace(
      new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      replaceQuery
    );
    
    const replacements = (textContent.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    
    if (replacements > 0) {
      richEditorRef.current.textContent = newContent;
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

  const wordCount = getWordCount(content);
  const characterCount = getCharacterCount(content);
  const readingTime = getReadingTime(content);
  
  // Writing session progress
  const sessionWordProgress = writingSession ? wordCount - writingSession.wordCount : 0;
  const sessionProgressPercent = writingSession ? Math.min((sessionWordProgress / writingSession.target) * 100, 100) : 0;

  // Theme classes
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="w-[95vw] h-[90vh] max-w-7xl p-0 !fixed !m-0"
        style={{
          position: 'fixed !important',
          left: `${modalPosition.x}px !important`,
          top: `${modalPosition.y}px !important`,
          transform: 'none !important',
          cursor: isDragging ? 'grabbing' : 'default',
          zIndex: 99999,
          margin: '0 !important',
          inset: 'unset !important',
          translate: 'none !important',
          width: '1200px',
          height: '700px',
          maxWidth: 'none !important',
          maxHeight: 'none !important'
        }}
      >
        <DialogHeader 
          className="flex items-center justify-between p-4 border-b cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg font-semibold">Advanced Text Editor</DialogTitle>
            <div className="text-sm text-neutral-500">
              {chapter.title}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-400">
              Drag to move between screens • X: {Math.round(modalPosition.x)} Y: {Math.round(modalPosition.y)}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="cursor-pointer"
              title="Close Editor"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Advanced text editor with rich formatting, writing modes, themes, and drag-and-drop functionality for multi-screen setups.
          </DialogDescription>
        </DialogHeader>
        <div className={`flex-1 flex flex-col ${getThemeClasses()}`}>
      {/* Advanced Toolbar */}
      {writingMode === 'normal' || writingMode === 'focus' ? (
        <div className="border-b border-neutral-100 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Formatting Tools */}
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
                    <Button variant="ghost" size="sm" title="Line Spacing (Auto-selects All Text)">
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

              {/* Search & Replace */}
              <Button 
                variant="ghost" 
                size="sm" 
                title="Find & Replace (Ctrl+F)"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-4 h-4" />
              </Button>
              
              <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Find & Replace</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="search">Find</Label>
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for text..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div>
                      <Label htmlFor="replace">Replace with</Label>
                      <Input
                        id="replace"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Replace with..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSearch} className="flex-1">
                        Find Next
                      </Button>
                      <Button onClick={handleReplaceAll} variant="outline" className="flex-1">
                        Replace All
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Writing Mode */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" title="Writing Mode">
                    <Eye className="w-4 h-4" />
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
            </div>

            {/* Writing Statistics */}
            <div className="flex items-center gap-4">
              {/* Session Progress */}
              {writingSession && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-500">
                    Session: {sessionWordProgress}/{writingSession.target} words
                  </div>
                  <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${sessionProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Word Count & Stats */}
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
            </div>
          </div>
        </div>
      ) : null}

      {/* Editor Content */}
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
            


            {/* Rich Text Chapter Content */}
            <div
              ref={richEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const target = e.currentTarget;
                handleContentChange(target.innerHTML);
              }}
              onKeyDown={(e) => {
                // Handle keyboard events for contenteditable div
                if (e.key === 'Enter') {
                  e.preventDefault();
                  document.execCommand('insertHTML', false, '<br><br>');
                }
              }}
              className={`min-h-[600px] max-h-[600px] overflow-y-auto border-none outline-none shadow-none resize-none bookman-font text-editor-content focus:ring-0 p-4 ${
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
              dangerouslySetInnerHTML={{ __html: content || "Start writing your story..." }}
            />
          </div>
        </div>
      </div>

      {/* Session Progress Indicator (bottom of screen in distraction-free mode) */}
      {writingMode === 'distraction-free' && writingSession && sessionWordProgress < writingSession.target ? (
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
      ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}