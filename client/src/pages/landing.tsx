import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, User, LogIn, Users, Star, Target, PenTool, Lightbulb, Sparkles, Volume2, Info } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-neutral-800">
                <span className="text-blue-600">My</span>NovelCraft
              </h1>
            </div>
            
            <Button onClick={handleLogin} className="bg-primary hover:bg-primary-dark">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In/Join with Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-neutral-800 mb-4">
            Craft Your Novel with AI-Powered Tools
          </h1>
          <p className="text-lg text-blue-600 italic mb-6">
            "Written by writers for writers"
          </p>
          <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
            MyNovelCraft empowers writers with intelligent assistance, comprehensive tools, and seamless organization. 
            Transform your ideas into compelling stories with our AI-powered writing companion.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary-dark text-lg px-8 py-3">
            <LogIn className="w-5 h-5 mr-3" />
            Start Writing Today
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PenTool className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Rich Text Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Write with our powerful editor featuring auto-save, formatting tools, find/replace, 
                and export capabilities. Open in new tabs for multi-monitor setups.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">AI Writing Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Get intelligent suggestions for plot development, character traits, descriptions, 
                and dialogue. Our AI Literary Editor provides comprehensive chapter analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Character Development</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Create detailed character profiles with visual timelines, relationship mapping, 
                and development tracking to bring your characters to life.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Set word count goals, track your progress, and stay motivated with detailed 
                writing statistics and session targets.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Historical Research</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Access period-specific historical context including daily life, politics, 
                technology, and culture to enrich your historical fiction.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl">Export & Backup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Export your work to MS Word or PDF formats. Backup and restore your stories 
                with our comprehensive content management system.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">AI Audiobook Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Transform your novels into professional audiobooks with OpenAI's premium voices. 
                Choose from 6 high-quality voices with Standard and HD quality options.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle className="text-xl">Literary Agent & Editor Finder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                AI-powered search for literary agents, editors, and publishers worldwide. 
                Get matched with professionals by genre, with contact details and submission guidelines.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tagline */}
        <div className="text-center">
          <p className="text-lg text-neutral-600 italic">
            "Written by writers for writers"
          </p>
        </div>

        {/* Pricing Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-neutral-800 mb-12">
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Free Plan */}
            <Card className="relative border-2 border-neutral-200">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl mb-2">Free</CardTitle>
                <div className="text-3xl font-bold text-neutral-800 mb-1">$0</div>
                <p className="text-neutral-600 text-sm">Try before you buy</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Basic AI Assistance</span>
                      <p className="text-xs text-gray-500">10 queries per month</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Rich Text Editor</span>
                      <p className="text-xs text-gray-500">Auto-save, formatting tools</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Export Options</span>
                      <p className="text-xs text-gray-500">PDF, Word, plain text</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Project Management</span>
                      <p className="text-xs text-gray-500">Organize chapters & scenes</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleLogin} className="w-full mt-4 text-sm">
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Basic Plan */}
            <Card className="relative border-2 border-blue-200 scale-105">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl mb-2">Basic</CardTitle>
                <div className="text-3xl font-bold text-neutral-800 mb-1">$7</div>
                <p className="text-neutral-600 text-sm">per month</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">AI Audiobooks</span>
                      <p className="text-xs text-gray-500">100k chars (~2.5 hours audio)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">6 Premium Voices</span>
                      <p className="text-xs text-gray-500">OpenAI's high-quality TTS</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">AI Writing Assistant</span>
                      <p className="text-xs text-gray-500">100 queries per month</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Character Tools</span>
                      <p className="text-xs text-gray-500">Development & research</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleLogin} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-sm">
                  Start Basic Plan
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-2 border-purple-200">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl mb-2">Premium</CardTitle>
                <div className="text-3xl font-bold text-neutral-800 mb-1">$15</div>
                <p className="text-neutral-600 text-sm">per month</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">2x More Audiobooks</span>
                      <p className="text-xs text-gray-500">200k chars (~5 hours audio)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">HD Audio Quality</span>
                      <p className="text-xs text-gray-500">Crystal clear, studio-grade voices</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Advanced AI Tools</span>
                      <p className="text-xs text-gray-500">Literary analysis & ghostwriter</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Translation Services</span>
                      <p className="text-xs text-gray-500">Multi-language support</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleLogin} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-sm">
                  Start Premium Plan
                </Button>
              </CardContent>
            </Card>

            {/* Studio Plan */}
            <Card className="relative border-2 border-gold-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Professional
                </span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full cursor-help transition-colors">
                    <Info className="w-4 h-4 text-yellow-600" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-900">Studio Plan Value</h4>
                    <div className="text-xs text-gray-600 space-y-2">
                      <div>
                        <p><strong>Volume Pricing:</strong> 2.5x more audio (12 vs 5 hours) for only 2.3x the price</p>
                      </div>
                      <div>
                        <p><strong>HD Quality Included:</strong> No per-use charges for premium audio quality</p>
                        <p className="text-gray-500 mt-1">Heavy HD users save money with Studio's flat rate</p>
                      </div>
                      <div>
                        <p><strong>Full Translation Suite:</strong> 5x more translation capacity (250k vs 50k chars)</p>
                      </div>
                      <div>
                        <p><strong>Best for:</strong> Authors and content creators who produce audiobooks regularly and want predictable costs without usage limits</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl mb-2">Studio</CardTitle>
                <div className="text-3xl font-bold text-neutral-800 mb-1">$35</div>
                <p className="text-neutral-600 text-sm">for professionals</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">5x More Audiobooks</span>
                      <p className="text-xs text-gray-500">500k chars (~12 hours audio)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">HD Quality Included</span>
                      <p className="text-xs text-gray-500">No extra charges for HD audio</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Full Translation Suite</span>
                      <p className="text-xs text-gray-500">250k chars multi-language</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Priority Support</span>
                      <p className="text-xs text-gray-500">Direct line to our team</p>
                    </div>
                  </div>
                </div>
                <Button onClick={handleLogin} className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white text-sm">
                  Start Studio Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-neutral-800 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What is MyNovelCraft?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  MyNovelCraft is an AI-powered novel writing platform designed to help writers craft compelling stories. 
                  We provide intelligent writing assistance, comprehensive tools, and seamless organization to transform your ideas into finished novels.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Does MyNovelCraft write books for me?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  No, MyNovelCraft is a tool designed for writers to write their own stories. While we provide AI assistance to help overcome writer's block and offer suggestions for plot development, character details, and dialogue improvements, the creative work remains entirely yours. Our AI Ghostwriter feature can also help stir your creative juices by generating draft content based on your ideas, but you remain in full control to edit, refine, and make it your own. Think of our AI as an intelligent writing companion that helps spark ideas and provides feedback, but you are always the author crafting your unique narrative.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does the AI writing assistant work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Our AI uses advanced language models to provide contextual suggestions for plot development, character traits, dialogue, 
                  and descriptions. It analyzes your existing content to offer relevant, personalized assistance that maintains your unique voice and style.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I export my work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Yes! You can export your novels to popular formats including MS Word (.docx) and PDF. 
                  Your work is always yours, and you can download it at any time.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's included in the Free plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  The Free plan includes 10 AI queries per month, basic writing tools, and export capabilities. 
                  It's perfect for trying out the platform and getting started with your first novel.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my writing secure and private?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Absolutely. Your stories and personal information are encrypted and stored securely. 
                  We never share your writing with third parties, and you maintain full ownership of all your creative work.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel my subscription anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Yes, you can cancel your subscription at any time. You'll continue to have access to premium features 
                  until the end of your current billing period, and your data will remain accessible.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-8 bg-white rounded-lg border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">
            Ready to Transform Your Writing?
          </h2>
          <p className="text-neutral-600 mb-6">
            Join thousands of writers who have discovered the power of AI-assisted storytelling.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary-dark">
            <User className="w-5 h-5 mr-3" />
            Sign In with Google and Start Writing
          </Button>
        </div>
      </main>
    </div>
  );
}