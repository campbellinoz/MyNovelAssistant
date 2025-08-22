import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Play, Volume2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Audiobook } from "@shared/schema";

interface AudiobookListProps {
  projectId: string;
  children: React.ReactNode;
}

export default function AudiobookList({ projectId, children }: AudiobookListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: audiobooks = [], isLoading } = useQuery<Audiobook[]>({
    queryKey: ['/api/projects', projectId, 'audiobooks'],
    enabled: isOpen
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (audiobook: Audiobook) => {
    try {
      const response = await fetch(`/api/audiobooks/${audiobook.id}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from response headers or use title
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${(audiobook.title || 'audiobook').replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      
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
        title: "Download Started",
        description: "Your audiobook download has begun.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your audiobook.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'generating': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Generated Audiobooks
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading audiobooks...
            </div>
          ) : audiobooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audiobooks generated yet.</p>
              <p className="text-sm mt-1">Generate your first audiobook from the export dialog.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audiobooks.map((audiobook: Audiobook) => (
                  <TableRow key={audiobook.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={audiobook.title}>
                      {audiobook.title}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{audiobook.voice}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {audiobook.model === 'tts-1-hd' ? 'HD' : 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(audiobook.status)}>
                        {audiobook.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {audiobook.duration ? formatDuration(audiobook.duration) : '-'}
                    </TableCell>
                    <TableCell>
                      {audiobook.fileSize ? formatFileSize(audiobook.fileSize) : '-'}
                    </TableCell>
                    <TableCell>
                      {audiobook.createdAt ? new Date(audiobook.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {audiobook.status === 'completed' && audiobook.filePath ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(audiobook)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      ) : audiobook.status === 'generating' ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          {audiobook.completedChapters}/{audiobook.totalChapters}
                        </div>
                      ) : audiobook.status === 'failed' ? (
                        <span className="text-sm text-red-600">
                          {audiobook.error || 'Generation failed'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}