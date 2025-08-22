import { useState, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type Project, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { 
  BookOpen, 
  Plus, 
  Users, 
  BarChart3, 
  User, 
  Settings,
  Table,
  Clock,
  Crown,
  CreditCard,
  Shield,
  Palette,
  HelpCircle,
  Sparkles,
  Volume2
} from "lucide-react";

interface SidebarProps {
  currentProject: Project;
  onOpenCharacterModal: () => void;
}

const Sidebar = memo(function Sidebar({ currentProject, onOpenCharacterModal }: SidebarProps) {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Type the user properly
  const typedUser = user as UserType | undefined;

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 5 * 60 * 1000,  // 5 minutes aggressive caching
    gcTime: 15 * 60 * 1000,    // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Fetch subscription status for sidebar display with caching
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: false,    // Disable auto refetch
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsNewProjectOpen(false);
      form.reset();
      toast({
        title: "Project created",
        description: "Your new novel project has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      targetWordCount: 50000,
    },
  });

  const onSubmit = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const projectDate = new Date(date);
    const diffInHours = Math.abs(now.getTime() - projectDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 72) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return projectDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const getProgress = (wordCount: number, target: number) => {
    return target > 0 ? Math.min((wordCount / target) * 100, 100) : 0;
  };

  return (
    <aside className="w-80 bg-white border-r border-neutral-100 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-800">
            <span className="text-blue-600">My</span>NovelCraft
          </h1>
        </div>
        
        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter your novel title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Brief description of your story"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="targetWordCount">Target Word Count</Label>
                <Input
                  id="targetWordCount"
                  type="number"
                  {...form.register("targetWordCount", { valueAsNumber: true })}
                  placeholder="50000"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewProjectOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
            Recent Projects
          </h2>
          
          {projects.map((project) => {
            const isActive = project.id === currentProject.id;
            const progress = getProgress(project.wordCount || 0, project.targetWordCount || 50000);
            
            return (
              <Link key={project.id} href={`/writer/${project.id}`}>
                <div className={`
                  project-item mb-3 p-3 rounded-lg cursor-pointer transition-colors duration-200
                  ${isActive 
                    ? 'bg-neutral-50 border-l-4 border-primary' 
                    : 'hover:bg-neutral-50'
                  }
                `}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-800 truncate">{project.title}</h3>
                      <p className="text-sm text-neutral-400 mt-1">
                        Updated {formatDate(project.updatedAt!)}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-neutral-400">
                          {project.wordCount?.toLocaleString() || 0} words
                        </span>
                        {project.targetWordCount && (
                          <div className="flex-1 bg-neutral-200 rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                      <span className="text-neutral-400">⋯</span>
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Tools */}
        <div className="mt-6">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
            Tools
          </h2>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto"
              onClick={onOpenCharacterModal}
            >
              <Users className="w-4 h-4 mr-3 text-neutral-400" />
              <span className="text-sm text-neutral-600">Character Manager</span>
            </Button>
            <Link href={`/character-storyboard/${currentProject.id}`}>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Palette className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Character Storyboard</span>
              </Button>
            </Link>
            <Link href={`/plot-outliner/${currentProject.id}`}>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Table className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Plot Outliner</span>
              </Button>
            </Link>
            <Link href={`/writing-statistics/${currentProject.id}`}>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <BarChart3 className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Writing Statistics</span>
              </Button>
            </Link>
            <Link href={`/agent-finder/${currentProject.id}`}>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Sparkles className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Agent & Editor Finder</span>
              </Button>
            </Link>
            <Link href={`/audiobook-generator/${currentProject.id}`}>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Volume2 className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Audiobook Generator</span>
{subscriptionStatus && ['free', 'basic'].includes((subscriptionStatus as any)?.tier) ? (
                  <Crown className="w-3 h-3 ml-auto text-purple-500" />
                ) : null}
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <CreditCard className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Subscription</span>
              </Button>
            </Link>
{subscriptionStatus && ['free', 'basic'].includes((subscriptionStatus as any)?.tier) ? (
              <Link href="/premium-upgrade">
                <Button variant="ghost" className="w-full justify-start p-2 h-auto bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                  <Crown className="w-4 h-4 mr-3 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium">Upgrade to Premium</span>
                </Button>
              </Link>
            ) : null}
            {/* PayPal Debug - Only show for admin users */}
            {typedUser?.email === 'campbellinoz@gmail.com' && (
              <Link href="/paypal-debug">
                <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                  <Settings className="w-4 h-4 mr-3 text-neutral-400" />
                  <span className="text-sm text-neutral-600">PayPal Debug</span>
                </Button>
              </Link>
            )}
            <Link href="/support">
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <HelpCircle className="w-4 h-4 mr-3 text-neutral-400" />
                <span className="text-sm text-neutral-600">Support Center</span>
              </Button>
            </Link>
            {/* Admin Dashboard - Only show for admin users */}
            {typedUser?.email === 'campbellinoz@gmail.com' && (
              <Link href="/admin">
                <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                  <Shield className="w-4 h-4 mr-3 text-red-500" />
                  <span className="text-sm text-neutral-600">Admin Dashboard</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
            {typedUser?.email === 'campbellinoz@gmail.com' ? (
              <Crown className="w-4 h-4 text-yellow-500" />
            ) : (
              <User className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate">
              {typedUser?.firstName || typedUser?.email?.split('@')[0] || 'Writer'}
            </p>
            <p className="text-xs text-neutral-400 capitalize">
              {typedUser?.subscriptionTier === 'studio' ? 'Studio Plan' : 
               typedUser?.subscriptionTier === 'premium' ? 'Premium Plan' :
               typedUser?.subscriptionTier === 'basic' ? 'Basic Plan' : 'Free Plan'}
              {typedUser?.email === 'campbellinoz@gmail.com' && ' (Admin)'}
              <span className="ml-1 text-green-500">•</span>
            </p>
            <p className="text-xs text-neutral-300">
              {typedUser?.email === 'campbellinoz@gmail.com' ? 'Unlimited queries' :
               typedUser?.subscriptionTier === 'pro' ? '1000 queries/month' :
               typedUser?.subscriptionTier === 'basic' ? '100 queries/month' : '10 queries/month'}
            </p>
          </div>
          <div className="flex gap-1">
            <Link href="/subscription">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 text-neutral-400" />
              </Button>
            </Link>
            <a href="/api/logout">
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                Logout
              </Button>
            </a>
          </div>
        </div>

      </div>
    </aside>
  );
});

export default Sidebar;
