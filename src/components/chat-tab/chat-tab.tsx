'use client';
import { useState, useRef, useEffect } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, sessionId, selectedApp } = useWebSocketStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentStreamingMessage = useRef<Message | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      author: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

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
      });

      if (!response.ok) throw new Error('Failed to send message');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const streamingMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        content: '',
        author: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      currentStreamingMessage.current = streamingMessage;
      setMessages(prev => [...prev, streamingMessage]);

      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = chunk.split(/\r?\n/).filter(line => line.startsWith('data:'));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace(/^data:\s*/, ''));
            if (data.error) {
              toast.error(data.error);
              return;
            }

            const newChunk = data.content?.parts?.[0]?.text;
            if (newChunk != null) {
              // Only append new chunks
              if (data.partial) {
                accumulatedContent += newChunk;
              } else {
                // Final full message might be repeated — only overwrite if different
                if (newChunk !== accumulatedContent) {
                  accumulatedContent = newChunk;
                }
              }
            
              setMessages(prev => prev.map(msg => {
                if (msg.id === currentStreamingMessage.current?.id) {
                  return {
                    ...msg,
                    content: accumulatedContent,
                    author: data.author || 'Assistant',
                    isStreaming: data.partial ?? false,
                  };
                }
                return msg;
              }));
            }
            
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }

      // Final update to remove streaming state
      setMessages(prev => prev.map(msg => {
        if (msg.id === currentStreamingMessage.current?.id) {
          return {
            ...msg,
            isStreaming: false,
          };
        }
        return msg;
      }));
      currentStreamingMessage.current = null;

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

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
      </CardHeader>
      <CardContent>
        <div className="h-full flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[80%] rounded-lg p-3",
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
                    message.isStreaming && "animate-pulse"
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
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isAudioRecording ? stopAudioRecording : startAudioRecording}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
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
                disabled={!isConnected}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || !isConnected}
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
