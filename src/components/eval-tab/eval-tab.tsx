'use client'
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EvalResult {
  id: string;
  question: string;
  answer: string;
  expectedAnswer: string;
  score: number;
  feedback: string;
  timestamp: number;
}

interface EvalSet {
  id: string;
  name: string;
  results: EvalResult[];
}

interface EvalTabProps {
  className?: string;
}

export function EvalTab({ className }: EvalTabProps) {
  const [evalSets, setEvalSets] = useState<EvalSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const { selectedApp } = useWebSocketStore();

  useEffect(() => {
    if (selectedApp) {
      fetchEvalSets();
    }
  }, [selectedApp]);

  const fetchEvalSets = async () => {
    try {
      const response = await fetch(`/api/eval-sets?app=${selectedApp}`);
      if (!response.ok) throw new Error('Failed to fetch evaluation sets');
      const data = await response.json();
      setEvalSets(data);
      if (data.length > 0) {
        setSelectedSet(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching evaluation sets:', error);
      toast.error('Failed to load evaluation sets');
    }
  };

  const handleSetChange = (value: string) => {
    setSelectedSet(value);
    setSelectedResults(new Set());
  };

  const toggleResult = (resultId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const getCurrentSet = () => {
    return evalSets.find(set => set.id === selectedSet);
  };

  const exportSelectedResults = () => {
    const currentSet = getCurrentSet();
    if (!currentSet) return;

    const selectedEvalResults = currentSet.results.filter(result => 
      selectedResults.has(result.id)
    );

    const exportData = {
      app: selectedApp,
      evalSet: currentSet.name,
      results: selectedEvalResults,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-results-${currentSet.name}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium">Evaluation</h3>
        <div className="flex items-center space-x-2">
          <Select value={selectedSet} onValueChange={handleSetChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select evaluation set" />
            </SelectTrigger>
            <SelectContent>
              {evalSets.map(set => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportSelectedResults}
            disabled={selectedResults.size === 0}
          >
            Export Selected
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {getCurrentSet()?.results.map((result) => (
              <div
                key={result.id}
                className="flex items-start space-x-4 p-4 border rounded-lg"
              >
                <Checkbox
                  id={result.id}
                  checked={selectedResults.has(result.id)}
                  onCheckedChange={() => toggleResult(result.id)}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={result.id} className="font-medium">
                      Question
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      Score: {result.score}
                    </span>
                  </div>
                  <p className="text-sm">{result.question}</p>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Answer</Label>
                    <p className="text-sm">{result.answer}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Expected Answer</Label>
                    <p className="text-sm">{result.expectedAnswer}</p>
                  </div>
                  {result.feedback && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Feedback</Label>
                      <p className="text-sm">{result.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 