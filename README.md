# Sarthi.ai 🚀

Sarthi.ai is an intelligent, AI-driven technical interview platform designed to conduct highly realistic Data Structures & Algorithms (DSA), Conceptual, and Project-based interviews. By evaluating a candidate's resume and utilizing a generative AI backend, Sarthi.ai provides tailored interview questions, an integrated code editor for live coding, and a real-time conversational AI voice agent.

---

##  Architecture

Sarthi.ai is built on a modern, decoupled microservices architecture:

1. **Client (Frontend)**: React.js (Vite) with TailwindCSS. Provides the user interface, live code editor (Monaco), and WebSocket handling for real-time voice and events.
2. **Backend (Core API)**: Node.js / Express. Manages user authentication, session state tracking, database operations (MongoDB), and email report generation (Nodemailer).
3. **GithubFeature (AI Service)**: Python / FastAPI. Integrates with the Google Gemini API to parse resumes, fetch and analyze GitHub repositories, and stream realistic voice responses via WebSockets.

---

## Key Features

- **Resume Parsing & GitHub Integration**: Extracts skills and projects from uploaded resumes and fetches context from candidate GitHub repositories.
- **Tri-phasic Interview Pipeline**:
  - **DSA Stage**: Live coding environment with real-time test case validation using Judge0.
  - **Conceptual Stage**: AI-driven technical questions based on the candidate's core skills.
  - **Project Stage**: Deep-dive questions generated dynamically from the candidate's GitHub repositories.
- **Conversational Voice AI**: Employs an ultra-realistic text-to-speech and speech-to-text pipeline to conduct interviews naturally.
- **Comprehensive Reporting**: Automatically emails a detailed evaluation report and score breakdown to the candidate upon completion.

---

##  Deployment Guide (Render)

The application is structured to be deployed as three distinct services on [Render](https://render.com) (or similar platforms).

### 1. Database Setup
Ensure you have a MongoDB Atlas cluster. Retrieve the connection string for your `MONGO_URL` environment variable.

### 2. Backend Service (Node.js)
Deploy as a **Web Service**.
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```env
  PORT=5000
  MONGO_URL="mongodb+srv://<user>:<password>@cluster.mongodb.net/sarthi"
  JUDGE0_API_KEY="your_judge0_api_key"
  VOICE_SERVICE_URL="https://your-python-service.onrender.com"
  GOOGLE_API_KEY="your_gemini_api_key"
  JWT_SECRET="your_jwt_secret"
  GOOGLE_CLIENT_ID="your_google_client_id"
  SMTP_HOST="smtp.gmail.com"
  SMTP_PORT=587
  SMTP_USER="your-email@gmail.com"
  SMTP_PASS="your-app-password"
  ```

### 3. AI / Python Service (FastAPI)
Deploy as a **Web Service** from the `GithubFeature` directory.
- **Root Directory**: `GithubFeature`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  ```env
  GOOGLE_API_KEY="your_gemini_api_key"
  ```

### 4. Client Application (React/Vite)
Deploy as a **Static Site**.
- **Root Directory**: `client`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_API_URL="https://your-node-backend.onrender.com"
  VITE_WS_URL="wss://your-node-backend.onrender.com"
  VITE_PYTHON_API_URL="https://your-python-service.onrender.com"
  VITE_GOOGLE_CLIENT_ID="your_google_client_id"
  ```

---

##  Local Development

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- MongoDB instance running locally or via Atlas

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sarthi.ai.git
   cd sarthi.ai
   ```

2. **Start the Node.js Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start the Python AI Service**
   ```bash
   cd GithubFeature
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

4. **Start the React Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```

---

