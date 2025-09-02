import asyncio
import io
import os
import time
import json
import base64
import tempfile
import uuid
import numpy as np
from typing import Optional, Dict, Any, Tuple, List
from PIL import Image
from moviepy import *
from playwright.async_api import async_playwright
from fastapi import FastAPI, HTTPException, BackgroundTasks, Body, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[job_id] = websocket

    def disconnect(self, job_id: str):
        if job_id in self.active_connections:
            del self.active_connections[job_id]

    async def send_status_update(self, job_id: str, status: str, message: str, error: Optional[str] = None):
        if job_id in self.active_connections:
            websocket = self.active_connections[job_id]
            data = {"status": status, "message": message}
            if error:
                data["error"] = error
            await websocket.send_json(data)

manager = ConnectionManager()


# Create output directory if it doesn't exist
OUTPUT_DIR = Path("./animation_outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI
app = FastAPI(title="Animation Renderer API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job storage
job_status = {}

class AnimationRequest(BaseModel):
    job_id: Optional[str] = Field(None, description="Optional job ID")
    input_code: str
    input_type: str
    duration: float
    bitrate: Optional[str]
    scale_factor: Optional[float]
    width: Optional[int]
    height: Optional[int]

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

def create_html_content(input_code: str, input_type: str = "svg") -> str:
    """
    Wraps SVG or HTML input into a complete HTML document with improved rendering quality.
    """
    if input_type.lower() == "svg":
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SVG Animation</title>
  <style>
    html, body {{
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
      width: 100%;
      height: 100%;
    }}
    svg {{
      width: 100%;
      height: 100%;
      shape-rendering: geometricPrecision;
      text-rendering: geometricPrecision;
      image-rendering: optimizeQuality;
    }}
  </style>
</head>
<body>
{input_code}
</body>
</html>"""
        return html_content
    elif input_type.lower() == "html":
        # Insert quality enhancing meta tag if not already present
        if "<meta name=\"viewport\"" not in input_code:
            enhanced_html = input_code.replace("<head>", 
                "<head>\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0\">\n")
            return enhanced_html
        return input_code
    else:
        raise ValueError("Invalid input_type. Use 'svg' or 'html'.")

async def capture_animation_frames_playwright(input_code: str, input_type: str, duration: float, 
                                             width: int, height: int, 
                                             target_fps: int = 60,
                                             device_scale_factor: float = 2.0):
    """
    Captures high-quality frames using device scale factor for improved resolution.
    Returns a list of frames (numpy arrays).
    """
    html_content = create_html_content(input_code, input_type)
    # Write HTML to a temporary file
    with tempfile.NamedTemporaryFile('w', delete=False, suffix='.html') as f:
        html_path = f.name
        f.write(html_content)
    
    frames = []
    frame_interval = 1.0 / target_fps  # Time between frames in seconds
    
    try:
        async with async_playwright() as p:
            try:
                # Launch browser with GPU acceleration if available
                browser = await p.chromium.launch(headless=True)
                
                # Create a context with high-resolution settings
                context = await browser.new_context(
                    viewport={'width': width, 'height': height},
                    device_scale_factor=device_scale_factor,  # Higher value for sharper images
                    is_mobile=False,
                    has_touch=False
                )
                
                page = await context.new_page()
                
                # Set quality-related browser settings
                await page.evaluate("""() => {
                    // Force hardware acceleration if available
                    document.body.style.transform = 'translateZ(0)';
                    document.body.style.backfaceVisibility = 'hidden';
                }""")
                
                await page.goto("file://" + html_path)
                
                # Allow animations to initialize
                await page.wait_for_timeout(2000)
                
                print(f"Capturing high-quality frames at {target_fps} FPS for {duration} seconds (scale factor: {device_scale_factor})...")
                start_time = time.monotonic()
                end_time = start_time + duration
                next_frame_time = start_time
                
                while time.monotonic() < end_time:
                    current_time = time.monotonic()
                    
                    # If we're behind schedule, catch up
                    if current_time >= next_frame_time:
                        try:
                            # Use Playwright's screenshot API with proper settings for PNG
                            screenshot_bytes = await page.screenshot(
                                type="png",
                                full_page=False,
                                omit_background=False
                            )
                            
                            img = Image.open(io.BytesIO(screenshot_bytes))
                            frames.append(np.array(img))
                            
                            # Calculate next frame time
                            next_frame_time += frame_interval
                            
                            # If we've fallen too far behind, reset
                            if current_time > next_frame_time + frame_interval:
                                next_frame_time = current_time + frame_interval
                                
                        except Exception as e:
                            print(f"Error capturing screenshot: {e}")
                    else:
                        # Wait efficiently until next frame time
                        wait_time = min(next_frame_time - current_time, 0.001)
                        if wait_time > 0:
                            await page.wait_for_timeout(int(wait_time * 1000))
                
                actual_duration = time.monotonic() - start_time
                actual_fps = len(frames) / actual_duration if actual_duration > 0 else target_fps
                print(f"Captured {len(frames)} frames over {actual_duration:.2f} seconds (Average FPS: {actual_fps:.2f})")
                
                await browser.close()
            except NotImplementedError:
                print("Playwright not properly installed. Try running 'playwright install' from command line.")
                raise Exception("Playwright browser installation issue. Please run 'playwright install'")
            except Exception as e:
                print(f"Error during Playwright execution: {e}")
                raise
    except Exception as e:
        print(f"Failed to initialize Playwright: {e}")
        raise
    finally:
        # Make sure to clean up the temp file
        if os.path.exists(html_path):
            try:
                os.remove(html_path)
            except Exception as e:
                print(f"Failed to remove temporary file {html_path}: {e}")
    
    if not frames:
        raise ValueError("No frames were captured. Check your input and try again.")
        
    return frames, target_fps

async def animation_to_mp4(input_code: str, input_type: str, duration_seconds: float, 
                     frame_size: tuple, output_path: str, 
                     target_fps: int = 60, bitrate: str = "8000k",
                     device_scale_factor: float = 2.0) -> str:
    """
    Converts an animated SVG or HTML into a high-quality MP4 video with precise duration control.
    """
    width, height = frame_size
    
    # Use the synchronous Selenium function
    frames, fps = await capture_animation_frames_playwright(
        input_code, input_type, duration_seconds, width, height, target_fps, device_scale_factor
    )
    
    if not frames:
        raise ValueError("No frames were captured. Check your input and try again.")
    
    print(f"Creating high-quality video clip from {len(frames)} frames at {fps} FPS...")
    print("This is the updated code.")
    
    # Create the clip with the exact FPS specified
    clip = ImageSequenceClip(frames, fps=fps)
    
    # Calculate expected duration and log it
    expected_duration = len(frames) / fps
    print(f"Expected clip duration: {expected_duration:.2f}s (requested: {duration_seconds:.2f}s)")
    
    print(f"Writing video to {output_path} with bitrate {bitrate}...")
    
    # Use high-quality encoding settings
    clip.write_videofile(
        output_path,
        codec="libx264",
        bitrate=bitrate,
        fps=fps,  # Use the exact fps we calculated
        preset="slow",  # Good balance between quality and speed
        ffmpeg_params=[
            "-crf", "17",    # Lower CRF = higher quality (17-18 is visually lossless)
            "-pix_fmt", "yuv420p",  # Standard pixel format for compatibility
            "-profile:v", "high",   # High profile for better quality
            "-tune", "animation",   # Optimize for animation content
            "-movflags", "+faststart"  # Fast start for web playback
        ],
        threads=4,      # Use multiple threads for encoding
        logger=None     # Suppress moviepy logging
    )
    
    # Verify the output file duration
    
    output_clip = VideoFileClip(output_path)
    print(f"Final video duration: {output_clip.duration:.2f}s")
    output_clip.close()
    
    return output_path

async def process_animation_job(job_id: str, params: Dict[str, Any]):
    """Background task to process animation rendering"""
    try:
        job_status[job_id]["status"] = "processing"
        await manager.send_status_update(job_id, "processing", "Starting animation rendering...")
        
        # Create output filename
        output_filename = f"{job_id}.mp4"
        output_path = OUTPUT_DIR / output_filename
        
        # Process the animation
        await animation_to_mp4(
            input_code=params["input_code"],
            input_type=params["input_type"],
            duration_seconds=params["duration"],
            frame_size=(params["width"], params["height"]),
            output_path=str(output_path),
            target_fps=60,
            bitrate=params["bitrate"],
            device_scale_factor=params["scale_factor"]
        )
        
        # Update job status
        job_status[job_id]["status"] = "completed"
        job_status[job_id]["output_path"] = str(output_path)
        await manager.send_status_update(job_id, "completed", "Animation rendered successfully.")
        
    except Exception as e:
        job_status[job_id]["status"] = "error"
        job_status[job_id]["error"] = str(e)
        await manager.send_status_update(job_id, "error", "An error occurred during rendering.", error=str(e))
        print(f"Error processing job {job_id}: {e}")

@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id)
        print(f"WebSocket disconnected for job_id: {job_id}")

@app.post("/render", response_model=JobResponse)
async def render_animation(
    background_tasks: BackgroundTasks,
    animation_request: AnimationRequest = Body(...)
):
    """
    API endpoint to render an animation from SVG or HTML input.
    Returns a job ID that can be used to check status and download the result.
    """
    # Generate a unique job ID
    job_id = animation_request.job_id if animation_request.job_id else str(uuid.uuid4())
    
    # Store job parameters and initial status
    job_status[job_id] = {
        "status": "queued",
        "params": animation_request.dict(),
        "created_at": time.time()
    }
    
    # Start the rendering process in the background
    background_tasks.add_task(
        process_animation_job,
        job_id, 
        animation_request.dict()
    )
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message="Animation rendering job has been queued"
    )

@app.get("/status/{job_id}", response_model=Dict[str, Any])
async def get_job_status(job_id: str):
    """Check the status of a rendering job"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_status[job_id]

@app.get("/download/{job_id}")
async def download_animation(job_id: str):
    """Download the rendered animation"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_status[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job is not ready for download. Current status: {job['status']}")
    
    if "output_path" not in job:
        raise HTTPException(status_code=500, detail="Output path not found")
    
    output_path = Path(job["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Animation file not found")
    
    # Return the file
    with open(output_path, "rb") as file:
        video_data = file.read()
    
    return Response(
        content=video_data,
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"attachment; filename={output_path.name}"
        }
    )

@app.get("/clean/{job_id}")
async def clean_job(job_id: str):
    """Remove a job and its output file"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete the output file if it exists
    job = job_status[job_id]
    if "output_path" in job and os.path.exists(job["output_path"]):
        try:
            os.remove(job["output_path"])
        except Exception as e:
            print(f"Failed to delete file: {e}")
    
    # Remove the job from status tracking
    del job_status[job_id]
    
    return {"message": f"Job {job_id} and its outputs have been removed"}

@app.get("/")
async def root():
    """API health check endpoint"""
    return {"status": "online", "message": "Animation Renderer API is running"}

# Cleanup task to remove old jobs (could be enhanced with a background worker)
@app.on_event("startup")
async def startup_event():
    print("Animation Renderer API started")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)