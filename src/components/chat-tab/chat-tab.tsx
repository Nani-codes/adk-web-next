'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { Download, Mic, Video, Paperclip, Send, Square } from "lucide-react";
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
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, sessionId, selectedApp } = useWebSocketStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentStreamingMessage = useRef<Message | null>(null);
  
  // Media recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopRecording();
    };
  }, []);

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected || isAudioRecording || isVideoRecording) return;

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
      console.error('Streaming error:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove any incomplete streaming message
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
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

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'audio-recording.webm', { type: 'audio/webm' });
        
        // Add the audio file to selected files
        setSelectedFiles(prev => [...prev, {
          file: audioFile,
          url: URL.createObjectURL(audioBlob)
        }]);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsAudioRecording(true);
      startTimer();
      toast.success("Audio recording started");
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Failed to access microphone");
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoFile = new File([videoBlob], 'video-recording.webm', { type: 'video/webm' });
        
        // Add the video file to selected files
        setSelectedFiles(prev => [...prev, {
          file: videoFile,
          url: URL.createObjectURL(videoBlob)
        }]);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsVideoRecording(true);
      startTimer();
      toast.success("Video recording started");
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error("Failed to access camera");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isAudioRecording || isVideoRecording)) {
      mediaRecorderRef.current.stop();
      setIsAudioRecording(false);
      setIsVideoRecording(false);
      stopTimer();
      toast.info("Recording stopped");
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium">Chat</h3>
        {(isAudioRecording || isVideoRecording) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-full flex flex-col">
          {isVideoRecording && (
            <div className="mb-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full max-h-48 rounded-lg"
              />
            </div>
          )}
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
                    message.isStreaming 
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
              >``
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant={isAudioRecording ? "destructive" : "outline"}
                size="icon"
                onClick={isAudioRecording ? stopRecording : startAudioRecording}
              >
                {isAudioRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant={isVideoRecording ? "destructive" : "outline"}
                size="icon"
                onClick={isVideoRecording ? stopRecording : startVideoRecording}
              >
                {isVideoRecording ? <Square className="h-4 w-4" /> : <Video className="h-4 w-4" />}
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
                disabled={!input.trim() && selectedFiles.length === 0 || !isConnected}
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