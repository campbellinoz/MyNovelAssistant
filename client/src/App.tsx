import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoadingProgress from "@/components/loading-progress";
import Landing from "@/pages/landing";
import ProductionLanding from "@/pages/production-landing";
import Dashboard from "@/pages/dashboard";
import Writer from "@/pages/writer";
import PlotOutliner from "@/pages/plot-outliner";
import WritingStatistics from "@/pages/writing-statistics";
import Documentation from "@/pages/documentation";
import TextEditor from "@/pages/text-editor";
import Subscription from "@/pages/subscription";
import PayPalDebug from "@/pages/paypal-debug";
import Admin from "@/pages/admin";
import LandingPreview from "@/pages/landing-preview";
import NotFound from "@/pages/not-found";
import CharacterStoryboard from "@/pages/character-storyboard";
import Support from "@/pages/support";
import ImportContent from "@/pages/import-content";
import AgentFinder from "@/pages/agent-finder";
import AudiobookGenerator from "@/pages/audiobook-generator";
import PremiumUpgrade from "@/pages/premium-upgrade";
import SystemStatus from "@/pages/system-status";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Production is now fully ready - removed coming soon override

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/landing-preview" component={LandingPreview} />
      {/* Show landing page if not authenticated */}
      {!isAuthenticated ? (
        <Route component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/writer/:projectId/:chapterId" component={Writer} />
          <Route path="/writer/:projectId" component={Writer} />
          <Route path="/plot-outliner/:projectId" component={PlotOutliner} />
          <Route path="/writing-statistics/:projectId" component={WritingStatistics} />
          <Route path="/text-editor/:chapterId" component={TextEditor} />
          <Route path="/character-storyboard/:projectId">
            {(params) => <CharacterStoryboard projectId={params.projectId} />}
          </Route>
          <Route path="/agent-finder/:projectId" component={AgentFinder} />
          <Route path="/audiobook-generator/:id" component={AudiobookGenerator} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/premium-upgrade" component={PremiumUpgrade} />
          <Route path="/paypal-debug" component={PayPalDebug} />
          <Route path="/admin" component={Admin} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/support" component={Support} />
          <Route path="/import" component={ImportContent} />
          <Route path="/system-status" component={SystemStatus} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingProgress />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;