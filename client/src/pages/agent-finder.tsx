import { useState } from 'react';
import { useRoute } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import FeatureGate from '@/components/feature-gate';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Edit3, 
  Mail, 
  ExternalLink, 
  Star, 
  BookOpen, 
  Send,
  Sparkles,
  DollarSign,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';

interface AgentResult {
  name: string;
  agency: string;
  country?: string;
  genres: string[];
  clientTypes: string[];
  submissionGuidelines: string;
  queryLetterTips: string;
  website?: string;
  email?: string;
  recentSales?: string;
  matchScore: number;
  reasoning: string;
}

interface EditorResult {
  name: string;
  country?: string;
  specializations: string[];
  editingTypes: string[];
  experience: string;
  estimatedCost: string;
  turnaroundTime: string;
  portfolio?: string;
  contact?: string;
  matchScore: number;
  reasoning: string;
}

interface PublisherResult {
  name: string;
  country?: string;
  genres: string[];
  submissionPolicy: string;
  acceptsUnsolicitedMss: boolean;
  recentPublications: string;
  submissionGuidelines: string;
  website?: string;
  contact?: string;
  matchScore: number;
  reasoning: string;
}

export default function AgentFinder() {
  const [, params] = useRoute('/agent-finder/:projectId');
  const projectId = params?.projectId;
  
  const [activeTab, setActiveTab] = useState<'agents' | 'editors' | 'publishers'>('agents');
  const [isSearching, setIsSearching] = useState(false);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [editorResults, setEditorResults] = useState<EditorResult[]>([]);
  const [publisherResults, setPublisherResults] = useState<PublisherResult[]>([]);
  const [resultsCount, setResultsCount] = useState(10);
  
  // Form states
  const [genre, setGenre] = useState('');
  const [bookLength, setBookLength] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [previousPublications, setPreviousPublications] = useState('');
  const [editingType, setEditingType] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  
  const { toast } = useToast();
  const featureAccess = useFeatureAccess();

  const searchMutation = useMutation({
    mutationFn: async (searchData: any) => {
      const response = await apiRequest("POST", "/api/agent-finder/search", searchData);
      return response.json();
    },
    onSuccess: (data) => {
      if (activeTab === 'agents') {
        setAgentResults(data.results || []);
      } else if (activeTab === 'editors') {
        setEditorResults(data.results || []);
      } else {
        setPublisherResults(data.results || []);
      }
      setIsSearching(false);
      const resultType = activeTab === 'agents' ? 'agents' : activeTab === 'editors' ? 'editors' : 'publishers';
      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} matching ${resultType}.`,
      });
    },
    onError: () => {
      setIsSearching(false);
      toast({
        title: "Search Failed",
        description: "Unable to find matches. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLoadMore = () => {
    const newCount = resultsCount + 10;
    setResultsCount(newCount);
    handleSearch(newCount);
  };

  const handleSearch = (customCount?: number) => {
    if (activeTab === 'agents') {
      if (!genre || !synopsis) {
        toast({
          title: "Missing Information",
          description: "Please provide at least your genre and book synopsis.",
          variant: "destructive",
        });
        return;
      }
    } else if (activeTab === 'editors') {
      if (!genre || !editingType) {
        toast({
          title: "Missing Information",
          description: "Please specify your genre and editing type needed.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!genre) {
        toast({
          title: "Missing Information",
          description: "Please specify your genre for publisher search.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSearching(true);
    const searchData = {
      type: activeTab,
      genre,
      bookLength: bookLength || 'Unknown',
      synopsis: synopsis || '',
      authorBio: authorBio || '',
      previousPublications: previousPublications || 'None',
      editingType: editingType || '',
      budget: budget || '',
      timeline: timeline || '',
      projectId,
      count: customCount || resultsCount
    };
    
    searchMutation.mutate(searchData);
  };

  const renderAgentResult = (agent: AgentResult, index: number) => (
    <Card key={index} className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-600" />
              {agent.name}
            </CardTitle>
            <p className="text-neutral-600 mt-1">{agent.agency}</p>
            {agent.country && (
              <p className="text-neutral-500 text-sm mt-1">{agent.country}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-medium">{agent.matchScore}% Match</span>
            </div>
            <div className="flex gap-2">
              {agent.website && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(agent.website, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Website
                </Button>
              )}
              {agent.email && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`mailto:${agent.email}`, '_blank')}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Contact
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-neutral-700">Genres</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {agent.genres.map((genre, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-neutral-700">Client Types</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {agent.clientTypes.map((type, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {agent.recentSales && (
            <div>
              <Label className="text-sm font-medium text-neutral-700">Recent Sales</Label>
              <p className="text-sm text-neutral-600 mt-1">{agent.recentSales}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-neutral-700">Why This Match</Label>
            <p className="text-sm text-neutral-600 mt-1">{agent.reasoning}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-neutral-700">Submission Guidelines</Label>
            <p className="text-sm text-neutral-600 mt-1">{agent.submissionGuidelines}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-neutral-700">Query Letter Tips</Label>
            <p className="text-sm text-neutral-600 mt-1">{agent.queryLetterTips}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEditorResult = (editor: EditorResult, index: number) => (
    <Card key={index} className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit3 className="w-5 h-5 text-green-600" />
              {editor.name}
            </CardTitle>
            <p className="text-neutral-600 mt-1">{editor.experience}</p>
            {editor.country && (
              <p className="text-neutral-500 text-sm mt-1">{editor.country}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-medium">{editor.matchScore}% Match</span>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(editor.name + ' editor')}`, '_blank')}
              >
                <Search className="w-3 h-3 mr-1" />
                Google Search
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-neutral-700">Estimated Cost</Label>
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{editor.estimatedCost}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-neutral-700">Turnaround Time</Label>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{editor.turnaroundTime}</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-neutral-700">Specializations</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {editor.specializations.map((spec, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-neutral-700">Editing Types</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {editor.editingTypes.map((type, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-neutral-700">Why This Match</Label>
            <p className="text-sm text-neutral-600 mt-1">{editor.reasoning}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPublisherResult = (publisher: PublisherResult, index: number) => (
    <Card key={index} className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
              {publisher.name}
            </CardTitle>
            {publisher.country && (
              <p className="text-neutral-500 text-sm mt-1">{publisher.country}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-medium">{publisher.matchScore}% Match</span>
            </div>
            <div className="flex gap-2">
              {publisher.website && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(publisher.website, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Website
                </Button>
              )}
              {publisher.contact && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`mailto:${publisher.contact}`, '_blank')}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Contact
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-neutral-700">Accepts Unsolicited MSS</Label>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className={`w-4 h-4 ${publisher.acceptsUnsolicitedMss ? 'text-green-600' : 'text-red-600'}`} />
                <span className="text-sm font-medium">{publisher.acceptsUnsolicitedMss ? 'Yes' : 'No'}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-neutral-700">Submission Policy</Label>
              <p className="text-sm text-neutral-600 mt-1">{publisher.submissionPolicy}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-neutral-700">Genres Published</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {publisher.genres.map((genre, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {publisher.recentPublications && (
            <div>
              <Label className="text-sm font-medium text-neutral-700">Recent Publications</Label>
              <p className="text-sm text-neutral-600 mt-1">{publisher.recentPublications}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-neutral-700">Why This Match</Label>
            <p className="text-sm text-neutral-600 mt-1">{publisher.reasoning}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-neutral-700">Submission Guidelines</Label>
            <p className="text-sm text-neutral-600 mt-1">{publisher.submissionGuidelines}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project
              </Button>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-800">Literary Agent & Editor Finder</h1>
            </div>
            <p className="text-neutral-600">
              Find the perfect literary agents, editors, and publishers for your manuscript using AI-powered matching.
            </p>
          </div>

          <FeatureGate feature="aiLiteraryAnalysis">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search Form */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={(value) => {
                    setActiveTab(value as 'agents' | 'editors' | 'publishers');
                    setResultsCount(10); // Reset count when switching tabs
                  }}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="agents">Literary Agents</TabsTrigger>
                      <TabsTrigger value="editors">Editors</TabsTrigger>
                      <TabsTrigger value="publishers">Publishers</TabsTrigger>
                    </TabsList>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="genre">Genre *</Label>
                        <Select value={genre} onValueChange={setGenre}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a genre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fantasy">Fantasy</SelectItem>
                            <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                            <SelectItem value="Romance">Romance</SelectItem>
                            <SelectItem value="Mystery">Mystery</SelectItem>
                            <SelectItem value="Thriller">Thriller</SelectItem>
                            <SelectItem value="Horror">Horror</SelectItem>
                            <SelectItem value="Historical Fiction">Historical Fiction</SelectItem>
                            <SelectItem value="Literary Fiction">Literary Fiction</SelectItem>
                            <SelectItem value="Contemporary Fiction">Contemporary Fiction</SelectItem>
                            <SelectItem value="Young Adult">Young Adult</SelectItem>
                            <SelectItem value="Middle Grade">Middle Grade</SelectItem>
                            <SelectItem value="Children's Books">Children's Books</SelectItem>
                            <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                            <SelectItem value="Biography/Memoir">Biography/Memoir</SelectItem>
                            <SelectItem value="Self-Help">Self-Help</SelectItem>
                            <SelectItem value="Business">Business</SelectItem>
                            <SelectItem value="Health & Wellness">Health & Wellness</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                            <SelectItem value="True Crime">True Crime</SelectItem>
                            <SelectItem value="Travel">Travel</SelectItem>
                            <SelectItem value="Cookbooks">Cookbooks</SelectItem>
                            <SelectItem value="Poetry">Poetry</SelectItem>
                            <SelectItem value="Essays">Essays</SelectItem>
                            <SelectItem value="Graphic Novels">Graphic Novels</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="bookLength">Word Count</Label>
                        <Input
                          id="bookLength"
                          value={bookLength}
                          onChange={(e) => setBookLength(e.target.value)}
                          placeholder="e.g., 80,000 words"
                        />
                      </div>

                      {activeTab === 'agents' && (
                        <>
                          <div>
                            <Label htmlFor="synopsis">Book Synopsis *</Label>
                            <Textarea
                              id="synopsis"
                              value={synopsis}
                              onChange={(e) => setSynopsis(e.target.value)}
                              placeholder="Brief summary of your book's plot and themes"
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label htmlFor="authorBio">Author Bio</Label>
                            <Textarea
                              id="authorBio"
                              value={authorBio}
                              onChange={(e) => setAuthorBio(e.target.value)}
                              placeholder="Your writing background and credentials"
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="previousPublications">Previous Publications</Label>
                            <Input
                              id="previousPublications"
                              value={previousPublications}
                              onChange={(e) => setPreviousPublications(e.target.value)}
                              placeholder="List any previous works or publications"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === 'editors' && (
                        <>
                          <div>
                            <Label htmlFor="editingType">Editing Type *</Label>
                            <Input
                              id="editingType"
                              value={editingType}
                              onChange={(e) => setEditingType(e.target.value)}
                              placeholder="e.g., Developmental, Copy, Line Editing"
                            />
                          </div>

                          <div>
                            <Label htmlFor="budget">Budget Range</Label>
                            <Input
                              id="budget"
                              value={budget}
                              onChange={(e) => setBudget(e.target.value)}
                              placeholder="e.g., $1,000 - $3,000"
                            />
                          </div>

                          <div>
                            <Label htmlFor="timeline">Preferred Timeline</Label>
                            <Input
                              id="timeline"
                              value={timeline}
                              onChange={(e) => setTimeline(e.target.value)}
                              placeholder="e.g., 4-6 weeks"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === 'publishers' && (
                        <>
                          <div>
                            <Label htmlFor="synopsis">Book Synopsis</Label>
                            <Textarea
                              id="synopsis"
                              value={synopsis}
                              onChange={(e) => setSynopsis(e.target.value)}
                              placeholder="Brief summary of your book's plot and themes"
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="authorBio">Author Bio</Label>
                            <Textarea
                              id="authorBio"
                              value={authorBio}
                              onChange={(e) => setAuthorBio(e.target.value)}
                              placeholder="Your writing background and credentials"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={() => handleSearch()}
                        disabled={isSearching}
                        className="w-full"
                      >
                        {isSearching ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Find {activeTab === 'agents' ? 'Agents' : activeTab === 'editors' ? 'Editors' : 'Publishers'}
                          </>
                        )}
                      </Button>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Results */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {activeTab === 'agents' ? (
                        <Users className="w-5 h-5 text-blue-600" />
                      ) : activeTab === 'editors' ? (
                        <Edit3 className="w-5 h-5 text-green-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-purple-600" />
                      )}
                      Search Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      {activeTab === 'agents' ? (
                        agentResults.length > 0 ? (
                          <div>
                            {agentResults.map((agent, index) => renderAgentResult(agent, index))}
                            {agentResults.length >= 10 && (
                              <div className="text-center mt-6">
                                <Button 
                                  onClick={handleLoadMore}
                                  disabled={isSearching}
                                  variant="outline"
                                  className="w-full max-w-md"
                                >
                                  {isSearching ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-4 h-4 mr-2" />
                                      Load More Agents (showing {agentResults.length}, get {resultsCount + 10})
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-neutral-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                            <h3 className="text-lg font-medium mb-2">No {activeTab} found yet</h3>
                            <p>Use the search form to find matching {activeTab} for your manuscript.</p>
                          </div>
                        )
                      ) : activeTab === 'editors' ? (
                        editorResults.length > 0 ? (
                          <div>
                            {editorResults.map((editor, index) => renderEditorResult(editor, index))}
                            {editorResults.length >= 10 && (
                              <div className="text-center mt-6">
                                <Button 
                                  onClick={handleLoadMore}
                                  disabled={isSearching}
                                  variant="outline"
                                  className="w-full max-w-md"
                                >
                                  {isSearching ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-4 h-4 mr-2" />
                                      Load More Editors (showing {editorResults.length}, get {resultsCount + 10})
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-neutral-500">
                            <Edit3 className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                            <h3 className="text-lg font-medium mb-2">No {activeTab} found yet</h3>
                            <p>Use the search form to find matching {activeTab} for your manuscript.</p>
                          </div>
                        )
                      ) : (
                        publisherResults.length > 0 ? (
                          <div>
                            {publisherResults.map((publisher, index) => renderPublisherResult(publisher, index))}
                            {publisherResults.length >= 10 && (
                              <div className="text-center mt-6">
                                <Button 
                                  onClick={handleLoadMore}
                                  disabled={isSearching}
                                  variant="outline"
                                  className="w-full max-w-md"
                                >
                                  {isSearching ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                                      Loading more...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-4 h-4 mr-2" />
                                      Load More Publishers (showing {publisherResults.length}, get {resultsCount + 10})
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-neutral-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                            <h3 className="text-lg font-medium mb-2">No {activeTab} found yet</h3>
                            <p>Use the search form to find matching {activeTab} for your manuscript.</p>
                          </div>
                        )
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </FeatureGate>
        </div>
      </div>
    </TooltipProvider>
  );
}