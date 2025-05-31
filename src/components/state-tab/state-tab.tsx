'use client'
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";

const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

interface StateTabProps {
  className?: string;
}

export function StateTab({ className }: StateTabProps) {
  const [state, setState] = useState<any>(null);
  const { isConnected } = useWebSocketStore();
  const [isLoading, setIsLoading] = useState(false);

  const fetchState = async () => {
    if (!isConnected) return;

    try {
      const response = await fetch("http://localhost:8000/api/state");
      const data = await response.json();
      setState(data);
    } catch (error) {
      toast.error("Failed to fetch state");
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchState().finally(() => setIsLoading(false));
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-2xl font-bold">State</h2>
        <Button onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {state ? (
          <div className="bg-muted rounded-lg p-4">
            <ReactJson
              src={state}
              theme="monokai"
              collapsed={1}
              enableClipboard={false}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {isConnected ? "Loading state..." : "Connect to a session to view state"}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 