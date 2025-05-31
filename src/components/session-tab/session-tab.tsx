'use client'
import { useState } from "react";
import { useWebSocketStore } from "@/store/websocket-store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Session {
  id: string;
  timestamp: string;
  title: string;
}

export function SessionTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const { isConnected, selectedApp, connect } = useWebSocketStore();

  const createNewSession = () => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      title: `Session ${sessions.length + 1}`
    };
    setSessions([newSession, ...sessions]);
    // Connect to the new session
    if (selectedApp) {
      connect(newSession.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={createNewSession}
          disabled={!selectedApp}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors ${
                isConnected && session.id === useWebSocketStore.getState().sessionId
                  ? 'bg-accent border-primary'
                  : 'border-border'
              }`}
              onClick={() => connect(session.id)}
            >
              <div className="font-medium">{session.title}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(session.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No sessions yet. Create a new session to get started.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 