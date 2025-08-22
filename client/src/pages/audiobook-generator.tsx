import { useState, useEffect, memo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Volume2, Play, Download, Loader2, BookOpen, FileAudio, DollarSign, Headphones, ArrowLeft, Crown, AlertTriangle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { type Project, type Chapter, type Audiobook } from "@shared/schema";

interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  description: string;
  gender: string;
  sampleText: string;
  quality: 'standard' | 'hd';
  pricing: 'basic' | 'premium';
}

interface AudiobookOptions {
  voice: string;
  speed: number;
  quality: 'standard' | 'hd';
  scope: 'chapter' | 'fullbook';
  selectedChapter?: string;
  selectedChapterId?: string;
}

const AudiobookGenerator = memo(function AudiobookGenerator() {
  const params = useParams();
  const projectId = params.id;
  const [options, setOptions] = useState<AudiobookOptions>({
    voice: 'alloy', // Default to OpenAI Alloy voice
    speed: 1.0,
    quality: 'standard',
    scope: 'chapter'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<{ chapters: number, cost: number, characters: number }>({ chapters: 0, cost: 0, characters: 0 });
  const [shouldPoll, setShouldPoll] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [audiobookToDelete, setAudiobookToDelete] = useState<Audiobook | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes caching
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Fetch available OpenAI TTS voices
  const { data: availableVoices = [] } = useQuery<VoiceOption[]>({
    queryKey: ['/api/tts/voices'],
    staleTime: 30 * 60 * 1000,  // 30 minutes caching (voices don't change often)
    gcTime: 60 * 60 * 1000,     // 1 hour
  });

  // Use optimized metadata endpoint - only loads titles, word counts, not full content
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ['/api/projects', projectId, 'chapters', 'metadata'],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes caching for metadata
    gcTime: 15 * 60 * 1000,    // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: audiobooks = [], refetch: refetchAudiobooks } = useQuery<Audiobook[]>({
    queryKey: ['/api/projects', projectId, 'audiobooks'],
    enabled: !!projectId,
    staleTime: 0,  // Always check for latest status
    gcTime: 5 * 60 * 1000,     // 5 minutes
    refetchInterval: shouldPoll ? 3000 : false,
    refetchOnWindowFocus: true, // Check when user comes back to tab
  });

  // Check subscription status with aggressive caching to prevent page lag
  const { data: usageSummary } = useQuery({
    queryKey: ['/api/subscription/usage-summary'],
    staleTime: 5 * 60 * 1000,  // 5 minutes - very aggressive caching
    gcTime: 15 * 60 * 1000,    // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,     // Don't refetch on mount
    enabled: !!projectId,      // Only when project is available
  });

  const checkUsageMutation = useMutation({
    mutationFn: async ({ serviceType, characterCount }: { serviceType: string, characterCount: number }) => {
      const response = await apiRequest("POST", "/api/subscription/check-usage", { serviceType, characterCount });
      return response.json();
    }
  });

  // Control polling based on audiobook status
  useEffect(() => {
    if (!audiobooks.length) {
      setShouldPoll(false);
      return;
    }

    // Check if any audiobook is generating
    const hasGenerating = audiobooks.some(audiobook => audiobook.status === 'generating');
    setShouldPoll(hasGenerating);

    // Check for newly completed audiobooks
    const completedAudiobooks = audiobooks.filter(book => 
      book.status === 'completed' && 
      book.createdAt && 
      new Date(book.createdAt).getTime() > Date.now() - 30000 // Within last 30 seconds
    );

    completedAudiobooks.forEach(audiobook => {
      toast({
        title: "Audiobook Ready! 🎧",
        description: `"${audiobook.title}" has been generated and is ready to download.`,
        duration: 8000, // Show longer so user notices
      });
    });

    // Check for failed audiobooks
    const failedAudiobooks = audiobooks.filter(book => 
      book.status === 'failed' && 
      book.createdAt && 
      new Date(book.createdAt).getTime() > Date.now() - 30000 // Within last 30 seconds
    );

    failedAudiobooks.forEach(audiobook => {
      toast({
        title: "Generation Failed",
        description: audiobook.error || "Audiobook generation failed. Please try again.",
        variant: "destructive",
        duration: 8000,
      });
    });
  }, [audiobooks, toast]);

  // Calculate estimated cost with debouncing to prevent performance issues
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!chapters.length || !availableVoices.length) {
        setEstimatedCost({ chapters: 0, cost: 0, characters: 0 });
        return;
      }
      
      let totalCharacters = 0;
      let chapterCount = 0;

      if (options.scope === 'chapter' && options.selectedChapter) {
        const chapter = chapters.find(c => c.id === options.selectedChapter);
        if (chapter) {
          // Estimate characters from word count (avg 5 chars per word + spaces)
          totalCharacters = (chapter.wordCount || 0) * 6;
          chapterCount = 1;
        }
      } else if (options.scope === 'fullbook') {
        // Estimate characters from word count for all chapters
        totalCharacters = chapters.reduce((sum, chapter) => sum + ((chapter.wordCount || 0) * 6), 0);
        chapterCount = chapters.length;
      }

      // Find selected voice for pricing
      const selectedVoice = availableVoices.find(voice => voice.id === options.voice);
      if (!selectedVoice) {
        setEstimatedCost({ chapters: 0, cost: 0, characters: 0 });
        return;
      }

      // Google TTS pricing: Standard = $4/1M chars, Premium (WaveNet/Neural2/Studio) = $16/1M chars
      const pricePerMillion = selectedVoice.quality === 'standard' ? 4 : 16;
      const cost = (totalCharacters / 1000000) * pricePerMillion;
      
      setEstimatedCost({
        chapters: chapterCount,
        cost: cost,
        characters: totalCharacters
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [chapters, options.scope, options.selectedChapter, options.voice, availableVoices]);

  const generateAudiobookMutation = useMutation({
    mutationFn: async (generationOptions: AudiobookOptions & { title: string }) => {
      // Check subscription limits before proceeding
      const usageCheck = await checkUsageMutation.mutateAsync({
        serviceType: 'audiobook',
        characterCount: estimatedCost.characters
      });

      if (!usageCheck.canProceed) {
        throw new Error(usageCheck.reason || "Usage limit exceeded. Please upgrade to Premium for audiobook generation.");
      }

      const response = await apiRequest('POST', `/api/projects/${projectId}/audiobooks`, generationOptions);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Generation Started",
        description: "Your audiobook generation has begun. You'll be notified when complete."
      });
      setIsGenerating(false);
      setProgress(0);
      setCurrentChapter('');
      // Start polling for updates
      refetchAudiobooks();
    },
    onError: (error: any) => {
      console.error('Audiobook generation error:', error);
      toast({
        title: "Generation Failed", 
        description: error.message || "Failed to start audiobook generation.",
        variant: "destructive"
      });
      setIsGenerating(false);
      setProgress(0);
      setCurrentChapter('');
    }
  });

  const handleGenerate = async () => {
    if (!project || !chapters.length) return;
    
    if (options.scope === 'chapter' && !options.selectedChapter) {
      toast({
        title: "Selection Required",
        description: "Please select a chapter to generate.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const title = options.scope === 'chapter' 
      ? `${project.title} - ${chapters.find(c => c.id === options.selectedChapter)?.title || 'Chapter'}`
      : project.title;

    generateAudiobookMutation.mutate({
      ...options,
      selectedChapterId: options.selectedChapter, // Map selectedChapter to selectedChapterId
      title
    });
  };

  const handleVoicePreview = async (voiceId: string) => {
    try {
      const voice = availableVoices.find(v => v.id === voiceId);
      if (!voice) return;

      const response = await apiRequest('POST', '/api/tts/preview', {
        text: voice.sampleText,
        voice: voiceId,
        quality: voice.quality, // Use voice's quality level
        speed: options.speed
      });

      const result = await response.json();
      
      if (result.audioUrl) {
        // Create audio element and handle errors
        const audio = new Audio();
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          toast({
            title: "Preview Failed",
            description: "Could not play voice preview. Audio format may not be supported.",
            variant: "destructive"
          });
        });
        
        audio.addEventListener('canplaythrough', () => {
          audio.play().catch(error => {
            console.error('Audio play error:', error);
            toast({
              title: "Preview Failed", 
              description: "Could not play voice preview.",
              variant: "destructive"
            });
          });
        });
        
        audio.src = result.audioUrl;
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      toast({
        title: "Preview Failed",
        description: "Could not play voice preview.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (audiobook: Audiobook) => {
    try {
      const response = await fetch(`/api/audiobooks/${audiobook.id}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${(audiobook.title || 'audiobook').replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your audiobook download has begun."
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your audiobook.",
        variant: "destructive"
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/audiobooks/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'audiobooks'] });
      toast({
        title: "Audiobook Deleted",
        description: "Audiobook has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete audiobook",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (audiobook: Audiobook) => {
    setAudiobookToDelete(audiobook);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (audiobookToDelete) {
      deleteMutation.mutate(audiobookToDelete.id);
      setDeleteDialogOpen(false);
      setAudiobookToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setAudiobookToDelete(null);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'generating': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading project...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 mb-4" 
          data-testid="button-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          <Volume2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Audiobook Generator</h1>
            <p className="text-muted-foreground">Convert your chapters into high-quality audiobooks</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Generation Options
            </CardTitle>
            <CardDescription>
              Configure your audiobook settings and preview voices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scope Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Generation Scope</Label>
              <RadioGroup
                value={options.scope}
                onValueChange={(value: 'chapter' | 'fullbook') => 
                  setOptions(prev => ({ ...prev, scope: value, selectedChapter: value === 'fullbook' ? undefined : prev.selectedChapter }))
                }
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="chapter" id="chapter" />
                  <Label htmlFor="chapter" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Single Chapter
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="fullbook" id="fullbook" />
                  <Label htmlFor="fullbook" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Full Book
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Chapter Selection */}
            {options.scope === 'chapter' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Chapter</Label>
                <Select 
                  value={options.selectedChapter || ''} 
                  onValueChange={(value) => setOptions(prev => ({ ...prev, selectedChapter: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Group chapters by section */}
                    {(() => {
                      const frontMatter = chapters.filter(c => c.section === 'front_matter').sort((a, b) => a.order - b.order);
                      const bodyChapters = chapters.filter(c => c.section === 'body').sort((a, b) => a.order - b.order);
                      const backMatter = chapters.filter(c => c.section === 'back_matter').sort((a, b) => a.order - b.order);
                      
                      return (
                        <>
                          {/* Front Matter Section */}
                          {frontMatter.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-sm mx-1 my-1">
                                📄 FRONT PAGES
                              </div>
                              {frontMatter.map((chapter) => (
                                <SelectItem key={chapter.id} value={chapter.id}>
                                  {chapter.chapterType === 'copyright' ? 'Copyright Page' :
                                   chapter.chapterType === 'dedication' ? 'Dedication' :
                                   chapter.chapterType === 'epigraph' ? 'Epigraph' :
                                   chapter.chapterType === 'preface' ? 'Preface' :
                                   chapter.chapterType === 'table_of_contents' ? 'Table of Contents' :
                                   chapter.title}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Body Chapters Section */}
                          {bodyChapters.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-sm mx-1 my-1">
                                📖 CHAPTERS
                              </div>
                              {bodyChapters.map((chapter, index) => (
                                <SelectItem key={chapter.id} value={chapter.id}>
                                  Chapter {index + 1}: {chapter.title}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Back Matter Section */}
                          {backMatter.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-sm mx-1 my-1">
                                📚 BACK PAGES
                              </div>
                              {backMatter.map((chapter) => (
                                <SelectItem key={chapter.id} value={chapter.id}>
                                  {chapter.chapterType === 'about_author' ? 'About the Author' :
                                   chapter.chapterType === 'appendix' ? 'Appendix' :
                                   chapter.chapterType === 'bibliography' ? 'Bibliography' :
                                   chapter.title}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Voice Selection with Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Voice Selection</Label>
              <Select 
                value={options.voice} 
                onValueChange={(value) => {
                  setOptions(prev => {
                    const selectedVoice = availableVoices.find(v => v.id === value);
                    return {
                      ...prev, 
                      voice: value,
                      quality: selectedVoice?.quality || 'standard'
                    };
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{voice.name} ({voice.accent})</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                          <span>{voice.description}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            voice.pricing === 'basic' ? 'bg-green-100 text-green-800' :
                            voice.pricing === 'premium' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {voice.pricing === 'basic' ? '$9/mo' : 
                             voice.pricing === 'premium' ? '$19/mo' : '$39/mo'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Voice Preview Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVoicePreview(options.voice)}
                className="w-full"
                disabled={!availableVoices.length}
              >
                <Headphones className="h-4 w-4 mr-2" />
                Preview {availableVoices.find(v => v.id === options.voice)?.name} Voice
              </Button>
            </div>

            {/* Audio Quality */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Audio Quality</Label>
              <Select 
                value={options.quality} 
                onValueChange={(value: 'standard' | 'hd') => setOptions(prev => ({ ...prev, quality: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <div className="flex items-center justify-between w-full">
                      <span>Standard (TTS-1)</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">$15/1M chars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hd">
                    <div className="flex items-center justify-between w-full">
                      <span>HD (TTS-1-HD)</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">$30/1M chars</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Speech Speed */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Speech Speed</Label>
              <Select 
                value={options.speed.toString()} 
                onValueChange={(value) => setOptions(prev => ({ ...prev, speed: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.75">0.75x (Slower)</SelectItem>
                  <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                  <SelectItem value="1.25">1.25x (Faster)</SelectItem>
                  <SelectItem value="1.5">1.5x (Much Faster)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cost Estimation & Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Estimation
            </CardTitle>
            <CardDescription>
              Estimated processing cost and generation controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Chapters:</span>
                  <div className="font-semibold">{estimatedCost.chapters}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Characters:</span>
                  <div className="font-semibold">{estimatedCost.characters.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated Cost:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${estimatedCost.cost.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI TTS: $15/1M (Standard) or $30/1M (HD) chars
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || estimatedCost.characters === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Generate Audiobook
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  {currentChapter && (
                    <p className="text-sm text-muted-foreground text-center">
                      Processing: {currentChapter}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Generation can take several minutes depending on content length. 
                You'll receive a notification when complete.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Audiobooks */}
      {audiobooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Generated Audiobooks
            </CardTitle>
            <CardDescription>
              Download and manage your completed audiobooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audiobooks.map((audiobook: Audiobook) => (
                  <TableRow key={audiobook.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={audiobook.title || 'Untitled'}>
                      {audiobook.title || 'Untitled'}
                    </TableCell>
                    <TableCell>
                      {audiobook.scope === 'chapter' ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {chapters.find(ch => ch.id === audiobook.selectedChapterId)?.title || 'Single Chapter'}
                          </span>
                          <span className="text-xs text-muted-foreground">Chapter</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Full Book</span>
                          <span className="text-xs text-muted-foreground">
                            {audiobook.totalChapters || chapters.length} chapters
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{audiobook.voice}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {audiobook.quality === 'hd' ? 'HD' : 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(audiobook.status || 'pending')}>
                        {audiobook.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {audiobook.duration ? formatDuration(audiobook.duration) : '-'}
                    </TableCell>
                    <TableCell>
                      {audiobook.fileSize ? formatFileSize(audiobook.fileSize) : '-'}
                    </TableCell>
                    <TableCell>
                      {audiobook.createdAt ? new Date(audiobook.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {audiobook.status === 'completed' && audiobook.filePath ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(audiobook)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(audiobook)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1 text-muted-foreground hover:text-red-600"
                              title="Delete audiobook"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : audiobook.status === 'generating' ? (
                          <>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              {audiobook.completedChapters}/{audiobook.totalChapters}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(audiobook)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1 text-muted-foreground hover:text-red-600"
                              title="Cancel and delete audiobook"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : audiobook.status === 'failed' ? (
                          <>
                            <span className="text-sm text-red-600">
                              {audiobook.error || 'Generation failed'}
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(audiobook)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1"
                              title="Delete failed audiobook"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground">Pending</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(audiobook)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1 text-muted-foreground hover:text-red-600"
                              title="Delete pending audiobook"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{audiobookToDelete?.title || 'Untitled'}"</strong>?
              </p>
              {audiobookToDelete?.status === 'generating' && (
                <p className="text-orange-600 font-medium">
                  ⚠️ This will cancel the ongoing generation and delete the audiobook.
                </p>
              )}
              {audiobookToDelete?.status === 'completed' && (
                <p className="text-red-600 font-medium">
                  ⚠️ This will permanently delete the completed audiobook file.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Audiobook
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default AudiobookGenerator;