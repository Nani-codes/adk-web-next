'use client'
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocketStore } from "@/store/websocket-store";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";

interface Artifact {
  id: string;
  name: string;
  type: string;
  size: number;
  timestamp: string;
  url: string;
}

interface ArtifactTabProps {
  className?: string;
}

export function ArtifactTab({ className }: ArtifactTabProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const { isConnected } = useWebSocketStore();

  const fetchArtifacts = async () => {
    if (!isConnected) return;

    try {
      const response = await fetch("http://localhost:8000/api/artifacts");
      const data = await response.json();
      setArtifacts(data);
    } catch (error) {
      toast.error("Failed to fetch artifacts");
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, [isConnected]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/artifacts", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("File uploaded successfully");
        fetchArtifacts();
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    }
  };

  const handleDeleteArtifact = async (artifact: Artifact) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/artifacts/${artifact.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Artifact deleted successfully");
        fetchArtifacts();
      } else {
        toast.error("Failed to delete artifact");
      }
    } catch (error) {
      toast.error("Failed to delete artifact");
    }
  };

  const handleDownloadArtifact = async (artifact: Artifact) => {
    try {
      const response = await fetch(artifact.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = artifact.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download artifact");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-2xl font-bold">Artifacts</h2>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={!isConnected}
          />
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              size="sm"
              disabled={!isConnected}
              className="cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {artifacts.length > 0 ? (
            <div className="grid gap-4">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">{artifact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(artifact.size)} •{" "}
                      {new Date(artifact.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadArtifact(artifact)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteArtifact(artifact)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {isConnected
                ? "No artifacts found"
                : "Connect to a session to view artifacts"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 