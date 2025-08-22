import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, PenTool, Users, Brain, FileText } from "lucide-react";
import { Link } from "wouter";

export default function LandingPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation */}
      <nav className="flex justify-between p-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Link href="/documentation">
          <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            <FileText className="w-4 h-4 mr-2" />
            Documentation
          </Button>
        </Link>
      </nav>
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              <span className="text-blue-600">My</span>NovelCraft
            </h1>
          </div>
          <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mb-2">
            Written by writers for writers
          </p>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your AI-powered companion for crafting compelling novels. Organize your thoughts, develop characters, and bring your stories to life.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <PenTool className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Smart Writing Tools</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Rich text editor with auto-save, word count tracking, and intelligent formatting suggestions.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <Users className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Character Development</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Create detailed character profiles with traits, backstories, and relationship mapping.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <Brain className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI Writing Assistant</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get contextual writing suggestions, plot ideas, and creative inspiration powered by AI.
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Choose Your Plan</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                 onClick={() => window.location.href = '/dashboard'}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">Free</h3>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400">$0</div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                <li>• 10 AI queries per month</li>
                <li>• Basic writing tools</li>
                <li>• Character development</li>
                <li>• Project management</li>
              </ul>
              <div className="text-xs text-gray-500 mb-4">Perfect for trying out MyNovelCraft</div>
              <Button className="w-full" variant="outline">
                Continue with Free
              </Button>
            </div>

            {/* Basic Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-500 hover:border-blue-600 hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:scale-105"
                 onClick={() => window.location.href = '/subscription?plan=basic'}>
              <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block group-hover:bg-blue-600">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">Basic</h3>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400">$9.99<span className="text-sm font-normal">/month</span></div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                <li>• 100 AI queries per month</li>
                <li>• All writing tools</li>
                <li>• Advanced character development</li>
                <li>• Export capabilities</li>
              </ul>
              <div className="text-xs text-gray-500 mb-4">Ideal for regular writers</div>
              <Button className="w-full">
                Upgrade to Basic
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                 onClick={() => window.location.href = '/subscription?plan=pro'}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400">Pro</h3>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400">$19.99<span className="text-sm font-normal">/month</span></div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                <li>• 1,000 AI queries per month</li>
                <li>• Priority AI responses</li>
                <li>• Advanced analytics</li>
                <li>• Premium features</li>
              </ul>
              <div className="text-xs text-gray-500 mb-4">For serious novelists</div>
              <Button className="w-full" variant="outline">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">What's included in the free plan?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                The free plan includes 10 AI queries per month, access to our basic writing tools, character development features, and project management. Perfect for trying out MyNovelCraft and getting started with your first novel.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">How do AI queries work?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI queries power our intelligent writing assistance including plot suggestions, character development, dialogue help, and our Literary Editor. Each interaction with our AI Writing Assistant, Ghostwriter, or Writer Consultant counts as one query.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Can I upgrade or downgrade my plan anytime?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! You can upgrade or downgrade your subscription at any time. Changes take effect immediately, and you'll only be charged the prorated difference for upgrades. You can also cancel your account at any time with no cancellation fees or penalties.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">How are payments processed?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                All payments are securely processed through PayPal, ensuring your financial information is protected with industry-leading security standards. You can pay with your PayPal account or any major credit/debit card through PayPal's secure checkout.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">What export formats are supported?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                MyNovelCraft supports exporting your manuscripts to PDF and Microsoft Word (DOCX) formats, with professional formatting suitable for submission to agents and publishers.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Is my work secure and private?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Absolutely. Your manuscripts and data are stored securely with encryption. Only you have access to your work, and we never share or use your content for any purpose other than providing our services to you.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Do I need technical experience to use MyNovelCraft?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Not at all! MyNovelCraft is designed for writers, not programmers. Our intuitive interface makes it easy to organize your ideas, develop characters, and write your novel without any technical knowledge required.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Writing?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start with our free plan and upgrade anytime. No credit card required to begin.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              Join thousands of writers crafting their stories with AI-powered assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}