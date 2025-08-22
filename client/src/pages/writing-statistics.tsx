import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { type Project, type Chapter } from "@shared/schema";
import { ArrowLeft, BarChart3, Target, Calendar, Clock, TrendingUp, FileText, Zap } from "lucide-react";

export default function WritingStatistics() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Use metadata endpoint - only need titles and word counts for statistics  
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/projects", projectId, "chapters", "metadata"],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,  // 5 minutes aggressive caching
    gcTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const totalWords = project.wordCount || 0;
  const targetWords = project.targetWordCount || 50000;
  const progress = targetWords > 0 ? Math.min((totalWords / targetWords) * 100, 100) : 0;
  const wordsRemaining = Math.max(targetWords - totalWords, 0);
  
  // Calculate average words per chapter
  const chaptersWithContent = chapters.filter(ch => (ch.wordCount || 0) > 0);
  const averageWordsPerChapter = chaptersWithContent.length > 0 
    ? Math.round(totalWords / chaptersWithContent.length) 
    : 0;

  // Find longest and shortest chapters
  const longestChapter = chapters.reduce((longest, current) => 
    (current.wordCount || 0) > (longest.wordCount || 0) ? current : longest, 
    chapters[0] || { title: "N/A", wordCount: 0 }
  );
  
  const shortestChapter = chapters.filter(ch => (ch.wordCount || 0) > 0)
    .reduce((shortest, current) => 
      (current.wordCount || 0) < (shortest.wordCount || 0) ? current : shortest, 
      chaptersWithContent[0] || { title: "N/A", wordCount: 0 }
    );

  // Calculate estimated completion based on recent progress (mock data for demo)
  const dailyAverageWords = 500; // Could be calculated from actual writing sessions
  const daysToCompletion = wordsRemaining > 0 ? Math.ceil(wordsRemaining / dailyAverageWords) : 0;

  // Calculate writing streak (mock data for demo)
  const writingStreak = 5; // Could be calculated from actual writing sessions

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href={`/writer/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Writing Statistics</h1>
              <p className="text-neutral-600 mt-1">{project.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Statistics Dashboard */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Total Words
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-800">
                {totalWords.toLocaleString()}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                {chapters.length} chapters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-800">
                {progress.toFixed(1)}%
              </div>
              <Progress value={progress} className="mt-2" />
              <p className="text-sm text-neutral-500 mt-2">
                {wordsRemaining.toLocaleString()} words remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Writing Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-800">
                {writingStreak}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                days in a row
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Est. Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-800">
                {daysToCompletion}
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                days at current pace
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chapter Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Chapter Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                  <span className="font-medium">Average per chapter</span>
                  <Badge variant="secondary">
                    {averageWordsPerChapter.toLocaleString()} words
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">Longest Chapter</p>
                      <p className="text-sm text-neutral-600 truncate max-w-40">
                        {longestChapter.title}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {(longestChapter.wordCount || 0).toLocaleString()} words
                    </Badge>
                  </div>
                  
                  {shortestChapter && (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">Shortest Chapter</p>
                        <p className="text-sm text-neutral-600 truncate max-w-40">
                          {shortestChapter.title}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {(shortestChapter.wordCount || 0).toLocaleString()} words
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Writing Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Writing Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Novel Target</span>
                    <span className="text-sm text-neutral-600">
                      {totalWords.toLocaleString()} / {targetWords.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(progress)}%
                    </div>
                    <p className="text-sm text-neutral-600">Complete</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">
                      {dailyAverageWords}
                    </div>
                    <p className="text-sm text-neutral-600">Words/day</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chapter List with Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Chapter Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-2 font-medium text-neutral-600">Chapter</th>
                    <th className="text-right py-3 px-2 font-medium text-neutral-600">Words</th>
                    <th className="text-right py-3 px-2 font-medium text-neutral-600">Progress</th>
                    <th className="text-right py-3 px-2 font-medium text-neutral-600">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((chapter, index) => {
                    const chapterProgress = averageWordsPerChapter > 0 
                      ? Math.min(((chapter.wordCount || 0) / averageWordsPerChapter) * 100, 100)
                      : 0;
                    
                    return (
                      <tr key={chapter.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-neutral-800">
                              {chapter.title}
                            </p>
                            <p className="text-sm text-neutral-500">
                              Chapter {index + 1}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant={chapter.wordCount ? "secondary" : "outline"}>
                            {(chapter.wordCount || 0).toLocaleString()}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="w-20 ml-auto">
                            <Progress value={chapterProgress} className="h-2" />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-neutral-500">
                          {new Date(chapter.updatedAt!).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}