'use client'
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

interface Event {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

interface EventTabProps {
  className?: string;
}

export function EventTab({ className }: EventTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { isConnected } = useWebSocketStore();
  const pageSize = 10;

  const fetchEvents = async () => {
    if (!isConnected) return;

    try {
      const response = await fetch(
        `http://localhost:8000/events?page=${page}&size=${pageSize}`
      );
      const data = await response.json();
      setEvents(data.events);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (error) {
      toast.error("Failed to fetch events");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, isConnected]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-2xl font-bold">Events</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedEvent?.id === event.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="font-medium">{event.type}</div>
                  <div className="text-sm opacity-70">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Event Details</h3>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data</h4>
                  <div className="bg-muted rounded-lg p-4">
                    <ReactJson
                      src={selectedEvent.data}
                      theme="monokai"
                      collapsed={1}
                      enableClipboard={false}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an event to view details
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 