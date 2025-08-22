import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search, CheckCircle, AlertTriangle, X, Loader2 } from "lucide-react";

interface WritingToolsProps {
  onClose: () => void;
}

// Built-in thesaurus data (expanded for better coverage)
const thesaurusData: Record<string, string[]> = {
  "good": ["excellent", "outstanding", "superb", "fine", "great", "wonderful", "marvelous", "exceptional", "remarkable"],
  "bad": ["terrible", "awful", "horrible", "dreadful", "poor", "inferior", "inadequate", "atrocious", "deplorable"],
  "big": ["large", "huge", "enormous", "massive", "gigantic", "vast", "immense", "colossal", "tremendous"],
  "small": ["tiny", "minute", "minuscule", "petite", "compact", "little", "diminutive", "microscopic", "insignificant"],
  "happy": ["joyful", "elated", "cheerful", "delighted", "content", "pleased", "ecstatic", "euphoric", "blissful"],
  "sad": ["melancholy", "sorrowful", "dejected", "despondent", "mournful", "gloomy", "downhearted", "disheartened", "forlorn"],
  "fast": ["quick", "rapid", "swift", "speedy", "brisk", "hasty", "expeditious", "fleet", "nimble"],
  "slow": ["gradual", "leisurely", "unhurried", "sluggish", "deliberate", "measured", "steady", "languid", "ponderous"],
  "beautiful": ["gorgeous", "stunning", "magnificent", "lovely", "attractive", "elegant", "exquisite", "breathtaking", "radiant"],
  "ugly": ["hideous", "repulsive", "unsightly", "grotesque", "unattractive", "ghastly", "revolting", "repugnant", "abhorrent"],
  "smart": ["intelligent", "clever", "brilliant", "wise", "astute", "sharp", "insightful", "ingenious", "perceptive"],
  "stupid": ["foolish", "ignorant", "dense", "dim-witted", "senseless", "mindless", "obtuse", "moronic", "imbecilic"],
  "walk": ["stroll", "saunter", "stride", "amble", "wander", "march", "trek", "pace", "promenade"],
  "run": ["sprint", "dash", "race", "bolt", "hurry", "rush", "gallop", "scamper", "flee"],
  "said": ["declared", "stated", "exclaimed", "whispered", "announced", "remarked", "proclaimed", "asserted", "articulated"],
  "look": ["gaze", "stare", "glance", "peer", "observe", "examine", "scrutinize", "behold", "contemplate"],
  "nice": ["pleasant", "agreeable", "delightful", "charming", "lovely", "enjoyable", "satisfying", "appealing", "gratifying"],
  "funny": ["amusing", "hilarious", "comical", "humorous", "entertaining", "witty", "droll", "laughable", "ridiculous"],
  "scary": ["frightening", "terrifying", "horrifying", "chilling", "spine-tingling", "eerie", "menacing", "sinister", "ominous"],
  "angry": ["furious", "irate", "enraged", "livid", "incensed", "outraged", "infuriated", "wrathful", "indignant"]
};

// Grammar rules for basic checking
const grammarRules = [
  {
    pattern: /\b(their|there|they're)\b/gi,
    message: "Check usage of their/there/they're",
    type: "common-error"
  },
  {
    pattern: /\b(your|you're)\b/gi,
    message: "Check usage of your/you're",
    type: "common-error"
  },
  {
    pattern: /\b(its|it's)\b/gi,
    message: "Check usage of its/it's",
    type: "common-error"
  },
  {
    pattern: /\b(affect|effect)\b/gi,
    message: "Check usage of affect/effect",
    type: "common-error"
  },
  {
    pattern: /\b(\w+)\s+\1\b/gi,
    message: "Possible repeated word",
    type: "repetition"
  },
  {
    pattern: /[.!?]\s*[a-z]/g,
    message: "Consider capitalizing after punctuation",
    type: "capitalization"
  },
  {
    pattern: /\s{2,}/g,
    message: "Multiple spaces detected",
    type: "spacing"
  }
];

interface GrammarIssue {
  text: string;
  message: string;
  type: string;
  position: number;
}

interface SpellingIssue {
  word: string;
  suggestions: string[];
  position: number;
}

// Common misspellings and their corrections
const spellCheckData: Record<string, string[]> = {
  "recieve": ["receive"],
  "seperate": ["separate"],
  "occured": ["occurred"],
  "neccessary": ["necessary"],
  "definate": ["definite"],
  "begining": ["beginning"],
  "embarass": ["embarrass"],
  "accomodate": ["accommodate"],
  "acheive": ["achieve"],
  "beleive": ["believe"],
  "concious": ["conscious"],
  "existance": ["existence"],
  "goverment": ["government"],
  "independant": ["independent"],
  "liesure": ["leisure"],
  "maintainance": ["maintenance"],
  "mischievous": ["mischievous"],
  "posession": ["possession"],
  "priviledge": ["privilege"],
  "restaurant": ["restaurant"],
  "tommorow": ["tomorrow"],
  "vaccuum": ["vacuum"],
  "wierd": ["weird"],
  "excercise": ["exercise"],
  "calender": ["calendar"],
  "cemetary": ["cemetery"],
  "dilemna": ["dilemma"],
  "flourescent": ["fluorescent"],
  "harrass": ["harass"],
  "occassion": ["occasion"],
  "perseverence": ["perseverance"],
  "questionaire": ["questionnaire"],
  "temperment": ["temperament"]
};

export default function WritingTools({ onClose }: WritingToolsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [textToCheck, setTextToCheck] = useState("");
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [spellingIssues, setSpellingIssues] = useState<SpellingIssue[]>([]);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [isLoadingSynonyms, setIsLoadingSynonyms] = useState(false);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const searchSynonyms = async (word: string) => {
    if (!word.trim()) {
      setSynonyms([]);
      return;
    }

    setIsLoadingSynonyms(true);
    try {
      const response = await fetch(`/api/thesaurus/${encodeURIComponent(word)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSynonyms(data.synonyms || []);
      } else {
        // Fallback to local thesaurus data
        const lowerWord = word.toLowerCase();
        setSynonyms(thesaurusData[lowerWord] || []);
      }
    } catch (error) {
      console.error('Thesaurus API error:', error);
      // Fallback to local thesaurus data
      const lowerWord = word.toLowerCase();
      setSynonyms(thesaurusData[lowerWord] || []);
    } finally {
      setIsLoadingSynonyms(false);
    }
  };

  const checkSpelling = async (text: string) => {
    const issues: SpellingIssue[] = [];
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    
    // Check each word using the API
    for (const word of words) {
      if (word.length < 3) continue; // Skip very short words
      
      try {
        const response = await fetch(`/api/spellcheck/${encodeURIComponent(word)}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (!result.isCorrect && result.suggestions.length > 0) {
            const position = text.toLowerCase().indexOf(word.toLowerCase());
            issues.push({
              word: word,
              suggestions: result.suggestions,
              position: position
            });
          }
        }
      } catch (error) {
        // Fallback to local dictionary for this word
        const lowerWord = word.toLowerCase();
        if (spellCheckData[lowerWord]) {
          const position = text.toLowerCase().indexOf(lowerWord);
          issues.push({
            word: word,
            suggestions: spellCheckData[lowerWord],
            position: position
          });
        }
      }
    }

    setSpellingIssues(issues);
  };

  const checkGrammar = (text: string) => {
    const issues: GrammarIssue[] = [];
    
    grammarRules.forEach(rule => {
      let match;
      while ((match = rule.pattern.exec(text)) !== null) {
        issues.push({
          text: match[0],
          message: rule.message,
          type: rule.type,
          position: match.index
        });
      }
    });

    setGrammarIssues(issues);
    checkSpelling(text);
  };

  const checkGrammarWithAPI = async (text: string) => {
    setIsCheckingGrammar(true);
    try {
      // Use OpenAI for comprehensive grammar checking
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `Please check the following text for grammar errors and provide specific suggestions for improvement. Respond in JSON format with an array of issues, each containing: "text" (the problematic text), "message" (explanation of the issue), "type" (grammar type), and "position" (approximate position in text). Here's the text to check: "${text}"`,
          context: { type: "grammar_check" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        try {
          // Try to parse JSON from response
          const jsonMatch = data.response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const grammarResults = JSON.parse(jsonMatch[0]);
            setGrammarIssues(grammarResults);
          } else {
            // Fallback to local grammar rules
            checkGrammar(text);
          }
        } catch (parseError) {
          // Fallback to local grammar rules
          checkGrammar(text);
        }
      } else {
        // Fallback to local grammar rules
        checkGrammar(text);
      }
    } catch (error) {
      console.error('Grammar API error:', error);
      // Fallback to local grammar rules
      checkGrammar(text);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const handleGrammarCheck = async () => {
    await checkGrammarWithAPI(textToCheck);
    await checkSpelling(textToCheck);
  };

  // Trigger thesaurus search when searchTerm changes
  React.useEffect(() => {
    if (searchTerm.trim()) {
      searchSynonyms(searchTerm);
    } else {
      setSynonyms([]);
    }
  }, [searchTerm]);

  return (
    <div className="w-80 bg-white border-l border-neutral-100 flex flex-col">
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-neutral-800">Writing Tools</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="thesaurus" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
          <TabsTrigger value="thesaurus">Thesaurus</TabsTrigger>
          <TabsTrigger value="grammar">Grammar</TabsTrigger>
          <TabsTrigger value="spelling">Spelling</TabsTrigger>
        </TabsList>

        <TabsContent value="thesaurus" className="flex-1 p-4 mt-0">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600 mb-2 block">
                Search for synonyms
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Enter a word..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searchTerm && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-blue-600">"{searchTerm}"</span>
                    {isLoadingSynonyms ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : synonyms.length > 0 ? (
                      <Badge variant="secondary">{synonyms.length} synonyms</Badge>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingSynonyms ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching for synonyms...
                    </div>
                  ) : synonyms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {synonyms.map((synonym, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => setSearchTerm(synonym)}
                        >
                          {synonym}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No synonyms found for "{searchTerm}". Try a different word.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500 mb-2">Common words to enhance:</p>
                  <div className="flex flex-wrap gap-1">
                    {["good", "bad", "big", "small", "said", "look", "walk", "nice", "funny", "scary"].map((word) => (
                      <Badge
                        key={word}
                        variant="secondary"
                        className="cursor-pointer hover:bg-neutral-200"
                        onClick={() => setSearchTerm(word)}
                      >
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grammar" className="flex-1 p-4 mt-0">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600 mb-2 block">
                Paste text to check
              </label>
              <textarea
                placeholder="Enter your text here for grammar checking..."
                value={textToCheck}
                onChange={(e) => setTextToCheck(e.target.value)}
                className="w-full h-32 p-3 border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleGrammarCheck}
                className="mt-2 w-full"
                disabled={isCheckingGrammar || !textToCheck.trim()}
              >
                {isCheckingGrammar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check Grammar & Spelling
                  </>
                )}
              </Button>
            </div>

            {grammarIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Issues Found ({grammarIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-3">
                      {grammarIssues.map((issue, index) => (
                        <div key={index} className="border-l-2 border-orange-200 pl-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {issue.type}
                            </Badge>
                            <span className="text-sm font-medium text-neutral-800">
                              "{issue.text}"
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {textToCheck && grammarIssues.length === 0 && spellingIssues.length === 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">No grammar issues detected!</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Grammar Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-neutral-600">
                  <p>• <strong>Their/There/They're:</strong> Their = possession, There = location, They're = they are</p>
                  <p>• <strong>Your/You're:</strong> Your = possession, You're = you are</p>
                  <p>• <strong>Its/It's:</strong> Its = possession, It's = it is</p>
                  <p>• <strong>Affect/Effect:</strong> Affect = verb (to influence), Effect = noun (result)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="spelling" className="flex-1 p-4 mt-0">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600 mb-2 block">
                Paste text to check spelling
              </label>
              <textarea
                placeholder="Enter your text here for spell checking..."
                value={textToCheck}
                onChange={(e) => setTextToCheck(e.target.value)}
                className="w-full h-32 p-3 border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleGrammarCheck}
                className="mt-2 w-full"
                disabled={!textToCheck.trim()}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Check Spelling
              </Button>
            </div>

            {spellingIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Spelling Errors ({spellingIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="space-y-3">
                      {spellingIssues.map((issue, index) => (
                        <div key={index} className="border-l-2 border-red-200 pl-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs border-red-300 text-red-700"
                            >
                              misspelled
                            </Badge>
                            <span className="text-sm font-medium text-neutral-800">
                              "{issue.word}"
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-neutral-600 mr-2">Suggestions:</span>
                            {issue.suggestions.map((suggestion, suggestionIndex) => (
                              <Badge
                                key={suggestionIndex}
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-green-100 hover:border-green-300"
                              >
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {textToCheck && spellingIssues.length === 0 && grammarIssues.length === 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">No spelling errors detected!</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Common Misspellings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-neutral-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p><span className="text-red-600">recieve</span> → receive</p>
                      <p><span className="text-red-600">seperate</span> → separate</p>
                      <p><span className="text-red-600">definate</span> → definite</p>
                      <p><span className="text-red-600">neccessary</span> → necessary</p>
                    </div>
                    <div>
                      <p><span className="text-red-600">occured</span> → occurred</p>
                      <p><span className="text-red-600">beleive</span> → believe</p>
                      <p><span className="text-red-600">wierd</span> → weird</p>
                      <p><span className="text-red-600">tommorow</span> → tomorrow</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}