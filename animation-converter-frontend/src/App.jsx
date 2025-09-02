import React, { useState, useEffect, useRef } from 'react';

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
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">SVG/HTML Animation Renderer</h1>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">
            Input Type
            <select
              name="input_type"
              value={formData.input_type}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              <option value="svg">SVG</option>
              <option value="html">HTML</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Input Code
            <textarea
              name="input_code"
              value={formData.input_code}
              onChange={handleInputChange}
              rows="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono text-sm"
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (seconds)
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                max="60"
                step="0.5"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bitrate
              <select
                name="bitrate"
                value={formData.bitrate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
                <option value="4000k">Low (4000k)</option>
                <option value="8000k">Medium (8000k)</option>
                <option value="16000k">High (16000k)</option>
                <option value="24000k">Ultra (24000k)</option>
              </select>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Scale Factor
              <input
                type="number"
                name="scale_factor"
                value={formData.scale_factor}
                onChange={handleInputChange}
                min="1"
                max="4"
                step="0.5"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Width × Height
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleInputChange}
                  min="100"
                  max="3840"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
                <span className="mt-3">×</span>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  min="100"
                  max="2160"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Render Animation'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {jobId && jobStatus && (
        <div className="border rounded-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Job Status</h2>
          <p>
            <strong>Job ID:</strong> {jobId}
          </p>
          <p>
            <strong>Status:</strong> {jobStatus.status}
          </p>
          {jobStatus.status === 'processing' && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
              <div className="bg-blue-600 h-2.5 rounded-full w-1/2"></div>
            </div>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="border rounded-md p-4">
          <h2 className="text-lg font-semibold mb-4">Result</h2>
          <video controls className="w-full border rounded mb-4">
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div className="flex space-x-2">
            <a
              href={videoUrl}
              download
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Download Video
            </a>
            <button
              onClick={handleCleanup}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnimationRenderer;
