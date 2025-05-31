import { create } from "zustand";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  evalStatus?: number;
  attachments?: Array<{
    file: File;
    url: string;
  }>;
  thought?: boolean;
  renderedContent?: string;
  actualInvocationToolUses?: any[];
  expectedInvocationToolUses?: any[];
}

interface WebSocketState {
  isConnected: boolean;
  sessionId: string | null;
  messages: Message[];
  availableApps: string[];
  selectedApp: string | null;
  isLoading: boolean;
  fetchApps: () => Promise<void>;
  selectApp: (appName: string) => void;
  connect: (sessionId: string) => void;
  disconnect: () => void;
  sendMessage: (message: Message) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  sessionId: null,
  messages: [],
  availableApps: [],
  selectedApp: null,
  isLoading: false,

  fetchApps: async () => {
    try {
      set({ isLoading: true });
      const response = await fetch('/list-apps');
      if (!response.ok) {
        throw new Error('Failed to fetch apps');
      }
      const apps = await response.json();
      set({ availableApps: apps, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      toast.error('Failed to fetch available apps');
      set({ isLoading: false });
    }
  },

  selectApp: (appName: string) => {
    set({ selectedApp: appName });
  },

  connect: async (sessionId: string) => {
    try {
      const selectedApp = get().selectedApp;
      if (!selectedApp) {
        throw new Error('Please select an app first');
      }

      // Create a new session if one doesn't exist
      const response = await fetch(`/apps/${selectedApp}/users/user/sessions/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      set({ isConnected: true, sessionId });
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
    }
  },

  disconnect: () => {
    set({ isConnected: false, sessionId: null, messages: [] });
  },

  sendMessage: async (message: Message) => {
    try {
      const sessionId = get().sessionId;
      const selectedApp = get().selectedApp;
      
      if (!sessionId) {
        throw new Error('No active session');
      }
      if (!selectedApp) {
        throw new Error('No app selected');
      }

      const response = await fetch('/run_sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          app_name: selectedApp,
          user_id: 'user',
          session_id: sessionId,
          new_message: {
            role: 'user',
            parts: [
              {
                text: message.content
              }
            ]
          },
          streaming: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const readChunk = async () => {
        const { done, value } = await reader.read();
        
        if (done) {
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split(/\r?\n/).filter(line => line.startsWith('data:'));

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '');
          try {
            const parsedData = JSON.parse(data);
            if (parsedData.content) {
              const newMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: parsedData.content.parts[0].text || '',
                timestamp: new Date().toISOString(),
                evalStatus: parsedData.evalStatus,
                thought: parsedData.thought,
                renderedContent: parsedData.renderedContent,
                actualInvocationToolUses: parsedData.actualInvocationToolUses,
                expectedInvocationToolUses: parsedData.expectedInvocationToolUses,
              };
              set((state) => ({
                messages: [...state.messages, newMessage],
              }));
            }
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        }

        readChunk();
      };

      readChunk();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },
})); 