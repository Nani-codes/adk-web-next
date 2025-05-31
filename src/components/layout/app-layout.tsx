'use client'
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionTab } from "@/components/session-tab/session-tab";
import { StateTab } from "@/components/state-tab/state-tab";
import { EventTab } from "@/components/event-tab/event-tab";
import { EvalTab } from "@/components/eval-tab/eval-tab";
import { ArtifactTab } from "@/components/artifact-tab/artifact-tab";
import { ChatTab } from "@/components/chat-tab/chat-tab";
import { AppSelector } from "@/components/app-selector/app-selector";
import { useWebSocketStore } from "@/store/websocket-store";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

export function AppLayout() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [showSidePanel, setShowSidePanel] = useState(true);
  const { isConnected, selectedApp } = useWebSocketStore();

  const toggleSidePanel = () => {
    setShowSidePanel(!showSidePanel);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      {/* Left Panel - Session and Navigation */}
      <ResizablePanel 
        defaultSize={20} 
        minSize={18} 
        className={!showSidePanel ? "hidden" : ""}
      >
        <div className="h-full border-r bg-background flex flex-col">
          {/* Header with logo and collapse button */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/adk_favicon.svg" alt="ADK Logo" className="w-8 h-8" />
              <span className="font-medium">Agent Development Kit</span>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleSidePanel}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* App Selection */}
          <div className="p-4 border-b">
            <AppSelector />
          </div>

          {/* Tabs Navigation and Content */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 gap-2">
                  <TabsTrigger value="sessions" className="text-xs">
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
                  <TabsTrigger value="state" className="text-xs">State</TabsTrigger>
                  <TabsTrigger value="artifacts" className="text-xs">Artifacts</TabsTrigger>
                  <TabsTrigger value="eval" className="text-xs">Eval</TabsTrigger>
                </TabsList>

                {/* Tab Content - Scrollable */}
                <div className="mt-4 overflow-auto">
                  <TabsContent value="sessions" className="h-full m-0">
                    <SessionTab />
                  </TabsContent>
                  <TabsContent value="events" className="h-full m-0">
                    <EventTab />
                  </TabsContent>
                  <TabsContent value="state" className="h-full m-0">
                    <StateTab />
                  </TabsContent>
                  <TabsContent value="artifacts" className="h-full m-0">
                    <ArtifactTab />
                  </TabsContent>
                  <TabsContent value="eval" className="h-full m-0">
                    <EvalTab />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </ResizablePanel>

      {/* Expand Panel Button */}
      {!showSidePanel && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidePanel}
          className="absolute left-4 top-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Right Panel - Main Content Area */}
      <ResizableHandle />
      <ResizablePanel defaultSize={80}>
        <div className="h-full p-4">
          {!isConnected ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Not Connected</h2>
                <p className="text-muted-foreground">
                  {selectedApp 
                    ? "Select a session or create a new one to start chatting"
                    : "Select an app first to start chatting"}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Main content area - Chat interface */}
              <div className="flex-1 overflow-auto">
                <ChatTab />
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 