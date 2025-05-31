'use client'
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { Download } from "lucide-react";

const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

interface Metric {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

interface Evaluation {
  id: string;
  timestamp: string;
  metrics: {
    [key: string]: number;
  };
  summary: string;
}

interface EvalTabProps {
  className?: string;
}

export function EvalTab({ className }: EvalTabProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const { isConnected } = useWebSocketStore();

  const handleRefresh = () => {
    setIsLoading(true);
    // TODO: Implement metrics refresh from WebSocket
    setTimeout(() => {
      setMetrics([
        {
          name: "Response Time",
          value: 245,
          unit: "ms",
          trend: "down",
        },
        {
          name: "Success Rate",
          value: 98.5,
          unit: "%",
          trend: "up",
        },
        {
          name: "Error Rate",
          value: 1.5,
          unit: "%",
          trend: "down",
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const getTrendColor = (trend: Metric["trend"]) => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getTrendIcon = (trend: Metric["trend"]) => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const fetchEvaluations = async () => {
    if (!isConnected) return;

    try {
      const response = await fetch("http://localhost:8000/api/evaluations");
      const data = await response.json();
      setEvaluations(data);
    } catch (error) {
      toast.error("Failed to fetch evaluations");
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, [isConnected]);

  const handleExportEvaluation = async (evaluation: Evaluation) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/evaluations/${evaluation.id}/export`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation_${evaluation.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Evaluation exported successfully");
    } catch (error) {
      toast.error("Failed to export evaluation");
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-2xl font-bold">Evaluation</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              {evaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedEvaluation?.id === evaluation.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  onClick={() => setSelectedEvaluation(evaluation)}
                >
                  <div className="font-medium">
                    {new Date(evaluation.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm opacity-70">{evaluation.summary}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            {selectedEvaluation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Evaluation Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportEvaluation(selectedEvaluation)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Metrics</h4>
                  <div className="bg-muted rounded-lg p-4">
                    <ReactJson
                      src={selectedEvaluation.metrics}
                      theme="monokai"
                      collapsed={1}
                      enableClipboard={false}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="bg-muted rounded-lg p-4">
                    {selectedEvaluation.summary}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an evaluation to view details
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 