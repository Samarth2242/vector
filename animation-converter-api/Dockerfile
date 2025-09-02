# Start with a Python 3.11 base image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers and their dependencies
RUN playwright install --with-deps

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 8001

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
