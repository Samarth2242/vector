import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Film } from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";

// API and WebSocket URLs
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8001";

function AnimationRenderer() {
  const [formData, setFormData] = useState({
    input_code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#0a0e17"/>
  <circle cx="400" cy="250" r="50" fill="red">
    <animate attributeName="r" values="50;70;50" dur="2s" repeatCount="indefinite" />
  </circle>
</svg>`,
    input_type: "svg",
    duration: 5,
    bitrate: "8000k",
    scale_factor: 2.0,
    width: 800,
    height: 500
  });

  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const ws = useRef(null);

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]:
        name === 'duration' ||
        name === 'scale_factor' ||
        name === 'width' ||
        name === 'height'
          ? parseFloat(value)
          : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setVideoUrl(null);

    try {
      const response = await fetch(`${API_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setJobId(data.job_id);
    } catch (err) {
      setError(`Failed to submit job: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    const socketUrl = `${WS_URL}/ws/${jobId}`;
    ws.current = new WebSocket(socketUrl);
    ws.current.onopen = () => console.log("WebSocket connected");
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setJobStatus(data);
      if (data.status === 'completed') {
        setVideoUrl(`${API_URL}/download/${jobId}`);
        ws.current.close();
      } else if (data.status === 'error') {
        setError(`Rendering error: ${data.error}`);
        ws.current.close();
      }
    };
    ws.current.onclose = () => console.log("WebSocket disconnected");
    ws.current.onerror = (err) => setError("WebSocket connection error.");
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [jobId]);

  const handleCleanup = async () => {
    if (!jobId) return;
    try {
      await fetch(`${API_URL}/clean/${jobId}`);
      setJobId(null);
      setJobStatus(null);
      setVideoUrl(null);
    } catch (err) {
      console.error('Failed to clean up job:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4">
      <div className="w-full max-w-6xl">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <header className="my-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center">
            <Film className="mr-3 h-10 w-10" />
            Animation Converter
          </h1>
          <p className="text-muted-foreground mt-2">
            Convert your SVG and HTML animations to MP4 videos with ease.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Provide your animation code and configure the output settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="input_type">Input Type</Label>
                  <Select
                    value={formData.input_type}
                    onValueChange={(value) => handleInputChange('input_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select input type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="svg">SVG</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="input_code">Input Code</Label>
                  <Textarea
                    id="input_code"
                    name="input_code"
                    value={formData.input_code}
                    onChange={(e) => handleInputChange('input_code', e.target.value)}
                    rows="12"
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (s)</Label>
                    <Input
                      id="duration"
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      min="1" max="60" step="0.5" required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bitrate">Bitrate</Label>
                    <Select
                      value={formData.bitrate}
                      onValueChange={(value) => handleInputChange('bitrate', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bitrate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4000k">Low (4000k)</SelectItem>
                        <SelectItem value="8000k">Medium (8000k)</SelectItem>
                        <SelectItem value="16000k">High (16000k)</SelectItem>
                        <SelectItem value="24000k">Ultra (24000k)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scale_factor">Scale Factor</Label>
                    <Input
                      id="scale_factor"
                      type="number"
                      name="scale_factor"
                      value={formData.scale_factor}
                      onChange={(e) => handleInputChange('scale_factor', e.target.value)}
                      min="1" max="4" step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dimensions (W×H)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        name="width"
                        value={formData.width}
                        onChange={(e) => handleInputChange('width', e.target.value)}
                        min="100" max="3840"
                      />
                      <span>×</span>
                      <Input
                        type="number"
                        name="height"
                        value={formData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        min="100" max="2160"
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Render Animation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {error && (
              <Card className="bg-destructive text-destructive-foreground">
                <CardHeader>
                  <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{error}</p>
                </CardContent>
              </Card>
            )}

            {jobId && jobStatus && (
              <Card>
                <CardHeader>
                  <CardTitle>Job Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Job ID:</strong> {jobId}</p>
                  <p><strong>Status:</strong> {jobStatus.status}</p>
                  {jobStatus.status === 'processing' && (
                    <div className="w-full bg-muted rounded-full h-2.5 my-4 overflow-hidden">
                      <div className="bg-primary h-2.5 rounded-full w-full animate-pulse"></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <video controls className="w-full rounded-md border mb-4">
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                   <Button variant="outline" onClick={handleCleanup}>
                    Clear Results
                  </Button>
                  <a href={videoUrl} download>
                    <Button>Download Video</Button>
                  </a>
                </CardFooter>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AnimationRenderer;
