import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, Bell, Sparkles } from "lucide-react";

export default function ProductionLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-neutral-800">
                <span className="text-blue-600">My</span>NovelCraft
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Clock className="w-12 h-12 text-blue-600" />
          </div>
          
          <h1 className="text-5xl font-bold text-neutral-800 mb-6">
            Coming Soon
          </h1>
          
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            MyNovelCraft is putting the finishing touches on the ultimate AI-powered novel writing platform. 
            We're almost ready to help you transform your ideas into compelling stories.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Final preparations in progress
          </div>
        </div>

        {/* What's Coming */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card className="text-center border-2 border-blue-100">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">AI Writing Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Get intelligent suggestions for plot development, character traits, and dialogue 
                from our advanced AI literary companion.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-green-100">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Rich Writing Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                Comprehensive editor with auto-save, formatting tools, character development, 
                and export capabilities for professional manuscripts.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notification Card */}
        <div className="text-center p-8 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <Bell className="w-8 h-8 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">
            Be the First to Know
          </h2>
          <p className="text-neutral-600 mb-6">
            We're putting the final touches on MyNovelCraft and will be launching very soon. 
            Thank you for your patience as we prepare to deliver the best possible writing experience.
          </p>
          <p className="text-sm text-neutral-500 italic">
            "Written by writers for writers"
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-neutral-500 text-sm">
        <p>&copy; 2025 MyNovelCraft. All rights reserved.</p>
      </footer>
    </div>
  );
}