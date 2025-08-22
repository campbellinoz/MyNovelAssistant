import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { type HistoricalResearchMessage } from "@shared/schema";
import { Send, BookOpen, Clock, MapPin, Users, Scroll, X } from "lucide-react";

interface HistoricalResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  timeEra?: string;
  setting?: string;
}

const HISTORICAL_TOPICS = [
  { id: "daily-life", label: "Daily Life", icon: Users, description: "Clothing, food, customs, social norms" },
  { id: "politics", label: "Politics", icon: Scroll, description: "Government, policies, political events" },
  { id: "technology", label: "Technology", icon: Clock, description: "Inventions, transportation, communication" },
  { id: "culture", label: "Culture", icon: BookOpen, description: "Art, music, literature, entertainment" },
  { id: "geography", label: "Geography", icon: MapPin, description: "Places, buildings, neighborhoods" },
];

export default function HistoricalResearchModal({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTitle, 
  timeEra, 
  setting 
}: HistoricalResearchModalProps) {
  const [researchQuery, setResearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: researchHistory = [], isLoading } = useQuery<HistoricalResearchMessage[]>({
    queryKey: ["/api/projects", projectId, "research-history"],
    enabled: isOpen,
  });

  const researchMutation = useMutation({
    mutationFn: async ({ query, topic }: { query: string; topic?: string }) => {
      const response = await apiRequest("POST", "/api/ai/historical-research", {
        projectId,
        projectTitle,
        timeEra: timeEra || "1970s",
        setting: setting || "London",
        query,
        topic,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "research-history"],
      });
      setResearchQuery("");
      setSelectedTopic(null);
    },
  });

  const handleResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim()) return;
    
    researchMutation.mutate({
      query: researchQuery,
      topic: selectedTopic || undefined,
    });
  };

  const handleTopicResearch = (topicId: string, label: string) => {
    const contextualQuery = `Tell me about ${label.toLowerCase()} in ${timeEra || "1971"} ${setting || "London"}. Focus on specific details that would be relevant for historical fiction.`;
    
    researchMutation.mutate({
      query: contextualQuery,
      topic: topicId,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <DialogTitle>Historical Research</DialogTitle>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-amber-700 border-amber-200">
                {timeEra || "1970s"}
              </Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-200">
                {setting || "London"}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Research authentic historical details for your {timeEra || "1970s"} {setting || "London"} setting with AI assistance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Research Tools */}
          <div className="w-1/3 flex flex-col space-y-4">
            {/* Quick Research Topics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-neutral-700">Quick Research Topics:</h4>
              <div className="grid gap-2">
                {HISTORICAL_TOPICS.map((topic) => (
                  <Button
                    key={topic.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTopicResearch(topic.id, topic.label)}
                    disabled={researchMutation.isPending}
                    className="justify-start text-left h-auto p-3"
                  >
                    <topic.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{topic.label}</div>
                      <div className="text-xs text-neutral-500">{topic.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Research Query */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-neutral-700">Ask custom question:</h4>
              <form onSubmit={handleResearch} className="space-y-3">
                <Input
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder={`What was ${setting || "London"} like in ${timeEra || "1971"}?`}
                  disabled={researchMutation.isPending}
                  className="text-sm"
                />
                
                <Button
                  type="submit"
                  disabled={!researchQuery.trim() || researchMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  {researchMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Research
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Panel - Research History */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-700">Research History</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">Loading research history...</p>
                </div>
              ) : researchHistory.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">
                    Start researching historical details for your story
                  </p>
                </div>
              ) : (
                researchHistory
                  .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateA - dateB;
                  })
                  .map((message) => (
                    <Card key={message.id} className={message.role === "user" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-neutral-800">
                            {message.role === "user" ? "🔍 Research Query" : "📚 Historical Information"}
                          </CardTitle>
                          <time className="text-xs text-neutral-500">
                            {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                          </time>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                        {message.topic && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {message.topic}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}