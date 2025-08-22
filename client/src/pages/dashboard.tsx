import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type Project, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BookOpen, User, Settings, Clock, FileText, Target, LogOut, Upload } from "lucide-react";

export default function Dashboard() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Debug logging
  console.log("Dashboard - isLoading:", isLoading, "projects:", projects, "error:", error);

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
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgress = (wordCount: number, target: number) => {
    return target > 0 ? Math.min((wordCount / target) * 100, 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

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
            
            <div className="flex items-center gap-3">
              <Link href="/documentation">
                <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-primary">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Documentation
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {(user as any)?.firstName || (user as any)?.email?.split('@')[0] || 'Writer'}
                  </p>
                  <p className="text-xs text-neutral-400">Novel Writer</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Welcome back</h2>
          <p className="text-neutral-600">Continue writing your stories or start a new project.</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-3">
          <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new novel project with your story details and target word count.
                </DialogDescription>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timePeriod">Time Period (Optional)</Label>
                    <Input
                      id="timePeriod"
                      {...form.register("timePeriod")}
                      placeholder="e.g., 1840s, Medieval, 1971"
                    />
                  </div>
                  <div>
                    <Label htmlFor="setting">Setting (Optional)</Label>
                    <Input
                      id="setting"
                      {...form.register("setting")}
                      placeholder="e.g., London, Rural Ireland, Paris"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="genre">Genre (Optional)</Label>
                  <Input
                    id="genre"
                    {...form.register("genre")}
                    placeholder="e.g., Historical Fiction, Drama, Romance"
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
          
          <Link href="/import">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Restore Stories
            </Button>
          </Link>
        </div>

        {/* Stories Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Stories</h3>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neutral-600">Loading your projects...</p>
          </div>
        ) : error ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Projects</h3>
              <p className="text-neutral-600 mb-4">{error.message}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !projects || projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">No projects yet</h3>
              <p className="text-neutral-600 mb-4">Create your first novel project or restore from backup files.</p>
              <div className="flex gap-3 justify-center">
                <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Link href="/import">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Stories
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const progress = getProgress(project.wordCount || 0, project.targetWordCount || 50000);
              
              return (
                <Link key={project.id} href={`/writer/${project.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      {project.description && (
                        <p className="text-sm text-neutral-600 line-clamp-2">{project.description}</p>
                      )}
                      {(project.timePeriod || project.setting) && (
                        <div className="flex gap-2 mt-2">
                          {project.timePeriod && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                              {project.timePeriod}
                            </span>
                          )}
                          {project.setting && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {project.setting}
                            </span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-neutral-600">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{project.wordCount || 0} words</span>
                          </div>
                          {project.targetWordCount && (
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              <span>Goal: {project.targetWordCount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {project.targetWordCount && (
                          <div>
                            <div className="flex justify-between text-xs text-neutral-500 mb-1">
                              <span>Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Last Modified */}
                        <div className="flex items-center gap-1 text-xs text-neutral-400">
                          <Clock className="w-3 h-3" />
                          <span>Updated {formatDate(project.updatedAt!)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
