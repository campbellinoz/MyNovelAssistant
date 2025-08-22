import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChapterSchema, type Chapter, type InsertChapter } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal } from "lucide-react";

interface ChapterNavProps {
  projectId: string;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
}

export default function ChapterNav({ 
  projectId, 
  chapters, 
  selectedChapterId, 
  onSelectChapter 
}: ChapterNavProps) {
  const [isNewChapterOpen, setIsNewChapterOpen] = useState(false);
  const { toast } = useToast();

  const createChapterMutation = useMutation({
    mutationFn: async (data: InsertChapter) => {
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

  const form = useForm<InsertChapter>({
    resolver: zodResolver(insertChapterSchema),
    defaultValues: {
      projectId,
      title: "",
      content: "",
      order: chapters.length + 1,
    },
  });

  const onSubmit = (data: InsertChapter) => {
    createChapterMutation.mutate({
      ...data,
      order: chapters.length + 1,
    });
  };

  return (
    <div className="w-64 bg-white border-r border-neutral-100 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
            Chapters
          </h2>
          <Dialog open={isNewChapterOpen} onOpenChange={setIsNewChapterOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Chapter</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="title">Chapter Title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Enter chapter title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createChapterMutation.isPending}
                  >
                    {createChapterMutation.isPending ? "Creating..." : "Create Chapter"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewChapterOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Chapters List */}
        {chapters.map((chapter) => {
          const isActive = chapter.id === selectedChapterId;
          
          return (
            <div
              key={chapter.id}
              className={`
                chapter-item mb-2 p-3 rounded-lg cursor-pointer transition-colors duration-200
                ${isActive 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-neutral-50'
                }
              `}
              onClick={() => onSelectChapter(chapter.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${
                    isActive ? 'text-white' : 'text-neutral-800'
                  }`}>
                    {chapter.title}
                  </h3>
                  <p className={`text-xs mt-1 ${
                    isActive ? 'text-white opacity-80' : 'text-neutral-400'
                  }`}>
                    {chapter.wordCount?.toLocaleString() || 0} words
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`opacity-0 group-hover:opacity-100 ${
                    isActive ? 'hover:bg-white hover:bg-opacity-20' : 'hover:bg-neutral-200'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add chapter options menu
                  }}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add Chapter Button */}
        <Dialog open={isNewChapterOpen} onOpenChange={setIsNewChapterOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full p-3 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 transition-colors duration-200 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Chapter
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>
    </div>
  );
}
