import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useState } from "react";
import { 
  BookOpen, 
  Edit3, 
  Users, 
  Brain, 
  FileText, 
  Download, 
  Shield, 
  BarChart3,
  Search,
  Zap,
  Clock,
  Target,
  MessageSquare,
  History,
  ExternalLink,
  Home,
  Map
} from "lucide-react";

export default function Documentation() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      toast({
        title: "Generating PDF",
        description: "Creating your documentation PDF...",
      });
      
      const response = await fetch('/api/export/documentation-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'MyNovelCraft User Documentation',
          content: 'full'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'MyNovelCraft-Documentation.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "Documentation saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" style={{ scrollBehavior: 'smooth' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-start mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={isDownloading}>
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            MyNovelCraft Documentation
          </h1>
          <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mb-2">
            Written by writers for writers
          </p>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Your complete guide to mastering AI-powered novel writing with advanced tools, 
            intelligent assistance, and professional manuscript formatting.
          </p>
          <Badge variant="outline" className="mt-4">
            Version 2.1 - January 2025
          </Badge>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>
              Get up and running with MyNovelCraft in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="#project-management" className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-600 transition-colors">1</div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Create Project</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Start with a new novel project and set your writing goals</p>
              </a>
              <a href="#project-management" className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-600 transition-colors">2</div>
                <h3 className="font-semibold mb-2 group-hover:text-green-700 dark:group-hover:text-green-300">Add Characters</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Build your cast with detailed character profiles</p>
              </a>
              <a href="#plot-outliner" className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-600 transition-colors">3</div>
                <h3 className="font-semibold mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Plan Your Story</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Structure chapters with comprehensive plot planning</p>
              </a>
              <a href="#writing-tools" className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-600 transition-colors">4</div>
                <h3 className="font-semibold mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300">Write Chapters</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use the advanced editor with AI assistance</p>
              </a>
              <a href="#agent-finder" className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-pink-600 transition-colors">5</div>
                <h3 className="font-semibold mb-2 group-hover:text-pink-700 dark:group-hover:text-pink-300">Find Professionals</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connect with agents, editors, and publishers</p>
              </a>
              <a href="#export-publishing" className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-600 transition-colors">6</div>
                <h3 className="font-semibold mb-2 group-hover:text-orange-700 dark:group-hover:text-orange-300">Export & Share</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Download as Word or PDF when ready</p>
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Core Features */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Management */}
            <Card id="project-management">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Project Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Creating Projects</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Start your novel by creating a new project with essential details:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Title & Description:</strong> Define your novel's identity</li>
                    <li>• <strong>Target Word Count:</strong> Set writing goals and track progress</li>
                    <li>• <strong>Time Period:</strong> Historical context for AI research</li>
                    <li>• <strong>Setting:</strong> Geographic location for authentic details</li>
                    <li>• <strong>Genre:</strong> Literary style for targeted AI assistance</li>
                  </ul>
                  <div className="mt-3">
                    <Link href="/">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Try Project Creation
                      </Button>
                    </Link>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Project Organization</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• View all projects from the main dashboard</li>
                    <li>• Edit project details anytime with the edit button</li>
                    <li>• Track word count progress with visual indicators</li>
                    <li>• Access detailed writing statistics for each project</li>
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <Link href="/">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Writing & Editing */}
            <Card id="writing-tools">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-green-500" />
                  Advanced Writing Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Rich Text Editor</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Professional Formatting:</strong> Bookman Old Style 12pt font</li>
                    <li>• <strong>Paragraph Indentation:</strong> Automatic 1.27cm manuscript formatting</li>
                    <li>• <strong>Line Spacing:</strong> Single, 1.5x, or Double spacing options</li>
                    <li>• <strong>Auto-save:</strong> Never lose your work with continuous saving</li>
                    <li>• <strong>Distraction-free modes:</strong> Focus and minimal UI options</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Writing Tools Panel</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>AI-Powered Thesaurus:</strong> Real-time synonym lookup using OpenAI</li>
                    <li>• <strong>Grammar Checker:</strong> Comprehensive AI-driven grammar analysis</li>
                    <li>• <strong>Spell Checker:</strong> OpenAI-powered spell checking with suggestions</li>
                    <li>• <strong>Loading States:</strong> Visual feedback during API processing</li>
                    <li>• <strong>Fallback Support:</strong> Local dictionary backup if API unavailable</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Keyboard Shortcuts & Actions</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Ctrl+F:</strong> Find & Replace with search highlighting</li>
                    <li>• <strong>Ctrl+Z/Y:</strong> Undo/Redo with full history tracking</li>
                    <li>• <strong>Double-click:</strong> Spell check any word in the editor</li>
                    <li>• <strong>Click suggestions:</strong> Replace misspelled words instantly</li>
                    <li>• <strong>Auto-save:</strong> Content saved every 2 seconds automatically</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Multi-Monitor Support</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>New Tab Mode:</strong> Open editor in separate tab for dual monitors</li>
                    <li>• <strong>Full Feature Parity:</strong> All AI tools work in new tab mode</li>
                    <li>• <strong>Synchronized Content:</strong> Changes saved across all instances</li>
                    <li>• <strong>Theme Consistency:</strong> Writing modes and themes carry over</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Writing Session Tracker</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Real-time Progress:</strong> Track words written in current session</li>
                    <li>• <strong>Customizable Targets:</strong> Set daily or session word goals</li>
                    <li>• <strong>Visual Indicators:</strong> Progress bars and completion percentages</li>
                    <li>• <strong>Statistics Display:</strong> Word count, character count, reading time</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Advanced Editor Features</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Drag & Drop:</strong> Resize and move editor window</li>
                    <li>• <strong>Session Tracking:</strong> Monitor writing time and targets</li>
                    <li>• <strong>Undo/Redo:</strong> Full editing history navigation</li>
                    <li>• <strong>Word Count:</strong> Real-time progress tracking</li>
                  </ul>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 italic">
                      💡 Create a project and chapter to access the advanced text editor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plot Outliner */}
            <Card id="plot-outliner">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-indigo-500" />
                  Plot Outliner & Story Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Comprehensive Plot Planning</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Master your story structure with detailed chapter planning and plot development tools:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Chapter Synopsis:</strong> Brief summaries of what happens in each chapter</li>
                    <li>• <strong>Plot Points:</strong> Major events, turning points, and revelations</li>
                    <li>• <strong>Story Beats:</strong> Inciting incidents, rising action, climax, and resolution tracking</li>
                    <li>• <strong>Conflict Management:</strong> Track tensions introduced and resolved per chapter</li>
                    <li>• <strong>Character Development:</strong> Monitor character growth and transformations</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Chapter Structure Elements</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>POV Character:</strong> Specify point-of-view character for each chapter</li>
                    <li>• <strong>Setting Details:</strong> Time, place, and atmosphere for each scene</li>
                    <li>• <strong>Scene Count:</strong> Track number of scenes and pacing</li>
                    <li>• <strong>Chapter Purpose:</strong> Define the chapter's role in advancing the story</li>
                    <li>• <strong>Themes & Motifs:</strong> Central ideas and recurring elements</li>
                    <li>• <strong>Foreshadowing:</strong> Plan hints and setup for future events</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Plot Overview Dashboard</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Visual Chapter Grid:</strong> See all chapters with their key information at a glance</li>
                    <li>• <strong>Plot Statistics:</strong> Track story progression, conflicts, and character development</li>
                    <li>• <strong>Color-coded Status:</strong> Visual indicators for chapter completion and plot elements</li>
                    <li>• <strong>Export Integration:</strong> Include plot information in manuscript exports</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Writing Guidance & Examples</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Built-in Help:</strong> Writing tips and explanations for each plot element</li>
                    <li>• <strong>Real Examples:</strong> See how published novels handle similar story elements</li>
                    <li>• <strong>Best Practices:</strong> Professional storytelling techniques and advice</li>
                    <li>• <strong>Scene Planning:</strong> Understand optimal scene counts and pacing guidelines</li>
                  </ul>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 italic">
                      💡 Access the Plot Outliner from any project to plan your entire novel structure
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card id="ai-assistant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI Writing Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Smart Suggestions</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Plot Ideas:</strong> Generate compelling story developments</li>
                    <li>• <strong>Character Development:</strong> Create realistic character traits</li>
                    <li>• <strong>Scene Descriptions:</strong> Enhance settings and atmosphere</li>
                    <li>• <strong>Story Progression:</strong> Context-aware creative suggestions</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Three AI Assistants</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Literary Editor:</strong> Chapter analysis, structure, pacing, character development</li>
                    <li>• <strong>Writer Consultant:</strong> Creative inspiration, plot development, "what if" scenarios</li>
                    <li>• <strong>Ghostwriter:</strong> Direct writing assistance, dialogue, descriptions, scene continuation</li>
                    <li>• <strong>Context-Aware:</strong> Uses your characters, plot, and setting for targeted suggestions</li>
                    <li>• <strong>Interactive Chat:</strong> Ask specific writing questions with persistent conversation history</li>
                    <li>• <strong>Available Everywhere:</strong> All assistants work in both main editor and new tab mode</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Historical Research</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Period-Specific Research:</strong> Authentic historical details</li>
                    <li>• <strong>Quick Topics:</strong> Daily life, politics, technology, culture</li>
                    <li>• <strong>Geographic Context:</strong> Location-specific information</li>
                    <li>• <strong>Research History:</strong> Save and review past conversations</li>
                  </ul>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 italic">
                      💡 Access Historical Research from any chapter's AI tools menu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export & Publishing */}
            <Card id="export-publishing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-orange-500" />
                  Export & Publishing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Export Formats</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Microsoft Word (.docx):</strong> Professional manuscript format</li>
                    <li>• <strong>PDF:</strong> Print-ready documents with proper formatting</li>
                    <li>• <strong>Custom Options:</strong> Include/exclude chapter numbers, project info</li>
                    <li>• <strong>Page Breaks:</strong> Automatic chapter separation</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">AI Detection</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Authenticity Testing:</strong> Verify human-written content</li>
                    <li>• <strong>Percentage Scores:</strong> Human vs AI likelihood analysis</li>
                    <li>• <strong>Pass/Fail Indicators:</strong> Publishing readiness assessment</li>
                    <li>• <strong>Confidence Ratings:</strong> HIGH, MEDIUM, LOW accuracy levels</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Literary Agent & Editor Finder */}
            <Card id="agent-finder">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-500" />
                  Literary Agent & Editor Finder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">AI-Powered Professional Matching</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Find the perfect literary professionals for your manuscript using advanced AI matching:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Literary Agents:</strong> Discover agents who represent your genre with detailed submission guidelines</li>
                    <li>• <strong>Literary Editors:</strong> Connect with professional editors specializing in fiction and manuscripts</li>
                    <li>• <strong>Publishers:</strong> Find publishers accepting submissions in your genre with contact information</li>
                    <li>• <strong>Smart Matching:</strong> AI analyzes your genre, synopsis, and author background for targeted results</li>
                    <li>• <strong>Match Scores:</strong> See percentage compatibility ratings for each professional</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Comprehensive Search Features</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Multiple Search Types:</strong> Dedicated tabs for agents, editors, and publishers</li>
                    <li>• <strong>Genre-Specific Results:</strong> Search across 25+ genres including Fantasy, Romance, Thriller, and more</li>
                    <li>• <strong>Global Coverage:</strong> Find professionals worldwide with country information displayed</li>
                    <li>• <strong>Load More Results:</strong> Start with 10 results and load additional batches of 10 as needed</li>
                    <li>• <strong>Quality Control:</strong> Automated filtering removes placeholder and fictitious results</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Detailed Professional Profiles</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Contact Information:</strong> Direct website links and email addresses where available</li>
                    <li>• <strong>Specializations:</strong> Genre preferences, client types, and editorial focus areas</li>
                    <li>• <strong>Submission Guidelines:</strong> Specific requirements and processes for each professional</li>
                    <li>• <strong>Recent Work:</strong> Sales history for agents and recent publications for publishers</li>
                    <li>• <strong>Cost & Timeline:</strong> Estimated pricing and turnaround times for editors</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Search Criteria & Matching</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Required Fields:</strong> Genre selection mandatory for all searches</li>
                    <li>• <strong>Agent Search:</strong> Requires book synopsis and accepts author bio, previous publications</li>
                    <li>• <strong>Editor Search:</strong> Specify editing type needed (developmental, copy, line editing)</li>
                    <li>• <strong>Publisher Search:</strong> Focuses on submission policies and accepts unsolicited manuscripts</li>
                    <li>• <strong>AI Analysis:</strong> Contextual matching based on project details and professional expertise</li>
                  </ul>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 italic">
                      💡 Access Agent Finder from any project page to search for professionals in your genre
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-500" />
                  Quick Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="#project-management" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Project Management
                </a>
                <a href="#plot-outliner" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Map className="w-4 h-4 text-indigo-500" />
                  Plot Outliner
                </a>
                <a href="#writing-tools" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Edit3 className="w-4 h-4 text-green-500" />
                  Writing Tools
                </a>
                <a href="#ai-assistant" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Brain className="w-4 h-4 text-purple-500" />
                  AI Assistant
                </a>
                <a href="#agent-finder" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Users className="w-4 h-4 text-pink-500" />
                  Agent & Editor Finder
                </a>
                <a href="#export-publishing" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Download className="w-4 h-4 text-orange-500" />
                  Export & Publishing
                </a>
              </CardContent>
            </Card>
            
            {/* Feature Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Character Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Chapter Organization</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Map className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm">Plot Planning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">AI Writing Assistant</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Writing Statistics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm">Historical Research</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="text-sm">AI Detection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm">Export Options</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips & Tricks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-1">Plan Before You Write</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Use the Plot Outliner to structure your chapters and track story elements before diving into writing.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Maximize AI Assistance</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Provide detailed character and setting information for more contextual AI suggestions.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Efficient Writing</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Use distraction-free mode and set session targets to maintain focus and productivity.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Professional Formatting</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Let the editor handle manuscript formatting automatically - just focus on writing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Getting Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Getting Help
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Need assistance? Try these resources:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Use the AI Assistant for writing questions</li>
                  <li>• Check the Literary Editor for chapter feedback</li>
                  <li>• Access Historical Research for period details</li>
                  <li>• Review Writing Statistics for progress insights</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            MyNovelCraft - Empowering writers with AI-driven creativity and professional tools.
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last updated: January 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}