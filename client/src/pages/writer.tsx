import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import EnhancedChapterNav from "@/components/enhanced-chapter-nav";

import AIPanel from "@/components/ai-panel";
import WritingTools from "@/components/writing-tools";
import HistoricalResearchModal from "@/components/historical-research-modal";
import CharacterModal from "@/components/character-modal";
import ExportDialog from "@/components/export-dialog";
import FeatureGate from "@/components/feature-gate";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { type Project, type Chapter } from "@shared/schema";
import { ArrowLeft, ArrowRight, Download, Eye, Circle, BookOpen, Scroll } from "lucide-react";
import { Link } from "wouter";

export default function Writer() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId?: string }>();
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
  const [isWritingToolsOpen, setIsWritingToolsOpen] = useState(false);
  const [isHistoricalResearchModalOpen, setIsHistoricalResearchModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const featureAccess = useFeatureAccess();
  const { toast } = useToast();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapterId || null);

  // Validation function for Start Writing button
  const handleStartWriting = (chapterId: string | null) => {
    if (!chapterId) {
      if (chapters.length === 0) {
        toast({
          title: "No chapters found",
          description: "Please create a chapter first using the 'Add' button in the manuscript sidebar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "No chapter selected",
          description: "Please select a chapter from the manuscript sidebar before starting to write.",
          variant: "destructive",
        });
      }
      return;
    }
    
    // If validation passes, open the text editor
    window.open(`/text-editor/${chapterId}`, '_blank');
  };

  const { data: project, isLoading: isProjectLoading, error: projectError } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Debug logging - remove in production

  // Use metadata endpoint - only need titles and basic info for navigation
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/projects", projectId, "chapters", "metadata"],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes aggressive caching
    gcTime: 15 * 60 * 1000,    // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: currentChapter } = useQuery<Chapter>({
    queryKey: ["/api/chapters", selectedChapterId],
    enabled: !!selectedChapterId,
  });

  // Set first chapter as default if none selected
  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  const openHistoricalResearch = () => {
    setIsHistoricalResearchModalOpen(true);
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const stripHtmlTags = (html: string): string => {
    // Create a temporary div element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get the text content and clean up extra whitespace
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent.replace(/\s+/g, ' ').trim();
  };



  if (isProjectLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading project: {projectError.message}</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">Project not found</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar */}
      <Sidebar
        currentProject={project}
        onOpenCharacterModal={() => setIsCharacterModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-neutral-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" disabled>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-6 w-px bg-neutral-200"></div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-neutral-800">{project.title}</h1>
                {currentChapter && (
                  <>
                    <span className="text-neutral-400">›</span>
                    <span className="text-neutral-600">{currentChapter.title}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Circle className="w-2 h-2 fill-current text-green-500" />
                <span>Saved</span>
              </div>

              {/* Word Count */}
              <div className="text-sm text-neutral-400">
                <span>{currentChapter?.wordCount || 0}</span> words
              </div>

              {/* AI Assistant Toggle */}
              <Button
                variant={isAIPanelOpen ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsAIPanelOpen(!isAIPanelOpen);
                  if (!isAIPanelOpen) {
                    setIsWritingToolsOpen(false);
                  }
                }}
                className={isAIPanelOpen ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <span className="mr-2">🤖</span>
                AI Assistant
              </Button>

              {/* Writing Tools Toggle */}
              <Button
                variant={isWritingToolsOpen ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsWritingToolsOpen(!isWritingToolsOpen);
                  if (!isWritingToolsOpen) {
                    setIsAIPanelOpen(false);
                  }
                }}
                className={isWritingToolsOpen ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Writing Tools
              </Button>

              {/* Historical Research Toggle */}
              <FeatureGate 
                feature="historicalResearch" 
                fallback={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-neutral-400 border-neutral-200"
                        >
                          <Scroll className="w-4 h-4 mr-2" />
                          Historical Research 🔒
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Historical Research - Get period-specific context about daily life, politics, technology, culture, and geography for authentic historical storytelling. Available with Basic and Pro plans.</p>
                    </TooltipContent>
                  </Tooltip>
                }
                showUpgradePrompt={false}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openHistoricalResearch}
                >
                  <Scroll className="w-4 h-4 mr-2" />
                  Historical Research
                </Button>
              </FeatureGate>

              {/* Export Menu */}
              <ExportDialog project={project}>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </ExportDialog>
            </div>
          </div>
        </header>

        {/* Writing Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chapter Navigation */}
          <EnhancedChapterNav
            projectId={projectId!}
            chapters={chapters}
            selectedChapterId={selectedChapterId}
            onSelectChapter={setSelectedChapterId}
          />

          {/* Editor Area - conditional rendering based on chapter type */}
          {currentChapter?.chapterType === 'copyright' ? null : (
            <div className="flex-1 flex flex-col bg-white">
              {currentChapter ? (
                <div className="flex-1 flex flex-col">
                  {/* Chapter Preview */}
                  <div className="border-b border-neutral-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-800 mb-2">{currentChapter.title}</h2>
                        <p className="text-neutral-600">
                          {getWordCount(stripHtmlTags(currentChapter.content || ""))} words • 
                          {Math.ceil(getWordCount(stripHtmlTags(currentChapter.content || "")) / 200)} min read
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleStartWriting(currentChapter?.id || null)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          data-testid="start-writing-button"
                        >
                          <Circle className="w-4 h-4 mr-2" />
                          Start Writing (opens in new tab)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Chapter Content Preview */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                      {currentChapter.content ? (
                        <div className="prose prose-lg max-w-none">
                          <div className="text-neutral-700 leading-7">
                            {(() => {
                              const cleanText = stripHtmlTags(currentChapter.content || '');
                              const preview = cleanText.substring(0, 500);
                              return (
                                <>
                                  {preview}
                                  {cleanText.length > 500 && (
                                    <span className="text-neutral-400">... (click "Start Writing" to continue)</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-neutral-500 py-12">
                          <BookOpen className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                          <h3 className="text-xl font-medium mb-2">Empty Chapter</h3>
                          <p>Click "Start Writing" to begin your story.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    {chapters.length === 0 ? (
                      <>
                        <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-800 mb-2">No chapters yet</h3>
                        <p className="text-neutral-600 mb-4">Create your first chapter to start writing your story.</p>
                        <p className="text-sm text-neutral-500">Click the "Add" button in the manuscript sidebar to create a chapter.</p>
                      </>
                    ) : (
                      <>
                        <Eye className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-800 mb-2">No chapter selected</h3>
                        <p className="text-neutral-600 mb-4">Select a chapter from the sidebar to start writing.</p>
                        <p className="text-sm text-neutral-500">Choose any chapter from the manuscript sidebar to begin editing.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Assistant Panel */}
          {isAIPanelOpen && (
            <AIPanel
              project={project}
              currentChapter={currentChapter}
              onClose={() => setIsAIPanelOpen(false)}
            />
          )}

          {/* Writing Tools Panel */}
          {isWritingToolsOpen && (
            <WritingTools
              onClose={() => setIsWritingToolsOpen(false)}
            />
          )}

          {/* Historical Research Modal */}
          <HistoricalResearchModal
            isOpen={isHistoricalResearchModalOpen}
            onClose={() => setIsHistoricalResearchModalOpen(false)}
            projectId={project.id}
            projectTitle={project.title}
            timeEra={project.timePeriod || "Modern"}
            setting={project.setting || "Generic"}
          />
        </div>
      </main>

      {/* Character Management Modal */}
      <CharacterModal
        projectId={projectId!}
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
      />


    </div>
  );
}
