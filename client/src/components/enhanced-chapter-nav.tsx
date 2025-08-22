import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, GripVertical, Trash2, BookOpen, Settings } from "lucide-react";
import { 
  type Chapter, type InsertChapter, 
  insertChapterSchema, 
  CHAPTER_TYPES, CHAPTER_SECTIONS,
  type ChapterType, type ChapterSection 
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CopyrightForm from "./copyright-form";

interface EnhancedChapterNavProps {
  projectId: string;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
}

interface CopyrightChapterNavProps {
  projectId: string;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
  selectedChapter: Chapter | null;
}

// Enhanced schema with chapter type and section
const enhancedChapterSchema = insertChapterSchema.extend({
  chapterType: z.string().min(1, "Chapter type is required"),
  section: z.string().min(1, "Section is required"),
});

type EnhancedChapterData = z.infer<typeof enhancedChapterSchema>;

function CopyrightChapterView({ 
  projectId, 
  chapters, 
  selectedChapterId, 
  onSelectChapter, 
  selectedChapter 
}: CopyrightChapterNavProps) {
  const isCopyrightSelected = selectedChapter?.chapterType === 'copyright';
  
  if (!isCopyrightSelected) {
    return null;
  }

  return (
    <div className="flex-1 flex">
      {/* Chapter Navigation (reduced width for copyright) */}
      <div className="w-64 bg-white border-r border-neutral-100 overflow-y-auto">
        <EnhancedChapterNavContent 
          projectId={projectId}
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={onSelectChapter}
        />
      </div>

      {/* Copyright Form */}
      <div className="flex-1 bg-white overflow-y-auto">
        <CopyrightForm projectId={projectId} />
      </div>
    </div>
  );
}

function EnhancedChapterNavContent({ 
  projectId, 
  chapters, 
  selectedChapterId, 
  onSelectChapter 
}: EnhancedChapterNavProps) {
  const [isNewChapterOpen, setIsNewChapterOpen] = useState(false);
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Group chapters by section
  const chaptersBySection = {
    front_matter: chapters.filter(ch => ch.section === 'front_matter').sort((a, b) => (a.order || 0) - (b.order || 0)),
    body: chapters.filter(ch => ch.section === 'body').sort((a, b) => (a.order || 0) - (b.order || 0)),
    back_matter: chapters.filter(ch => ch.section === 'back_matter').sort((a, b) => (a.order || 0) - (b.order || 0)),
  };

  const createChapterMutation = useMutation({
    mutationFn: async (data: EnhancedChapterData) => {
      const response = await apiRequest("POST", "/api/chapters", data);
      return response.json();
    },
    onSuccess: (newChapter) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "chapters", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsNewChapterOpen(false);
      form.reset();
      onSelectChapter(newChapter.id);
      toast({
        title: "Chapter created",
        description: "Your new chapter has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      const response = await apiRequest("DELETE", `/api/chapters/${chapterId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "chapters", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Chapter deleted",
        description: "Chapter has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createFrontMatterMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/front-matter`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "chapters", "metadata"] });
      toast({
        title: "Front pages created",
        description: "Default front pages sections have been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create front pages sections.",
        variant: "destructive",
      });
    },
  });

  const reorderChaptersMutation = useMutation({
    mutationFn: async (chapterUpdates: Array<{id: string, order: number, section?: string}>) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/chapters/reorder`, {
        chapters: chapterUpdates
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "chapters", "metadata"] });
      toast({
        title: "Chapters reordered",
        description: "Chapter order has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder chapters.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<EnhancedChapterData>({
    resolver: zodResolver(enhancedChapterSchema),
    defaultValues: {
      projectId,
      title: "",
      content: "",
      chapterType: "chapter",
      section: "body",
      order: chapters.length + 1,
    },
  });

  const onSubmit = (data: EnhancedChapterData) => {
    // Calculate order based on section
    const sectionChapters = chaptersBySection[data.section as ChapterSection] || [];
    const newOrder = sectionChapters.length + 1;
    
    createChapterMutation.mutate({
      ...data,
      order: newOrder,
    });
  };

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    setDraggedChapter(chapterId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetChapterId: string, targetSection: ChapterSection) => {
    e.preventDefault();
    
    if (!draggedChapter || draggedChapter === targetChapterId) {
      setDraggedChapter(null);
      return;
    }

    const draggedChapterData = chapters.find(ch => ch.id === draggedChapter);
    const targetChapterData = chapters.find(ch => ch.id === targetChapterId);
    
    if (!draggedChapterData || !targetChapterData) return;

    // Get all chapters that will be in the target section (including dragged chapter)
    const targetSectionChapters = chaptersBySection[targetSection];
    const draggedFromSameSection = draggedChapterData.section === targetSection;
    
    // Remove dragged chapter from its current position if moving within same section
    const chaptersToReorder = draggedFromSameSection 
      ? targetSectionChapters.filter(ch => ch.id !== draggedChapter)
      : targetSectionChapters;
    
    const targetIndex = chaptersToReorder.findIndex(ch => ch.id === targetChapterId);
    
    // Insert dragged chapter at target position
    const newOrder = [...chaptersToReorder];
    newOrder.splice(targetIndex, 0, draggedChapterData);
    
    // Create updates with new orders
    const updates = newOrder.map((chapter, index) => ({
      id: chapter.id,
      order: index + 1,
      section: targetSection
    }));

    reorderChaptersMutation.mutate(updates);
    setDraggedChapter(null);
  };

  const renderChapterItem = (chapter: Chapter) => (
    <div
      key={chapter.id}
      draggable
      onDragStart={(e) => handleDragStart(e, chapter.id)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, chapter.id, chapter.section as ChapterSection)}
      className={`
        group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
        ${selectedChapterId === chapter.id 
          ? 'bg-blue-50 border-blue-200 text-blue-900' 
          : 'bg-white border-neutral-200 hover:bg-neutral-50'
        }
        ${draggedChapter === chapter.id ? 'opacity-50' : ''}
      `}
      onClick={() => onSelectChapter(chapter.id)}
      data-testid={`chapter-item-${chapter.id}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <GripVertical className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{chapter.title}</span>
            {chapter.chapterType !== 'chapter' && (
              <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-600 rounded">
                {CHAPTER_TYPES[chapter.chapterType as ChapterType]}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {chapter.wordCount || 0} words
          </div>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`chapter-menu-${chapter.id}`}>
            <Settings className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="text-red-600 focus:text-red-600"
                data-testid={`delete-chapter-${chapter.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chapter
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{chapter.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteChapterMutation.mutate(chapter.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderSection = (sectionKey: ChapterSection, sectionTitle: string, sectionChapters: Chapter[]) => (
    <div key={sectionKey} className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-neutral-500" />
          <h3 className="font-medium text-sm text-neutral-700 uppercase tracking-wide">
            {sectionTitle}
          </h3>
          {sectionKey === 'front_matter' && sectionChapters.length === 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => createFrontMatterMutation.mutate()}
              disabled={createFrontMatterMutation.isPending}
              data-testid="create-front-matter"
            >
              Create Default
            </Button>
          )}
        </div>
        <span className="text-xs text-neutral-500">{sectionChapters.length} items</span>
      </div>
      
      <div className="space-y-2">
        {sectionChapters.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-200 rounded-lg">
            <div className="text-sm">
              {sectionKey === 'front_matter' ? 'No front pages sections' : 
               sectionKey === 'body' ? 'No story chapters yet' : 'No back pages sections'}
            </div>
            <div className="text-xs mt-1">
              {sectionKey === 'front_matter' ? 'Click "Create Default" to add standard sections' : 
               'Drag chapters here or create new ones'}
            </div>
          </div>
        ) : (
          sectionChapters.map(renderChapterItem)
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Manuscript</h2>
        <Dialog open={isNewChapterOpen} onOpenChange={setIsNewChapterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="add-chapter">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Chapter</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Chapter title..." {...field} data-testid="chapter-title-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chapterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chapter Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="chapter-type-select">
                            <SelectValue placeholder="Select chapter type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CHAPTER_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="chapter-section-select">
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CHAPTER_SECTIONS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewChapterOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createChapterMutation.isPending}
                    data-testid="create-chapter-submit"
                  >
                    {createChapterMutation.isPending ? "Creating..." : "Create Chapter"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Render sections */}
      {renderSection('front_matter', CHAPTER_SECTIONS.front_matter, chaptersBySection.front_matter)}
      {renderSection('body', CHAPTER_SECTIONS.body, chaptersBySection.body)}
      {renderSection('back_matter', CHAPTER_SECTIONS.back_matter, chaptersBySection.back_matter)}

      <div className="mt-6 p-3 bg-neutral-50 rounded-lg">
        <div className="text-xs text-neutral-600 space-y-1">
          <div>📊 Total: {chapters.length} chapters</div>
          <div>📄 Words: {chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function EnhancedChapterNav({ 
  projectId, 
  chapters, 
  selectedChapterId, 
  onSelectChapter 
}: EnhancedChapterNavProps) {
  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);
  const isCopyrightSelected = selectedChapter?.chapterType === 'copyright';
  
  // If copyright chapter is selected, show the specialized copyright view
  if (isCopyrightSelected) {
    return (
      <CopyrightChapterView 
        projectId={projectId}
        chapters={chapters}
        selectedChapterId={selectedChapterId}
        onSelectChapter={onSelectChapter}
        selectedChapter={selectedChapter}
      />
    );
  }

  // Default chapter navigation
  return (
    <div className="w-80 bg-white border-r border-neutral-100 overflow-y-auto">
      <EnhancedChapterNavContent 
        projectId={projectId}
        chapters={chapters}
        selectedChapterId={selectedChapterId}
        onSelectChapter={onSelectChapter}
      />
    </div>
  );
}