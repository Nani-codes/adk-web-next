'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { Download, Mic, Video, Paperclip, Send } from "lucide-react";
import dynamic from 'next/dynamic';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  author: string;
  timestamp: number;
  isStreaming?: boolean;
  evalStatus?: number;
  attachments?: Array<{
    file: File;
    url: string;
  }>;
}

interface ChatTabProps {
  className?: string;
}

export function ChatTab({ className }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; url: string }>>([]);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, sessionId, selectedApp } = useWebSocketStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Smooth scrolling to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected || isStreaming) return;

    // Cancel any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      author: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/run_sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          app_name: selectedApp,
          user_id: "user",
          session_id: sessionId,
          new_message: {
            role: "user",
            parts: [{
              text: userMessage.content,
              thought: false,
              inlineData: null,
              fileData: null,
              functionCall: null,
              functionResponse: null,
              executableCode: null,
              codeExecutionResult: null,
              videoMetadata: null
            }]
          },
          streaming: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // Create streaming message
      const streamingMessageId = crypto.randomUUID();
      const streamingMessage: Message = {
        id: streamingMessageId,
        role: 'model',
        content: '',
        author: 'Assistant',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, streamingMessage]);

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

            try {
              const dataStr = trimmedLine.slice(5).trim(); // Remove 'data:' prefix
              if (dataStr === '[DONE]') {
                // Stream completed
                setMessages(prev => prev.map(msg => 
                  msg.id === streamingMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                ));
                return;
              }

              const data = JSON.parse(dataStr);
              
              if (data.error) {
                toast.error(data.error);
                return;
              }

              // Extract content from the response
              const newContent = data.content?.parts?.[0]?.text;
              const isPartial = data.partial;
              const author = data.author || 'Assistant';

              if (newContent !== undefined) {
                setMessages(prev => prev.map(msg => {
                  if (msg.id === streamingMessageId) {
                    return {
                      ...msg,
                      content: newContent,
                      author: author,
                      isStreaming: isPartial !== false,
                    };
                  }
                  return msg;
                }));
              }
              
            } catch (parseError) {
              console.warn('Failed to parse SSE line:', trimmedLine, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Streaming error:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove any incomplete streaming message
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAudioRecording = () => {
    setIsAudioRecording(true);
    toast.info("Audio recording started");
  };

  const stopAudioRecording = () => {
    setIsAudioRecording(false);
    toast.info("Audio recording stopped");
  };

  const startVideoRecording = () => {
    setIsVideoRecording(true);
    toast.info("Video recording started");
  };

  const stopVideoRecording = () => {
    setIsVideoRecording(false);
    toast.info("Video recording stopped");
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium">Chat</h3>
        {isStreaming && (
          <div className="text-xs text-muted-foreground animate-pulse">
            Streaming...
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-full flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-4 max-h-96">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[80%] rounded-lg p-3 transition-all duration-200",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-muted"
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {message.author}
                  </div>
                  <div className={cn(
                    "whitespace-pre-wrap",
                    message.isStreaming && "after:animate-pulse"
                  )}>
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isAudioRecording ? stopAudioRecording : startAudioRecording}
                disabled={isStreaming}
                className={isAudioRecording ? "bg-red-100 text-red-600" : ""}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
                disabled={isStreaming}
                className={isVideoRecording ? "bg-red-100 text-red-600" : ""}
              >
                <Video className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1"
                disabled={!isConnected || isStreaming}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || !isConnected || isStreaming}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}