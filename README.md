# DeprecCheck AI

An AI-powered tool to scan code for deprecation warnings and breaking changes.

## Tech Stack

- **Frontend**: React (TypeScript) + Tailwind CSS
- **Backend**: Python FastAPI
- **AI**: Google Gemini 2.5 Flash

## Getting Started

### 1. Frontend
The frontend runs automatically in this environment. It is configured to look for the backend at `http://localhost:8000`. 

If the backend is not running, the frontend will automatically fallback to using the Gemini API directly from the browser (Client-Side mode).

### 2. Backend (Local Development)

To run the Python backend on your local machine:

1.  **Install Python 3.9+**
2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```
4.  **Set up Environment Variables:**
    Create a `.env` file in the root or `backend/` directory:
    ```
    API_KEY=your_google_gemini_api_key_here
    ```
5.  **Run the Server:**
    ```bash
    uvicorn backend.main:app --reload --port 8000
    ```

Once the server is running, the frontend will detect it and switch to server-side analysis.
