# Animation Converter

This application converts SVG and HTML animations to MP4 videos.

## How to Run

### 1. Run the Backend (API)

Open a terminal and navigate to the root of the project directory.

First, make sure you have the necessary system dependencies for Playwright, which is used for rendering the videos. You can install them with this command:
```bash
playwright install-deps
```
Next, install the required Python packages:
```bash
pip install fastapi "uvicorn[standard]" pydantic moviepy playwright numpy Pillow websockets httpx
```
Once the dependencies are installed, you can start the backend server:
```bash
python animation-converter-api/app.py
```
The API server will start and be available at `http://localhost:8001`.

### 2. Run the Frontend

Open a **new** terminal window and navigate to the frontend directory:
```bash
cd animation-converter-frontend
```
Install the Node.js dependencies:
```bash
npm install
```
Then, start the frontend development server:
```bash
npm run dev
```
The command will output a local URL (usually `http://localhost:5173`) that you can open in your web browser to use the application.
