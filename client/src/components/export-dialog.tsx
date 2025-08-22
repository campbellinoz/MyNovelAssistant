import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Project } from "@shared/schema";
import { FileText, Download, Loader2, Volume2, History } from "lucide-react";
import AudiobookList from "./audiobook-list";

interface ExportDialogProps {
  project: Project;
  children: React.ReactNode;
}

interface ExportOptions {
  format: 'docx' | 'pdf';
  includeChapterNumbers: boolean;
  includeProjectInfo: boolean;
  pageBreakBetweenChapters: boolean;
}

interface AudiobookOptions {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number;
  model: 'tts-1' | 'tts-1-hd';
}

export default function ExportDialog({ project, children }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<'document' | 'audiobook'>('document');
  const [options, setOptions] = useState<ExportOptions>({
    format: 'docx',
    includeChapterNumbers: true,
    includeProjectInfo: true,
    pageBreakBetweenChapters: true,
  });
  const [audiobookOptions, setAudiobookOptions] = useState<AudiobookOptions>({
    voice: 'alloy',
    speed: 1.0,
    model: 'tts-1'
  });
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (exportOptions: ExportOptions) => {
      const response = await fetch(`/api/projects/${project.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportOptions),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      return response;
    },
    onSuccess: async (response) => {
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.${options.format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: `Your project has been exported as ${filename}`,
      });
      
      setIsOpen(false);
    },
    onError: (error) => {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const audiobookMutation = useMutation({
    mutationFn: async (options: AudiobookOptions) => {
      const response = await apiRequest('POST', `/api/projects/${project.id}/audiobooks`, {
        ...options,
        title: `${project.title} - Audiobook`
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Audiobook Generation Started",
        description: "Your audiobook is being generated. This may take several minutes depending on the length of your content.",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      console.error("Audiobook generation error:", error);
      toast({
        title: "Audiobook Generation Failed", 
        description: "There was an error starting audiobook generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (exportType === 'document') {
      exportMutation.mutate(options);
    } else {
      audiobookMutation.mutate(audiobookOptions);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exportType === 'document' ? <Download className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            {exportType === 'document' ? 'Export Project' : 'Generate Audiobook'}
          </DialogTitle>
          <DialogDescription>
            {exportType === 'document' 
              ? `Export "${project.title}" to Word document or PDF format with customizable options.`
              : `Generate an audiobook version of "${project.title}" using AI text-to-speech technology.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Output Type</Label>
            <RadioGroup
              value={exportType}
              onValueChange={(value: 'document' | 'audiobook') => setExportType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="document" id="document" />
                <Label htmlFor="document" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Document Export (Word/PDF)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="audiobook" id="audiobook" />
                <Label htmlFor="audiobook" className="flex items-center gap-2 cursor-pointer">
                  <Volume2 className="w-4 h-4" />
                  Audiobook Generation
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {exportType === 'document' ? (
            <>
              {/* Document Format Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Export Format</Label>
                <RadioGroup
                  value={options.format}
                  onValueChange={(value: 'docx' | 'pdf') => 
                    setOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="docx" id="docx" />
                    <Label htmlFor="docx" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Microsoft Word (.docx)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      PDF Document (.pdf)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Document Export Options */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Export Options</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProjectInfo"
                      checked={options.includeProjectInfo}
                      onCheckedChange={(checked) =>
                        setOptions(prev => ({ ...prev, includeProjectInfo: !!checked }))
                      }
                    />
                    <Label htmlFor="includeProjectInfo" className="text-sm cursor-pointer">
                      Include project title and description
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeChapterNumbers"
                      checked={options.includeChapterNumbers}
                      onCheckedChange={(checked) =>
                        setOptions(prev => ({ ...prev, includeChapterNumbers: !!checked }))
                      }
                    />
                    <Label htmlFor="includeChapterNumbers" className="text-sm cursor-pointer">
                      Number chapters (Chapter 1, Chapter 2, etc.)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pageBreakBetweenChapters"
                      checked={options.pageBreakBetweenChapters}
                      onCheckedChange={(checked) =>
                        setOptions(prev => ({ ...prev, pageBreakBetweenChapters: !!checked }))
                      }
                    />
                    <Label htmlFor="pageBreakBetweenChapters" className="text-sm cursor-pointer">
                      Start each chapter on a new page
                    </Label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <Volume2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-800 dark:text-blue-200">Audiobook Generation Moved</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Audiobook generation is now available in a dedicated page with enhanced features including chapter selection, 
                cost estimation, and voice previews.
              </p>
              <a 
                href={`/audiobook-generator/${project.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                Open Audiobook Generator
              </a>
            </div>
          )}

          <Separator />

          <Button 
            onClick={handleExport} 
            disabled={exportMutation.isPending || audiobookMutation.isPending}
            className="w-full"
          >
            {(exportMutation.isPending || audiobookMutation.isPending) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {exportType === 'document' ? 'Exporting...' : 'Starting Generation...'}
              </>
            ) : (
              <>
                {exportType === 'document' ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {options.format.toUpperCase()}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generate Audiobook
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}