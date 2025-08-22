import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, ArrowLeft, Save } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ImportContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<'upload' | 'review' | 'import'>('upload');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Chapter 1');
  const [importProgress, setImportProgress] = useState(0);

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return await response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      return project;
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async ({ projectId, chapterData }: { projectId: string; chapterData: any }) => {
      const payload = { 
        projectId, 
        title: chapterData.title,
        content: chapterData.content,
        order: chapterData.order
      };
      
      const response = await apiRequest('POST', '/api/chapters', payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setStep('review');
      
      // Try to extract title from content
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length < 100) {
          setProjectTitle(firstLine);
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteContent = () => {
    if (content.trim()) {
      setStep('review');
    }
  };

  const handleImport = async () => {
    if (!projectTitle.trim() || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both project title and content",
        variant: "destructive",
      });
      return;
    }

    setStep('import');
    setImportProgress(0);

    try {
      // Create project
      setImportProgress(25);
      const projectResponse = await createProjectMutation.mutateAsync({
        title: projectTitle,
        description: projectDescription,
        targetWordCount: 90000,
      });

      console.log('Project creation response:', projectResponse);
      const projectId = projectResponse?.id;

      if (!projectId) {
        console.error('Missing project ID in response:', projectResponse);
        throw new Error("Failed to get project ID from response");
      }

      // Create chapter
      setImportProgress(75);
      await createChapterMutation.mutateAsync({
        projectId: projectId,
        chapterData: {
          title: chapterTitle,
          content: content,
          order: 1,
        },
      });

      setImportProgress(100);
      
      toast({
        title: "Import Successful",
        description: `"${projectTitle}" has been restored successfully`,
      });

      // Redirect to projects
      setTimeout(() => {
        setLocation('/');
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to restore content. Please try again.",
        variant: "destructive",
      });
      setStep('review');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Restore Your Stories</h1>
        </div>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Story File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select your downloaded story file</Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.docx,.doc"
                    onChange={handleFileUpload}
                    className="block w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="paste-content">Paste your story content directly</Label>
                  <Textarea
                    id="paste-content"
                    placeholder="Paste your story content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="mt-2"
                  />
                  <Button 
                    onClick={handlePasteContent}
                    disabled={!content.trim()}
                    className="mt-2"
                  >
                    Continue with Pasted Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Review Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Enter project title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="project-description">Project Description (Optional)</Label>
                  <Textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Brief description of your story"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="chapter-title">First Chapter Title</Label>
                  <Input
                    id="chapter-title"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Content Preview</Label>
                  <div className="mt-2 p-4 border rounded-md bg-muted/50 max-h-40 overflow-y-auto">
                    <p className="text-sm text-muted-foreground">
                      {content.length} characters • {content.split(/\s+/).filter(w => w.length > 0).length} words
                    </p>
                    <p className="mt-2 text-sm">
                      {content.substring(0, 300)}
                      {content.length > 300 && '...'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button onClick={handleImport}>
                    <Save className="w-4 h-4 mr-2" />
                    Restore Story
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'import' && (
          <Card>
            <CardHeader>
              <CardTitle>Importing Your Story</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={importProgress} className="w-full" />
                <p className="text-center text-muted-foreground">
                  {importProgress < 25 && "Preparing import..."}
                  {importProgress >= 25 && importProgress < 75 && "Creating project..."}
                  {importProgress >= 75 && importProgress < 100 && "Saving content..."}
                  {importProgress === 100 && "Import complete! Redirecting..."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}