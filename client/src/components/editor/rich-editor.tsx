import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-autosave";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Chapter, type Project, updateChapterSchema } from "@shared/schema";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Eye,
  Type
} from "lucide-react";

interface RichEditorProps {
  chapter: Chapter;
  project: Project;
}

export default function RichEditor({ chapter, project }: RichEditorProps) {
  const [content, setContent] = useState(chapter.content || "");
  const [title, setTitle] = useState(chapter.title);
  
  // Determine if this chapter should be centered
  const shouldCenter = chapter.chapterType === 'dedication' || chapter.chapterType === 'epigraph';

  // Update local state when chapter changes
  useEffect(() => {
    setContent(chapter.content || "");
    setTitle(chapter.title);
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

  // Accurate word count by stripping HTML tags and entities
  const getWordCount = (text: string): number => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };
  
  const wordCount = getWordCount(content);

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  const applyBookmanFormat = () => {
    // Get the editor content element
    const editor = document.querySelector('.prose textarea') as HTMLTextAreaElement;
    if (!editor) return;

    // Apply Bookman Old Style formatting with CSS
    editor.style.fontFamily = '"Bookman Old Style", "Times New Roman", serif';
    editor.style.fontSize = '12pt';
    editor.style.lineHeight = '1.5';
    
    // Save the current selection/cursor position
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    // Process the content to add paragraph indentation
    const lines = editor.value.split('\n');
    const formattedLines = lines.map((line, index) => {
      // If this is the start of a new paragraph (non-empty line after empty line or first line)
      if (line.trim() && (index === 0 || !lines[index - 1].trim())) {
        // Add indentation if not already present
        if (!line.startsWith('    ') && !line.startsWith('\t')) {
          return '    ' + line; // Add 4 spaces for indentation (approximates 1.27cm)
        }
      }
      return line;
    });
    
    const formattedContent = formattedLines.join('\n');
    setContent(formattedContent);
    
    // Restore cursor position (approximately)
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start, end);
    }, 10);
  };

  return (
    <>
      {/* Editor Toolbar */}
      <div className="border-b border-neutral-100 p-3">
        <div className="flex items-center gap-2">
          {/* Formatting Tools */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('bold')}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('italic')}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('underline')}
            >
              <Underline className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-neutral-200"></div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('justifyLeft')}
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('justifyCenter')}
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('justifyRight')}
            >
              <AlignRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-neutral-200"></div>

          {/* Lists */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('insertUnorderedList')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleFormat('insertOrderedList')}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-neutral-200"></div>

          {/* Bookman Format */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={applyBookmanFormat}
            title="Format as Bookman Old Style 12pt with paragraph indentation"
          >
            <Type className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-neutral-200"></div>

          {/* Focus Mode */}
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>

          <div className="flex-1"></div>

          {/* Word Count */}
          <div className="text-sm text-neutral-500">
            {wordCount} words
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            {/* Chapter Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`text-3xl font-bold text-neutral-800 mb-8 w-full border-none outline-none bg-transparent ${shouldCenter ? 'text-center' : ''}`}
              placeholder="Chapter Title"
            />
            
            {/* Chapter Content */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`min-h-[600px] leading-7 text-neutral-700 border-none outline-none shadow-none resize-none text-base bookman-formatted ${shouldCenter ? 'text-center' : ''}`}
              placeholder={shouldCenter ? "Write your dedication or epigraph..." : "Start writing your story..."}
              style={{
                fontFamily: '"Bookman Old Style", "Times New Roman", serif',
                fontSize: '12pt',
                lineHeight: '1.5',
                textAlign: shouldCenter ? 'center' : 'left'
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
