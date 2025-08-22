import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Project, type Chapter, updateProjectSchema, type UpdateProject } from "@shared/schema";
import { ArrowLeft, FileText, Clock, Target, BarChart3, Download, Edit, Plus, Users, MapPin, Lightbulb, BookOpen, Eye } from "lucide-react";

export default function PlotOutliner() {
  const { projectId } = useParams<{ projectId: string }>();
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isPlotDialogOpen, setIsPlotDialogOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [targetWordCount, setTargetWordCount] = useState<number>(0);
  const { toast } = useToast();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Use metadata endpoint - only need titles and basic info for outliner
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/projects", projectId, "chapters", "metadata"],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes aggressive caching
    gcTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Initialize target word count when project loads
  useEffect(() => {
    if (project?.targetWordCount) {
      setTargetWordCount(project.targetWordCount);
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: { targetWordCount: number }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsGoalsDialogOpen(false);
      toast({
        title: "Goals updated",
        description: "Your target word count has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update goals. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editProjectForm = useForm<UpdateProject>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      title: project?.title || "",
      description: project?.description || "",
      targetWordCount: project?.targetWordCount || 50000,
      // Bell's LOCK system
      lead: project?.lead || "",
      objective: project?.objective || "",
      confrontation: project?.confrontation || "",
      knockout: project?.knockout || "",
    },
  });

  // Update form when project data loads
  useEffect(() => {
    if (project) {
      editProjectForm.reset({
        title: project.title,
        description: project.description || "",
        targetWordCount: project.targetWordCount || 50000,
        // Bell's LOCK system
        lead: project.lead || "",
        objective: project.objective || "",
        confrontation: project.confrontation || "",
        knockout: project.knockout || "",
      });
    }
  }, [project, editProjectForm]);

  const editProjectMutation = useMutation({
    mutationFn: async (data: UpdateProject) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsEditProjectOpen(false);
      toast({
        title: "Project updated",
        description: "Your project details have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onEditProjectSubmit = (data: UpdateProject) => {
    editProjectMutation.mutate(data);
  };

  const updateChapterPlotMutation = useMutation({
    mutationFn: async (data: { chapterId: string; plotData: any }) => {
      const response = await apiRequest("PATCH", `/api/chapters/${data.chapterId}`, data.plotData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "chapters", "metadata"] });
      setIsPlotDialogOpen(false);
      setSelectedChapter(null);
      toast({
        title: "Plot updated",
        description: "Chapter plot information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update plot information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditPlot = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsPlotDialogOpen(true);
  };

  const [plotForm, setPlotForm] = useState({
    synopsis: '',
    plotPoints: [],
    storyBeats: '',
    conflicts: '',
    characterArcs: '',
    povCharacter: '',
    chapterPurpose: '',
    themes: '',
    foreshadowing: '',
    sceneCount: 1,
    setting: '',
    // Bell's plotting concepts
    bellSequenceType: '',
    containsMirrorMoment: 0,
    chapterStakes: '',
    conflictLevel: '',
    reactionBeat: '',
    nextActionHook: ''
  });

  // Update plot form when chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      setPlotForm({
        synopsis: (selectedChapter as any).synopsis || '',
        plotPoints: (selectedChapter as any).plotPoints || [],
        storyBeats: (selectedChapter as any).storyBeats || '',
        conflicts: (selectedChapter as any).conflicts || '',
        characterArcs: (selectedChapter as any).characterArcs || '',
        povCharacter: (selectedChapter as any).povCharacter || '',
        chapterPurpose: (selectedChapter as any).chapterPurpose || '',
        themes: (selectedChapter as any).themes || '',
        foreshadowing: (selectedChapter as any).foreshadowing || '',
        sceneCount: (selectedChapter as any).sceneCount || 1,
        setting: (selectedChapter as any).setting || '',
        // Bell's plotting concepts
        bellSequenceType: (selectedChapter as any).bellSequenceType || '',
        containsMirrorMoment: (selectedChapter as any).containsMirrorMoment || 0,
        chapterStakes: (selectedChapter as any).chapterStakes || '',
        conflictLevel: (selectedChapter as any).conflictLevel || '',
        reactionBeat: (selectedChapter as any).reactionBeat || '',
        nextActionHook: (selectedChapter as any).nextActionHook || ''
      });
    }
  }, [selectedChapter]);

  const handlePlotSubmit = () => {
    if (!selectedChapter) return;
    updateChapterPlotMutation.mutate({
      chapterId: selectedChapter.id,
      plotData: plotForm
    });
  };

  const handleExportOutline = async () => {
    if (!project || chapters.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Create some chapters before exporting your outline.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create outline content
      let outlineContent = `${project.title}\n`;
      outlineContent += `${'='.repeat(project.title.length)}\n\n`;
      
      if (project.description) {
        outlineContent += `Description: ${project.description}\n\n`;
      }
      
      outlineContent += `Project Statistics:\n`;
      outlineContent += `- Total Chapters: ${chapters.length}\n`;
      outlineContent += `- Total Words: ${totalWords.toLocaleString()}\n`;
      if (project.targetWordCount) {
        outlineContent += `- Target Words: ${project.targetWordCount.toLocaleString()}\n`;
        outlineContent += `- Progress: ${progress.toFixed(1)}%\n`;
      }
      outlineContent += `\n`;
      
      outlineContent += `Chapter Outline:\n`;
      outlineContent += `${'-'.repeat(16)}\n\n`;
      
      chapters.forEach((chapter, index) => {
        outlineContent += `Chapter ${index + 1}: ${chapter.title}\n`;
        outlineContent += `Words: ${chapter.wordCount?.toLocaleString() || 0}\n`;
        outlineContent += `Last Updated: ${new Date(chapter.updatedAt!).toLocaleDateString()}\n`;
        
        if ((chapter as any).synopsis) {
          outlineContent += `Synopsis: ${(chapter as any).synopsis}\n`;
        }
        
        if ((chapter as any).povCharacter) {
          outlineContent += `POV Character: ${(chapter as any).povCharacter}\n`;
        }
        
        if ((chapter as any).setting) {
          outlineContent += `Setting: ${(chapter as any).setting}\n`;
        }
        
        if ((chapter as any).chapterPurpose) {
          outlineContent += `Purpose: ${(chapter as any).chapterPurpose}\n`;
        }
        
        if ((chapter as any).storyBeats) {
          outlineContent += `Story Beats: ${(chapter as any).storyBeats}\n`;
        }
        
        if ((chapter as any).conflicts) {
          outlineContent += `Conflicts: ${(chapter as any).conflicts}\n`;
        }
        
        if ((chapter as any).themes) {
          outlineContent += `Themes: ${(chapter as any).themes}\n`;
        }
        
        if ((chapter as any).foreshadowing) {
          outlineContent += `Foreshadowing: ${(chapter as any).foreshadowing}\n`;
        }
        
        // Bell's plotting elements
        if ((chapter as any).bellSequenceType) {
          outlineContent += `Bell Sequence: ${(chapter as any).bellSequenceType}\n`;
        }
        
        if ((chapter as any).conflictLevel) {
          outlineContent += `Conflict Level: ${(chapter as any).conflictLevel}\n`;
        }
        
        if ((chapter as any).containsMirrorMoment === 1) {
          outlineContent += `Contains Mirror Moment: Yes\n`;
        }
        
        if ((chapter as any).chapterStakes) {
          outlineContent += `Stakes: ${(chapter as any).chapterStakes}\n`;
        }
        
        if ((chapter as any).reactionBeat) {
          outlineContent += `Reaction Beat: ${(chapter as any).reactionBeat}\n`;
        }
        
        if ((chapter as any).nextActionHook) {
          outlineContent += `Next Action Hook: ${(chapter as any).nextActionHook}\n`;
        }
        
        if ((chapter as any).characterArcs) {
          outlineContent += `Character Development: ${(chapter as any).characterArcs}\n`;
        }
        
        if ((chapter as any).sceneCount && (chapter as any).sceneCount > 1) {
          outlineContent += `Scene Count: ${(chapter as any).sceneCount}\n`;
        }
        
        // Fallback to content preview if no synopsis
        if (!(chapter as any).synopsis && chapter.content) {
          const plainText = chapter.content.replace(/<[^>]*>/g, '');
          const summary = plainText.substring(0, 200);
          outlineContent += `Content Preview: ${summary}${plainText.length > 200 ? '...' : ''}\n`;
        }
        
        outlineContent += `\n`;
      });

      // Create and download file
      const blob = new Blob([outlineContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_outline.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Outline exported",
        description: "Your plot outline has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export outline. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">Loading project...</h2>
        </div>
      </div>
    );
  }

  const totalWords = chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0);
  const averageWordsPerChapter = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;
  const progress = project.targetWordCount ? Math.min((totalWords / project.targetWordCount) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/writer/${projectId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Writer
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-neutral-800">{project.title}</h1>
                <p className="text-sm text-neutral-500">Plot Outline & Structure</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                <FileText className="w-3 h-3 mr-1" />
                {chapters.length} Chapters
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <BarChart3 className="w-3 h-3 mr-1" />
                {totalWords.toLocaleString()} Words
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Outline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Chapter Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chapters.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-800 mb-2">No chapters yet</h3>
                    <p className="text-neutral-500 mb-4">Create your first chapter to start outlining your plot.</p>
                    <Link href={`/writer/${projectId}`}>
                      <Button>
                        Start Writing
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-neutral-800">{chapter.title}</h3>
                              <div className="flex items-center gap-4 mt-1 mb-2">
                                <span className="text-xs text-neutral-500 flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {chapter.wordCount?.toLocaleString() || 0} words
                                </span>
                                <span className="text-xs text-neutral-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(chapter.updatedAt!).toLocaleDateString()}
                                </span>
                                {(chapter as any).sceneCount && (chapter as any).sceneCount > 1 && (
                                  <span className="text-xs text-neutral-500 flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {(chapter as any).sceneCount} scenes
                                  </span>
                                )}
                              </div>
                              
                              {/* Plot Information */}
                              <div className="space-y-2">
                                {(chapter as any).synopsis && (
                                  <div>
                                    <span className="text-xs font-medium text-neutral-700">Synopsis:</span>
                                    <p className="text-xs text-neutral-600 mt-1">{(chapter as any).synopsis}</p>
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap gap-2">
                                  {(chapter as any).povCharacter && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Users className="w-3 h-3 mr-1" />
                                      POV: {(chapter as any).povCharacter}
                                    </Badge>
                                  )}
                                  {(chapter as any).setting && (
                                    <Badge variant="secondary" className="text-xs">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {(chapter as any).setting}
                                    </Badge>
                                  )}
                                  {(chapter as any).chapterPurpose && (
                                    <Badge variant="outline" className="text-xs">
                                      <Target className="w-3 h-3 mr-1" />
                                      {(chapter as any).chapterPurpose}
                                    </Badge>
                                  )}
                                </div>
                                
                                {(chapter as any).storyBeats && (
                                  <div>
                                    <span className="text-xs font-medium text-neutral-700">Story Beats:</span>
                                    <p className="text-xs text-neutral-600 mt-1">{(chapter as any).storyBeats}</p>
                                  </div>
                                )}
                                
                                {(chapter as any).conflicts && (
                                  <div>
                                    <span className="text-xs font-medium text-neutral-700">Conflicts:</span>
                                    <p className="text-xs text-neutral-600 mt-1">{(chapter as any).conflicts}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlot(chapter)}
                            >
                              <BookOpen className="w-3 h-3 mr-1" />
                              Plot
                            </Button>
                            <Link href={`/writer/${projectId}/${chapter.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3 mr-1" />
                                Write
                              </Button>
                            </Link>
                          </div>
                        </div>
                        
                        {/* Content Preview - only show if no plot synopsis available */}
                        {!(chapter as any).synopsis && chapter.content && (
                          <div className="ml-11">
                            <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">
                              {chapter.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                              {chapter.content.length > 150 ? '...' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Plot Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Plot Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-neutral-800">{chapters.filter(c => (c as any).synopsis).length}</p>
                    <p className="text-xs text-neutral-500">Chapters Outlined</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">{chapters.filter(c => (c as any).povCharacter).length}</p>
                    <p className="text-xs text-neutral-500">POV Defined</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">{chapters.filter(c => (c as any).conflicts).length}</p>
                    <p className="text-xs text-neutral-500">With Conflicts</p>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">{chapters.reduce((sum, c) => sum + ((c as any).sceneCount || 0), 0)}</p>
                    <p className="text-xs text-neutral-500">Total Scenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-600">Word Count</span>
                    <span className="text-sm font-medium">{totalWords.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-neutral-600">Target</span>
                    <span className="text-sm text-neutral-500">{project.targetWordCount?.toLocaleString() || 'No target'}</span>
                  </div>
                  {project.targetWordCount && (
                    <div className="bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-neutral-800">{chapters.length}</p>
                    <p className="text-xs text-neutral-500">Chapters</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-800">{averageWordsPerChapter}</p>
                    <p className="text-xs text-neutral-500">Avg/Chapter</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/writer/${projectId}`}>
                  <Button className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Continue Writing
                  </Button>
                </Link>
                <Dialog open={isGoalsDialogOpen} onOpenChange={setIsGoalsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="w-4 h-4 mr-2" />
                      Set Project Goals
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Set Project Goals</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="targetWordCount">Target Word Count</Label>
                        <Input
                          id="targetWordCount"
                          type="number"
                          value={targetWordCount}
                          onChange={(e) => setTargetWordCount(Number(e.target.value))}
                          placeholder="50000"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Set your target word count for this novel
                        </p>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => updateProjectMutation.mutate({ targetWordCount })}
                          className="flex-1"
                          disabled={updateProjectMutation.isPending}
                        >
                          {updateProjectMutation.isPending ? "Updating..." : "Update Goals"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsGoalsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleExportOutline}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Outline
                </Button>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Project Details</CardTitle>
                  <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Project Details</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={editProjectForm.handleSubmit(onEditProjectSubmit)} className="space-y-4">
                        <div>
                          <Label htmlFor="edit-title">Project Title</Label>
                          <Input
                            id="edit-title"
                            {...editProjectForm.register("title")}
                            placeholder="Enter project title"
                          />
                          {editProjectForm.formState.errors.title && (
                            <p className="text-sm text-red-500 mt-1">
                              {editProjectForm.formState.errors.title.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            {...editProjectForm.register("description")}
                            placeholder="Describe your novel project"
                            rows={3}
                          />
                          {editProjectForm.formState.errors.description && (
                            <p className="text-sm text-red-500 mt-1">
                              {editProjectForm.formState.errors.description.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="edit-target">Target Word Count</Label>
                          <Input
                            id="edit-target"
                            type="number"
                            {...editProjectForm.register("targetWordCount", { 
                              valueAsNumber: true 
                            })}
                            placeholder="50000"
                          />
                          {editProjectForm.formState.errors.targetWordCount && (
                            <p className="text-sm text-red-500 mt-1">
                              {editProjectForm.formState.errors.targetWordCount.message}
                            </p>
                          )}
                        </div>
                        
                        <Separator className="my-4" />
                        <h3 className="text-sm font-medium text-neutral-800 mb-3">James Scott Bell's LOCK System</h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor="edit-lead">Lead Character</Label>
                            <p className="text-xs text-neutral-500 mb-2">Who is your protagonist? The character the reader follows and cares about.</p>
                            <Input
                              id="edit-lead"
                              {...editProjectForm.register("lead")}
                              placeholder="Example: Detective Sarah Martinez"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-objective">Objective</Label>
                            <p className="text-xs text-neutral-500 mb-2">What does your lead character want? This drives the entire story.</p>
                            <Textarea
                              id="edit-objective"
                              {...editProjectForm.register("objective")}
                              placeholder="Example: To solve her father's murder and clear her own name"
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-confrontation">Confrontation</Label>
                            <p className="text-xs text-neutral-500 mb-2">What stands in the way? The main conflict or opposition.</p>
                            <Textarea
                              id="edit-confrontation"
                              {...editProjectForm.register("confrontation")}
                              placeholder="Example: Corrupt police force, powerful crime family, her own traumatic memories"
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-knockout">Knockout</Label>
                            <p className="text-xs text-neutral-500 mb-2">How does it end? The final resolution or outcome.</p>
                            <Textarea
                              id="edit-knockout"
                              {...editProjectForm.register("knockout")}
                              placeholder="Example: Sarah exposes the corruption, gets justice for her father, and finds peace"
                              rows={2}
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={editProjectMutation.isPending}
                          >
                            {editProjectMutation.isPending ? "Updating..." : "Update Project"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditProjectOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-800 mb-1">Description</h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">{project.description}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-neutral-800 mb-1">Created</h4>
                  <p className="text-sm text-neutral-600">{new Date(project.createdAt!).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-neutral-800 mb-1">Last Updated</h4>
                  <p className="text-sm text-neutral-600">{new Date(project.updatedAt!).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Plot Planning Dialog */}
      <Dialog open={isPlotDialogOpen} onOpenChange={setIsPlotDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plot Planning - {selectedChapter?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="synopsis">Chapter Synopsis</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Write 2-3 sentences summarizing the main events. Focus on action and outcomes, not details.
                </p>
                <Textarea
                  id="synopsis"
                  value={plotForm.synopsis}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, synopsis: e.target.value }))}
                  placeholder="Example: Sarah discovers her father's secret letters in the attic. She confronts him about his hidden past, leading to a heated argument that reveals family secrets. The chapter ends with Sarah storming out, determined to find the truth herself."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="storyBeats">Story Beats</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Identify the major story structure moments. Consider: Hook, Inciting Incident, Plot Points, Climax, Resolution.
                </p>
                <Textarea
                  id="storyBeats"
                  value={plotForm.storyBeats}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, storyBeats: e.target.value }))}
                  placeholder="Example: Hook - Sarah finds mysterious letters. Inciting incident - Confrontation with father. Rising action - Family secrets revealed. Mini-climax - Sarah storms out with new determination."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="conflicts">Conflicts</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Note internal (character vs. self), interpersonal (character vs. character), or external conflicts (vs. society/nature).
                </p>
                <Textarea
                  id="conflicts"
                  value={plotForm.conflicts}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, conflicts: e.target.value }))}
                  placeholder="Example: INTRODUCED - Sarah vs. Father (trust broken), Sarah vs. Self (questioning family history). ESCALATED - Family loyalty vs. need for truth."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="characterArcs">Character Development</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Track emotional growth, changing beliefs, new skills, or shifting relationships. Show before/after states.
                </p>
                <Textarea
                  id="characterArcs"
                  value={plotForm.characterArcs}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, characterArcs: e.target.value }))}
                  placeholder="Example: Sarah - From trusting daughter to suspicious investigator. Gains courage to confront authority. Father - From protective parent to defensive man with secrets exposed."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="povCharacter">POV Character</Label>
                  <p className="text-xs text-neutral-500 mb-2">💡 Whose eyes/thoughts do we follow?</p>
                  <Input
                    id="povCharacter"
                    value={plotForm.povCharacter}
                    onChange={(e) => setPlotForm(prev => ({ ...prev, povCharacter: e.target.value }))}
                    placeholder="Example: Sarah Martinez"
                  />
                </div>
                <div>
                  <Label htmlFor="sceneCount">Scene Count</Label>
                  <p className="text-xs text-neutral-500 mb-2">
                    💡 <strong>Tip:</strong> A scene = continuous action in one time/place. New scene when location changes, time jumps, or POV shifts. 
                    Most chapters have 1-3 scenes. Example: Scene 1 - Attic discovery, Scene 2 - Kitchen confrontation.
                  </p>
                  <Input
                    id="sceneCount"
                    type="number"
                    min="1"
                    value={plotForm.sceneCount}
                    onChange={(e) => setPlotForm(prev => ({ ...prev, sceneCount: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              
              {/* Bell's Chapter Structure Elements */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Bell's Structure Elements
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bellSequenceType">Sequence Type</Label>
                    <p className="text-xs text-blue-600 mb-2">
                      💡 Action = character acts, Reaction = character processes/responds, Setup = prepares for next action
                    </p>
                    <select 
                      id="bellSequenceType"
                      value={plotForm.bellSequenceType || ''}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, bellSequenceType: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select sequence type...</option>
                      <option value="Action">Action Sequence</option>
                      <option value="Reaction">Reaction Sequence</option>
                      <option value="Setup">Setup Sequence</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="conflictLevel">Conflict Level</Label>
                    <p className="text-xs text-blue-600 mb-2">💡 How intense is the tension/conflict in this chapter?</p>
                    <select 
                      id="conflictLevel"
                      value={plotForm.conflictLevel || ''}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, conflictLevel: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select conflict level...</option>
                      <option value="Low">Low - Setup, reflection, breathing room</option>
                      <option value="Medium">Medium - Moderate tension, complications</option>
                      <option value="High">High - Major conflict, climactic moments</option>
                    </select>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="containsMirrorMoment"
                        checked={plotForm.containsMirrorMoment === 1}
                        onChange={(e) => setPlotForm(prev => ({ ...prev, containsMirrorMoment: e.target.checked ? 1 : 0 }))}
                        className="rounded"
                      />
                      <Label htmlFor="containsMirrorMoment" className="text-sm font-medium">Contains Mirror Moment</Label>
                    </div>
                    <p className="text-xs text-blue-600">💡 The moment when character looks at themselves and decides who they want to be</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="chapterStakes">What's at Risk</Label>
                    <p className="text-xs text-blue-600 mb-2">💡 What could the character lose in this chapter?</p>
                    <Input
                      id="chapterStakes"
                      value={plotForm.chapterStakes || ''}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, chapterStakes: e.target.value }))}
                      placeholder="Example: Trust with partner, key evidence, last chance at redemption"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reactionBeat">Reaction Beat</Label>
                    <p className="text-xs text-blue-600 mb-2">💡 How does the character emotionally respond to what happened before?</p>
                    <Textarea
                      id="reactionBeat"
                      value={plotForm.reactionBeat || ''}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, reactionBeat: e.target.value }))}
                      placeholder="Example: Sarah feels betrayed, questions everything she believed, decides to go it alone"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nextActionHook">Next Action Hook</Label>
                    <p className="text-xs text-blue-600 mb-2">💡 What compels the story forward to the next chapter?</p>
                    <Textarea
                      id="nextActionHook"
                      value={plotForm.nextActionHook || ''}
                      onChange={(e) => setPlotForm(prev => ({ ...prev, nextActionHook: e.target.value }))}
                      placeholder="Example: Mysterious phone call, new clue discovered, deadline approaching"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="chapterPurpose">Chapter Purpose</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Every chapter should advance plot, develop character, or reveal information. What's its job?
                </p>
                <Textarea
                  id="chapterPurpose"
                  value={plotForm.chapterPurpose}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, chapterPurpose: e.target.value }))}
                  placeholder="Example: Establish the central mystery, show Sarah's determination, create the inciting incident that drives the main plot forward."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="themes">Themes Explored</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> What universal human experiences or questions does this chapter touch on?
                </p>
                <Textarea
                  id="themes"
                  value={plotForm.themes}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, themes: e.target.value }))}
                  placeholder="Example: Family secrets vs. truth, trust between generations, the weight of the past on the present, choosing difficult truths over comfortable lies."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="foreshadowing">Foreshadowing</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Plant subtle clues about future events. Use dialogue, imagery, or character actions as hints.
                </p>
                <Textarea
                  id="foreshadowing"
                  value={plotForm.foreshadowing}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, foreshadowing: e.target.value }))}
                  placeholder="Example: Father's nervous glance at the locked desk drawer, Sarah's comment about 'family always coming first,' the torn photograph hidden among the letters."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="setting">Setting/Location</Label>
                <p className="text-xs text-neutral-500 mb-2">
                  💡 <strong>Tip:</strong> Setting affects mood and conflict. Consider time of day, weather, and emotional atmosphere.
                </p>
                <Input
                  id="setting"
                  value={plotForm.setting}
                  onChange={(e) => setPlotForm(prev => ({ ...prev, setting: e.target.value }))}
                  placeholder="Example: Family home attic (dusty, cramped) → Kitchen (bright, tense confrontation)"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-6 border-t">
            <Button
              onClick={handlePlotSubmit}
              className="flex-1"
              disabled={updateChapterPlotMutation.isPending}
            >
              {updateChapterPlotMutation.isPending ? "Saving..." : "Save Plot Information"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPlotDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}