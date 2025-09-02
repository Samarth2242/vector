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

#### Environment Variables

For the frontend to be able to communicate with the backend, it needs to know the backend's URL. This is configured using environment variables.

For local development, create a file named `.env` in the `animation-converter-frontend` directory by copying the example file:
```bash
cp animation-converter-frontend/.env.example animation-converter-frontend/.env
```
The default values in this file point to the local backend server and should work without changes.

For production, you will need to set these environment variables in your hosting provider's dashboard (e.g., Vercel). See the Deployment section for more details.

## Deployment

### Frontend (Vercel)

1.  Push your code to a GitHub repository.
2.  Go to [Vercel](https://vercel.com) and create a new project.
3.  Connect your GitHub repository.
4.  Vercel will automatically detect that you are using Vite and will configure the build settings. The `vercel.json` file in the `animation-converter-frontend` directory will ensure the correct settings are used.
5.  **Set Environment Variables:** Before deploying, you need to tell your frontend where to find your backend API. In your Vercel project settings, go to the "Environment Variables" section and add the following:
    *   `VITE_API_URL`: The public URL of your deployed backend (e.g., `https://your-backend.fly.dev`).
    *   `VITE_WS_URL`: The public WebSocket URL of your deployed backend (e.g., `wss://your-backend.fly.dev`).
6.  Deploy!

### Backend (Fly.io)

1.  Install the Fly.io CLI by following the instructions [here](https://fly.io/docs/hands-on/install-flyctl/).
2.  Log in to the Fly CLI: `fly auth login`.
3.  Launch the app: `fly launch --cwd animation-converter-api`. This will create a `fly.toml` file with the configuration for your app.
4.  Deploy the app: `fly deploy --cwd animation-converter-api`.

Your backend will be deployed to a public URL that you can use in your frontend. You will need to update the `API_URL` and `WS_URL` in `animation-converter-frontend/src/App.jsx` to point to your new backend URL.
