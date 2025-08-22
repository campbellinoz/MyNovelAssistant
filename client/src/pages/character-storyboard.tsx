import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, ArrowLeft, Plus, Edit, Trash2, Eye, Heart, Sword, 
  BookOpen, Clock, Network, User, Palette, Lightbulb, 
  GitBranch, Target, Zap
} from "lucide-react";
import InteractiveCharacterProfile from "@/components/InteractiveCharacterProfile";
import { z } from "zod";

// Schema for character development timeline
const timelineEntrySchema = z.object({
  characterId: z.string(),
  chapterId: z.string().optional(),
  timelinePosition: z.number(),
  eventType: z.enum(["introduction", "development", "conflict", "resolution", "transformation"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  emotionalState: z.string().optional(),
  relationshipChanges: z.record(z.any()).optional(),
  visualNotes: z.string().optional(),
  storyboardImage: z.string().optional(),
});

const relationshipSchema = z.object({
  projectId: z.string(),
  characterAId: z.string(),
  characterBId: z.string(),
  relationshipType: z.enum(["family", "romantic", "friendship", "rivalry", "mentor", "antagonist"]),
  description: z.string().optional(),
  currentStatus: z.string().optional(),
});

type TimelineEntry = {
  id: string;
  characterId: string;
  chapterId?: string;
  timelinePosition: number;
  eventType: "introduction" | "development" | "conflict" | "resolution" | "transformation";
  title: string;
  description?: string;
  emotionalState?: string;
  relationshipChanges?: Record<string, any>;
  visualNotes?: string;
  storyboardImage?: string;
  createdAt: Date;
  updatedAt: Date;
};

type Character = {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description?: string;
  traits?: Record<string, any>;
  characterArc?: string;
  developmentStages?: any[];
  relationships?: Record<string, any>;
  motivations?: string;
  conflicts?: string;
  backstory?: string;
  appearance?: string;
  storyboardNotes?: any[];
  keyScenes?: any[];
  emotionalJourney?: any[];
  introductionChapter?: string;
  majorDevelopmentPoints?: any[];
  characterTheme?: string;
  symbolism?: string;
  createdAt: Date;
  updatedAt: Date;
};

type Relationship = {
  id: string;
  projectId: string;
  characterAId: string;
  characterBId: string;
  relationshipType: "family" | "romantic" | "friendship" | "rivalry" | "mentor" | "antagonist";
  description?: string;
  dynamicProgression?: any[];
  conflictPoints?: any[];
  bondingMoments?: any[];
  currentStatus?: string;
  createdAt: Date;
  updatedAt: Date;
};

interface CharacterStoryboardProps {
  projectId: string;
}

export default function CharacterStoryboard({ projectId }: CharacterStoryboardProps) {
  const [location, setLocation] = useLocation();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "timeline" | "relationships" | "storyboard">("overview");
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [editingTimelineEntry, setEditingTimelineEntry] = useState<TimelineEntry | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: project } = useQuery({
    queryKey: ["/api/projects", projectId],
  });

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/projects", projectId, "characters"],
  });

  // Use metadata endpoint - only need titles and basic info for storyboard
  const { data: chapters = [] } = useQuery({
    queryKey: ["/api/projects", projectId, "chapters", "metadata"],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes aggressive caching
    gcTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: timeline = [] } = useQuery<TimelineEntry[]>({
    queryKey: ["/api/characters", selectedCharacter?.id, "timeline"],
    enabled: !!selectedCharacter,
  });

  const { data: relationships = [] } = useQuery<Relationship[]>({
    queryKey: ["/api/projects", projectId, "relationships"],
  });

  const timelineForm = useForm({
    resolver: zodResolver(timelineEntrySchema),
    defaultValues: {
      characterId: selectedCharacter?.id || "",
      timelinePosition: timeline.length + 1,
      eventType: "development" as const,
      title: "",
      description: "",
      emotionalState: "",
      visualNotes: "",
    },
  });

  const relationshipForm = useForm({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      projectId,
      characterAId: "",
      characterBId: "",
      relationshipType: "friendship" as const,
      description: "",
      currentStatus: "",
    },
  });

  // Set initial character if available
  useEffect(() => {
    if (characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(characters[0]);
    }
  }, [characters, selectedCharacter]);

  // Update form when editing timeline entry
  useEffect(() => {
    if (editingTimelineEntry) {
      timelineForm.reset({
        characterId: editingTimelineEntry.characterId,
        chapterId: editingTimelineEntry.chapterId,
        timelinePosition: editingTimelineEntry.timelinePosition,
        eventType: editingTimelineEntry.eventType,
        title: editingTimelineEntry.title,
        description: editingTimelineEntry.description || "",
        emotionalState: editingTimelineEntry.emotionalState || "",
        visualNotes: editingTimelineEntry.visualNotes || "",
      });
    }
  }, [editingTimelineEntry, timelineForm]);

  const createTimelineEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/character-timeline", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters", selectedCharacter?.id, "timeline"] });
      setIsTimelineModalOpen(false);
      setEditingTimelineEntry(null);
      timelineForm.reset();
      toast({
        title: "Timeline entry created",
        description: "Character development milestone has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create timeline entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTimelineEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/character-timeline/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters", selectedCharacter?.id, "timeline"] });
      setIsTimelineModalOpen(false);
      setEditingTimelineEntry(null);
      timelineForm.reset();
      toast({
        title: "Timeline entry updated",
        description: "Character development milestone has been updated.",
      });
    },
  });

  const createRelationshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/character-relationships", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "relationships"] });
      setIsRelationshipModalOpen(false);
      relationshipForm.reset();
      toast({
        title: "Relationship created",
        description: "Character relationship has been established.",
      });
    },
  });

  const deleteTimelineEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/character-timeline/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters", selectedCharacter?.id, "timeline"] });
      toast({
        title: "Timeline entry deleted",
        description: "Character development milestone has been removed.",
      });
    },
  });

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "introduction": return <User className="h-4 w-4" />;
      case "development": return <Target className="h-4 w-4" />;
      case "conflict": return <Sword className="h-4 w-4" />;
      case "resolution": return <Lightbulb className="h-4 w-4" />;
      case "transformation": return <Zap className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "introduction": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "development": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "conflict": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "resolution": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "transformation": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "romantic": return <Heart className="h-4 w-4 text-red-500" />;
      case "family": return <Users className="h-4 w-4 text-blue-500" />;
      case "friendship": return <User className="h-4 w-4 text-green-500" />;
      case "rivalry": return <Sword className="h-4 w-4 text-orange-500" />;
      case "mentor": return <BookOpen className="h-4 w-4 text-purple-500" />;
      case "antagonist": return <Zap className="h-4 w-4 text-red-600" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const onSubmitTimelineEntry = (data: any) => {
    if (editingTimelineEntry) {
      updateTimelineEntryMutation.mutate({ id: editingTimelineEntry.id, data });
    } else {
      createTimelineEntryMutation.mutate({ ...data, characterId: selectedCharacter?.id });
    }
  };

  const onSubmitRelationship = (data: any) => {
    createRelationshipMutation.mutate(data);
  };

  if (!selectedCharacter && characters.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/writer/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Writer
            </Button>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold">Character Storyboard</h1>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Characters Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create characters in the Character Manager to use the storyboard feature.
            </p>
            <Button onClick={() => setLocation(`/writer/${projectId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Characters
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation(`/writer/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Writer
          </Button>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-semibold">Character Storyboard</h1>
            {project && (
              <Badge variant="outline">{project.title}</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="relationships">Relationships</SelectItem>
              <SelectItem value="storyboard">Visual Board</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Character Sidebar */}
        <div className="w-80 border-r dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Characters</h3>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-2">
                {characters.map((character) => (
                  <Card 
                    key={character.id}
                    className={`cursor-pointer transition-colors ${
                      selectedCharacter?.id === character.id 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{character.name}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {character.role}
                          </p>
                          {character.characterTheme && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {character.characterTheme}
                            </Badge>
                          )}
                        </div>
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {selectedCharacter && (
            <>
              {viewMode === "overview" && (
                <div className="h-full overflow-auto p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {selectedCharacter.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedCharacter.role} • Character Development Overview
                      </p>
                    </div>

                    <InteractiveCharacterProfile character={selectedCharacter} />

                    {/* Development Stats */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Development Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div 
                            className="text-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setViewMode("timeline")}
                          >
                            <div className="text-2xl font-bold text-blue-600">{timeline.length}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Timeline Entries</div>
                            <div className="text-xs text-blue-600 mt-1">Click to view timeline →</div>
                          </div>
                          <div 
                            className="text-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setViewMode("relationships")}
                          >
                            <div className="text-2xl font-bold text-green-600">
                              {relationships.filter(r => 
                                r.characterAId === selectedCharacter.id || 
                                r.characterBId === selectedCharacter.id
                              ).length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Relationships</div>
                            <div className="text-xs text-green-600 mt-1">Click to view relationships →</div>
                          </div>
                          <div 
                            className="text-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setViewMode("storyboard")}
                          >
                            <div className="text-2xl font-bold text-purple-600">
                              {selectedCharacter.keyScenes?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Key Scenes</div>
                            <div className="text-xs text-purple-600 mt-1">Click to view storyboard →</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {viewMode === "timeline" && (
                <div className="h-full overflow-auto p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          Development Timeline
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCharacter.name}'s character journey throughout the story
                        </p>
                      </div>
                      <Dialog open={isTimelineModalOpen} onOpenChange={setIsTimelineModalOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Timeline Entry
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {editingTimelineEntry ? "Edit" : "Add"} Timeline Entry
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={timelineForm.handleSubmit(onSubmitTimelineEntry)} className="space-y-4">
                            <div>
                              <Label htmlFor="eventType">Event Type</Label>
                              <Select
                                value={timelineForm.watch("eventType")}
                                onValueChange={(value) => timelineForm.setValue("eventType", value as any)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="introduction">Introduction</SelectItem>
                                  <SelectItem value="development">Development</SelectItem>
                                  <SelectItem value="conflict">Conflict</SelectItem>
                                  <SelectItem value="resolution">Resolution</SelectItem>
                                  <SelectItem value="transformation">Transformation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="title">Title</Label>
                              <Input
                                {...timelineForm.register("title")}
                                placeholder="Enter timeline entry title"
                              />
                            </div>
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                {...timelineForm.register("description")}
                                placeholder="Describe this development point"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="emotionalState">Emotional State</Label>
                              <Input
                                {...timelineForm.register("emotionalState")}
                                placeholder="Character's emotional state"
                              />
                            </div>
                            <div>
                              <Label htmlFor="visualNotes">Visual Notes</Label>
                              <Textarea
                                {...timelineForm.register("visualNotes")}
                                placeholder="Visual representation notes for storyboard"
                                rows={2}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsTimelineModalOpen(false);
                                  setEditingTimelineEntry(null);
                                  timelineForm.reset();
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit"
                                disabled={createTimelineEntryMutation.isPending || updateTimelineEntryMutation.isPending}
                              >
                                {editingTimelineEntry ? "Update" : "Create"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-4">
                      {timeline.length === 0 ? (
                        <Card 
                          className="cursor-pointer hover:border-blue-500 transition-colors"
                          onClick={() => setIsTimelineModalOpen(true)}
                        >
                          <CardContent className="p-8 text-center">
                            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              No Timeline Entries
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              Create timeline entries to track {selectedCharacter.name}'s development journey.
                            </p>
                            <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-3">
                              <Plus className="h-4 w-4" />
                              Click here to add your first timeline entry
                            </div>
                            <div className="text-xs text-gray-500 text-left bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 Timeline Tips:</div>
                              <ul className="space-y-1">
                                <li><strong>Introduction:</strong> Character's first appearance or key intro moment</li>
                                <li><strong>Development:</strong> Growth moments, skill building, relationship changes</li>
                                <li><strong>Conflict:</strong> Major challenges, obstacles, or confrontations</li>
                                <li><strong>Resolution:</strong> Problem solving, decision making, overcoming challenges</li>
                                <li><strong>Transformation:</strong> Character revelations, major changes, final growth</li>
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        timeline
                          .sort((a, b) => a.timelinePosition - b.timelinePosition)
                          .map((entry, index) => (
                            <Card key={entry.id} className="relative">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`p-2 rounded-full ${getEventTypeColor(entry.eventType)}`}>
                                      {getEventTypeIcon(entry.eventType)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                          {entry.title}
                                        </h4>
                                        <Badge variant="outline" className="text-xs">
                                          {entry.eventType}
                                        </Badge>
                                      </div>
                                      {entry.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                          {entry.description}
                                        </p>
                                      )}
                                      {entry.emotionalState && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <Heart className="h-3 w-3 text-pink-500" />
                                          <span className="text-xs text-gray-500">
                                            Emotional State: {entry.emotionalState}
                                          </span>
                                        </div>
                                      )}
                                      {entry.visualNotes && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs text-blue-700 dark:text-blue-300 mt-2">
                                          <strong>Visual Notes:</strong> {entry.visualNotes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingTimelineEntry(entry);
                                        setIsTimelineModalOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteTimelineEntryMutation.mutate(entry.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                              {index < timeline.length - 1 && (
                                <div className="absolute left-8 bottom-0 w-0.5 h-4 bg-gray-300 dark:bg-gray-600 transform translate-y-full" />
                              )}
                            </Card>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {viewMode === "relationships" && (
                <div className="h-full overflow-auto p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          Character Relationships
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCharacter.name}'s connections with other characters
                        </p>
                      </div>
                      <Dialog open={isRelationshipModalOpen} onOpenChange={setIsRelationshipModalOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Relationship
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Character Relationship</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={relationshipForm.handleSubmit(onSubmitRelationship)} className="space-y-4">
                            <div>
                              <Label htmlFor="characterAId">Character A</Label>
                              <Select
                                value={relationshipForm.watch("characterAId")}
                                onValueChange={(value) => relationshipForm.setValue("characterAId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select first character" />
                                </SelectTrigger>
                                <SelectContent>
                                  {characters.map((character) => (
                                    <SelectItem key={character.id} value={character.id}>
                                      {character.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="characterBId">Character B</Label>
                              <Select
                                value={relationshipForm.watch("characterBId")}
                                onValueChange={(value) => relationshipForm.setValue("characterBId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select second character" />
                                </SelectTrigger>
                                <SelectContent>
                                  {characters.map((character) => (
                                    <SelectItem key={character.id} value={character.id}>
                                      {character.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="relationshipType">Relationship Type</Label>
                              <Select
                                value={relationshipForm.watch("relationshipType")}
                                onValueChange={(value) => relationshipForm.setValue("relationshipType", value as any)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="family">Family</SelectItem>
                                  <SelectItem value="romantic">Romantic</SelectItem>
                                  <SelectItem value="friendship">Friendship</SelectItem>
                                  <SelectItem value="rivalry">Rivalry</SelectItem>
                                  <SelectItem value="mentor">Mentor</SelectItem>
                                  <SelectItem value="antagonist">Antagonist</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                {...relationshipForm.register("description")}
                                placeholder="Describe this relationship"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="currentStatus">Current Status</Label>
                              <Input
                                {...relationshipForm.register("currentStatus")}
                                placeholder="Current state of relationship"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRelationshipModalOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createRelationshipMutation.isPending}>
                                Create
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {relationships
                        .filter(r => r.characterAId === selectedCharacter.id || r.characterBId === selectedCharacter.id)
                        .map((relationship) => {
                          const otherCharacterId = relationship.characterAId === selectedCharacter.id 
                            ? relationship.characterBId 
                            : relationship.characterAId;
                          const otherCharacter = characters.find(c => c.id === otherCharacterId);
                          
                          return (
                            <Card key={relationship.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    {getRelationshipIcon(relationship.relationshipType)}
                                    <h4 className="font-medium">
                                      {otherCharacter?.name || "Unknown Character"}
                                    </h4>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {relationship.relationshipType}
                                  </Badge>
                                </div>
                                {relationship.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {relationship.description}
                                  </p>
                                )}
                                {relationship.currentStatus && (
                                  <div className="text-xs text-gray-500">
                                    Status: {relationship.currentStatus}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>

                    {relationships.filter(r => 
                      r.characterAId === selectedCharacter.id || r.characterBId === selectedCharacter.id
                    ).length === 0 && (
                      <Card 
                        className="cursor-pointer hover:border-green-500 transition-colors"
                        onClick={() => setIsRelationshipModalOpen(true)}
                      >
                        <CardContent className="p-8 text-center">
                          <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Relationships Defined
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Create relationships to map {selectedCharacter.name}'s connections with other characters.
                          </p>
                          <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                            <Plus className="h-4 w-4" />
                            Click here to add your first relationship
                          </div>
                          <div className="text-xs text-gray-500 text-left bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <div className="font-semibold text-green-800 dark:text-green-200 mb-2">💡 Relationship Tips:</div>
                            <ul className="space-y-1">
                              <li><strong>Family:</strong> Blood relations, adoptive family, found family bonds</li>
                              <li><strong>Romantic:</strong> Love interests, spouses, romantic tension</li>
                              <li><strong>Friendship:</strong> Allies, companions, trusted confidants</li>
                              <li><strong>Rivalry:</strong> Competitors, professional rivals, personal conflicts</li>
                              <li><strong>Mentor:</strong> Teachers, guides, wisdom givers or seekers</li>
                              <li><strong>Antagonist:</strong> Enemies, opposers, sources of conflict</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {viewMode === "storyboard" && (
                <div className="h-full overflow-auto p-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Visual Storyboard
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedCharacter.name}'s visual character development journey
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {timeline
                        .sort((a, b) => a.timelinePosition - b.timelinePosition)
                        .map((entry) => (
                          <Card key={entry.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge className={getEventTypeColor(entry.eventType)}>
                                  {entry.eventType}
                                </Badge>
                                <div className="text-xs text-gray-500">
                                  #{entry.timelinePosition}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <h4 className="font-medium text-sm mb-2">{entry.title}</h4>
                              {entry.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                  {entry.description}
                                </p>
                              )}
                              
                              {/* Visual placeholder - this could be enhanced with actual image generation */}
                              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32 flex items-center justify-center mb-3">
                                <div className="text-center">
                                  <Eye className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                  <div className="text-xs text-gray-500">Visual Scene</div>
                                </div>
                              </div>
                              
                              {entry.visualNotes && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
                                  <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    Storyboard Notes:
                                  </div>
                                  <div className="text-blue-700 dark:text-blue-300">
                                    {entry.visualNotes}
                                  </div>
                                </div>
                              )}
                              
                              {entry.emotionalState && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Heart className="h-3 w-3 text-pink-500" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {entry.emotionalState}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    {timeline.length === 0 && (
                      <Card 
                        className="cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => setViewMode("timeline")}
                      >
                        <CardContent className="p-8 text-center">
                          <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Storyboard Entries
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Create timeline entries with visual notes to build your character storyboard.
                          </p>
                          <div className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-3">
                            <Clock className="h-4 w-4" />
                            Click here to go to Timeline and add entries
                          </div>
                          <div className="text-xs text-gray-500 text-left bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                            <div className="font-semibold text-purple-800 dark:text-purple-200 mb-2">💡 Visual Storyboard Tips:</div>
                            <ul className="space-y-1">
                              <li>Add <strong>Visual Notes</strong> to timeline entries to describe key scenes</li>
                              <li>Include <strong>Emotional States</strong> to track character feelings</li>
                              <li>Describe settings, costumes, expressions, and visual symbols</li>
                              <li>Think cinematically - what would the audience see?</li>
                              <li>Use this for planning illustrations, covers, or adaptations</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}