import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// API and WebSocket URLs
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8001";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]:
        ['duration', 'scale_factor', 'width', 'height'].includes(name)
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
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
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Animation Converter
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
        Convert your SVG and HTML animations to MP4 videos with ease.
      </Typography>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Configuration" />
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Input Type</InputLabel>
                      <Select
                        name="input_type"
                        value={formData.input_type}
                        label="Input Type"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="svg">SVG</MenuItem>
                        <MenuItem value="html">HTML</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="input_code"
                      label="Input Code"
                      multiline
                      rows={12}
                      value={formData.input_code}
                      onChange={handleInputChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="duration"
                      label="Duration (s)"
                      type="number"
                      value={formData.duration}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                  <FormControl fullWidth>
                      <InputLabel>Bitrate</InputLabel>
                      <Select
                        name="bitrate"
                        value={formData.bitrate}
                        label="Bitrate"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="4000k">Low (4000k)</MenuItem>
                        <MenuItem value="8000k">Medium (8000k)</MenuItem>
                        <MenuItem value="16000k">High (16000k)</MenuItem>
                        <MenuItem value="24000k">Ultra (24000k)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="scale_factor"
                      label="Scale Factor"
                      type="number"
                      value={formData.scale_factor}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        name="width"
                        label="Width"
                        type="number"
                        value={formData.width}
                        onChange={handleInputChange}
                      />
                      <Typography>× </Typography>
                      <TextField
                        name="height"
                        label="Height"
                        type="number"
                        value={formData.height}
                        onChange={handleInputChange}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isLoading}
                      startIcon={isLoading && <CircularProgress size={20} />}
                    >
                      {isLoading ? 'Processing...' : 'Render Animation'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {jobId && jobStatus && (
              <Card>
                <CardHeader title="Job Status" />
                <CardContent>
                  <Typography><strong>Job ID:</strong> {jobId}</Typography>
                  <Typography><strong>Status:</strong> {jobStatus.status}</Typography>
                  {jobStatus.status === 'processing' && <CircularProgress sx={{ mt: 2 }} />}
                </CardContent>
              </Card>
            )}

            {videoUrl && (
              <Card>
                <CardHeader title="Result" />
                <CardContent>
                  <video controls width="100%">
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </CardContent>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                   <Button variant="outlined" onClick={handleCleanup}>
                    Clear Results
                  </Button>
                  <Button variant="contained" href={videoUrl} download>
                    Download Video
                  </Button>
                </Box>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AnimationRenderer />
    </ThemeProvider>
  );
}

export default App;
