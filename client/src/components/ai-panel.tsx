import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import FeatureGate from "@/components/feature-gate";
import { type Project, type Chapter, type AISuggestion, type Character, type AIChatMessage } from "@shared/schema";
import { X, Lightbulb, Send, UserPlus, MessageCircle, Sparkles, User, Bot, ArrowRight, Trash2 } from "lucide-react";

interface AIPanelProps {
  project: Project;
  currentChapter?: Chapter;
  onClose: () => void;
}

export default function AIPanel({ project, currentChapter, onClose }: AIPanelProps) {
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const featureAccess = useFeatureAccess();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: suggestions = [] } = useQuery<AISuggestion[]>({
    queryKey: ["/api/projects", project.id, "ai-suggestions"],
    refetchInterval: false,
  });

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/projects", project.id, "characters"],
  });

  const { data: chatMessages = [] } = useQuery<AIChatMessage[]>({
    queryKey: ["/api/projects", project.id, "chat-messages"],
    refetchInterval: false,
  });

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-suggestions", {
        projectTitle: project.title,
        chapterTitle: currentChapter?.title || "",
        currentContent: currentChapter?.content || "",
        characters: characters.map(c => c.name),
        projectId: project.id,
        chapterId: currentChapter?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "ai-suggestions"]
      });
      toast({
        title: "Suggestions generated",
        description: "New AI suggestions have been created for your writing.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateStoryProgressionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/story-progression", {
        projectId: project.id,
        chapterId: currentChapter?.id,
        projectTitle: project.title,
        chapterTitle: currentChapter?.title || "",
        currentContent: currentChapter?.content || "",
        characters: characters.map(c => ({ 
          name: c.name, 
          role: c.role, 
          traits: c.traits 
        })),
        setting: project.description || "",
        timeEra: "early 1970s London/Kilburn"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "ai-suggestions"]
      });
      toast({
        title: "Story progression ideas generated",
        description: "New creative suggestions for your story's next steps have been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate story progression ideas. Please try again.",
        variant: "destructive",
      });
    },
  });

  const queryAIMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/query", {
        query,
        context: {
          projectId: project.id,
          chapterId: currentChapter?.id,
          projectTitle: project.title,
          chapterTitle: currentChapter?.title,
          characters: characters.map(c => ({ name: c.name, role: c.role }))
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setQuery("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "chat-messages"]
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/projects/${project.id}/chat-messages`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "chat-messages"]
      });
      toast({
        title: "Chat Cleared",
        description: "Chat history has been cleared successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiRequest("PATCH", `/api/ai-suggestions/${suggestionId}`, {
        applied: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "ai-suggestions"]
      });
      toast({
        title: "Suggestion applied",
        description: "The AI suggestion has been marked as applied.",
      });
    },
  });

  const dismissSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiRequest("PATCH", `/api/ai-suggestions/${suggestionId}`, {
        applied: -1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", project.id, "ai-suggestions"]
      });
    },
  });

  const pendingSuggestions = suggestions.filter(s => s.applied === 0);
  const appliedSuggestions = suggestions.filter(s => s.applied === 1);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'plot':
        return <Lightbulb className="w-4 h-4" />;
      case 'character':
        return <UserPlus className="w-4 h-4" />;
      case 'description':
        return <Sparkles className="w-4 h-4" />;
      case 'progression':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'plot':
        return "text-green-700 bg-green-100";
      case 'character':
        return "text-blue-700 bg-blue-100";
      case 'description':
        return "text-purple-700 bg-purple-100";
      case 'progression':
        return "text-orange-700 bg-orange-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  return (
    <TooltipProvider>
    <div className="w-80 bg-white border-l border-neutral-100 flex flex-col">
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🤖</span>
            </div>
            <h2 className="font-semibold text-neutral-800">AI Assistant</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue={featureAccess.aiChat ? "chat" : "ideas"} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
              <p>AI Writing Ideas - Generate intelligent plot, character, and description suggestions based on your current chapter content.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="progression">Story</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
              <p>Story Progression - Get creative suggestions for where your story could go next, incorporating your characters and setting.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={!featureAccess.aiChat ? "cursor-not-allowed" : ""}>
                <TabsTrigger value="tips" disabled={!featureAccess.aiChat}>
                  Tips {!featureAccess.aiChat && "🔒"}
                </TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
              <p>{!featureAccess.aiChat ? "Applied Suggestions - View your previously accepted AI writing suggestions. Available with Basic and Pro plans." : "Applied Suggestions"}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={!featureAccess.aiChat ? "cursor-not-allowed" : ""}>
                <TabsTrigger value="chat" disabled={!featureAccess.aiChat}>
                  Chat {!featureAccess.aiChat && "🔒"}
                </TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4 rounded-lg border-2 border-neutral-200 bg-white shadow-lg text-sm">
              <p>{!featureAccess.aiChat ? "AI Chat - Have conversations with your AI writing assistant about plot development, character motivation, and writing techniques. Available with Basic and Pro plans." : "AI Chat"}</p>
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="ideas" className="flex-1 p-4 mt-0">
          <ScrollArea className="h-full max-h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => generateSuggestionsMutation.mutate()}
                    disabled={generateSuggestionsMutation.isPending}
                    className="w-full justify-start bg-green-100 text-green-800 hover:bg-green-200"
                    variant="outline"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {generateSuggestionsMutation.isPending ? "Generating..." : "Generate ideas"}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3">Context-Aware Suggestions</h3>
                
                {pendingSuggestions.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-neutral-500">
                      <Lightbulb className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-sm">No suggestions yet</p>
                      <p className="text-xs">Generate ideas to get started</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pendingSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getSuggestionIcon(suggestion.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-medium text-neutral-800">
                                  {suggestion.title}
                                </h4>
                                <Badge variant="secondary" className={getSuggestionColor(suggestion.type)}>
                                  {suggestion.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                                {suggestion.content}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => applySuggestionMutation.mutate(suggestion.id)}
                                  disabled={applySuggestionMutation.isPending}
                                >
                                  Apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => dismissSuggestionMutation.mutate(suggestion.id)}
                                  disabled={dismissSuggestionMutation.isPending}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="progression" className="flex-1 p-4 mt-0">
          <div className="h-full max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3">Story Progression</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => generateStoryProgressionMutation.mutate()}
                    disabled={generateStoryProgressionMutation.isPending}
                    className="w-full justify-start bg-orange-100 text-orange-800 hover:bg-orange-200"
                    variant="outline"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {generateStoryProgressionMutation.isPending ? "Generating..." : "Generate story ideas"}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Get creative suggestions for where your story could go next, incorporating your characters, setting, and historical context.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-3">Story Progression Ideas</h3>
                
                {pendingSuggestions.filter(s => s.type === 'progression').length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-neutral-500">
                      <ArrowRight className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-sm">No story progression ideas yet</p>
                      <p className="text-xs">Generate ideas to see creative suggestions</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pendingSuggestions.filter(s => s.type === 'progression').map((suggestion) => (
                      <Card key={suggestion.id} className="bg-orange-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <ArrowRight className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-medium text-neutral-800">
                                  {suggestion.title}
                                </h4>
                                <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                                  progression
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                                {suggestion.content}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => applySuggestionMutation.mutate(suggestion.id)}
                                  disabled={applySuggestionMutation.isPending}
                                >
                                  Apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => dismissSuggestionMutation.mutate(suggestion.id)}
                                  disabled={dismissSuggestionMutation.isPending}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tips" className="flex-1 p-4 mt-0">
          <FeatureGate feature="aiChat">
          <ScrollArea className="h-full max-h-[calc(100vh-12rem)]">
            <div>
              <h3 className="text-sm font-medium text-neutral-600 mb-3">Applied Suggestions</h3>
              {appliedSuggestions.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-neutral-500">
                    <p className="text-sm">No applied suggestions yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {appliedSuggestions.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-neutral-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-medium text-neutral-800">
                                {suggestion.title}
                              </h4>
                              <Badge variant="secondary" className={getSuggestionColor(suggestion.type)}>
                                {suggestion.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                              {suggestion.content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
          </FeatureGate>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          <FeatureGate feature="aiChat">
          <div className="p-4 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-neutral-600">Chat History</h3>
                <p className="text-xs text-neutral-500">{currentChapter ? `Chapter: ${currentChapter.title}` : `Project: ${project.title}`}</p>
              </div>
              {chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all chat history? This action cannot be undone.")) {
                      clearChatMutation.mutate();
                    }
                  }}
                  disabled={clearChatMutation.isPending}
                  className="h-8 px-2"
                  data-testid="button-clear-chat"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {clearChatMutation.isPending ? "Clearing..." : "Clear"}
                </Button>
              )}
            </div>
          </div>
          
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4" 
            style={{ 
              maxHeight: '400px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#9ca3af #f3f4f6'
            }}
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                <p className="text-sm">No chat history yet</p>
                <p className="text-xs">Start a conversation below</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-neutral-100 text-neutral-800'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-neutral-500'
                    }`}>
                      {new Date(message.createdAt!).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-neutral-100">
            <div className="border border-neutral-200 rounded-lg">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about plot development, character motivation, or writing techniques..."
                className="border-0 resize-none focus-visible:ring-0 rounded-t-lg"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (query.trim() && !queryAIMutation.isPending) {
                      queryAIMutation.mutate();
                    }
                  }
                }}
              />
              <div className="flex justify-between items-center p-2 border-t border-neutral-200 bg-neutral-50">
                <div className="text-xs text-neutral-400">
                  {query.length}/500 • Press Enter to send
                </div>
                <Button
                  size="sm"
                  onClick={() => queryAIMutation.mutate()}
                  disabled={queryAIMutation.isPending || !query.trim()}
                >
                  <Send className="w-3 h-3 mr-1" />
                  {queryAIMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}