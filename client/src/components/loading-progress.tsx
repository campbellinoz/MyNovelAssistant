import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

export default function LoadingProgress() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const isLoading = isFetching > 0 || isMutating > 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading) {
      setIsVisible(true);
      setProgress(0);
      
      // Simulate progress animation
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
    } else {
      // Complete the progress bar quickly when done
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <Progress 
        value={progress} 
        className="h-1 rounded-none border-none"
      />
      <div className="px-4 py-2 text-xs text-muted-foreground text-center bg-background/90">
        {isFetching > 0 && `Loading data... (${isFetching} requests)`}
        {isMutating > 0 && !isFetching && `Saving changes... (${isMutating} operations)`}
      </div>
    </div>
  );
}