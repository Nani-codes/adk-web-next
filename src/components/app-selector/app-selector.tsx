import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSocketStore } from '@/store/websocket-store';

export function AppSelector() {
  const { availableApps, selectedApp, isLoading, fetchApps, selectApp } = useWebSocketStore();

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading agents...</div>
      </div>
    );
  }

  if (availableApps.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">
          Failed to load agents. To get started, run <code>adk web</code> in the folder that contains the agents.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <Select
        value={selectedApp || ''}
        onValueChange={selectApp}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an agent" />
        </SelectTrigger>
        <SelectContent>
          {availableApps.map((appName) => (
            <SelectItem key={appName} value={appName}>
              {appName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 