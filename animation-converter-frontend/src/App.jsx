
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CodeEditor from './components/CodeEditor';
import RenderOptions from './components/RenderOptions';
import JobStatus from './components/JobStatus';


// API and WebSocket URLs
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8001";

function App() {
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

  // Handle form submission
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (err) {
      setError(`Failed to submit job: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket connection for real-time status updates
  useEffect(() => {
    if (!jobId) return;

    const socketUrl = `${WS_URL}/ws/${jobId}`;
    ws.current = new WebSocket(socketUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };

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

    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("WebSocket connection error.");
    };

    // Clean up the WebSocket connection on component unmount or when jobId changes
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [jobId]);

  // Clean up job data when done
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
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="container mx-auto p-4">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CodeEditor formData={formData} handleInputChange={handleInputChange} />
            <RenderOptions
              formData={formData}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </form>
        <JobStatus
          jobId={jobId}
          jobStatus={jobStatus}
          error={error}
          videoUrl={videoUrl}
          handleCleanup={handleCleanup}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
