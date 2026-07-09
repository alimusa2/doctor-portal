# Doctor Portal

A minimal and beautiful "Doctor Portal" to receive and view Vapi after-call reports in real-time.

## Project Structure

This is a monorepo containing two parts:
- `backend/`: Node.js Express server to receive Vapi webhooks and broadcast them via Server-Sent Events (SSE).
- `frontend/`: Vite React application (TypeScript) that displays the call reports.

## Prerequisites

- Node.js (v18+ recommended)
- `npm`

## Setup & Running Locally

### 1. Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file or export the environment variable:
   ```bash
   # Windows (PowerShell)
   $env:VAPI_WEBHOOK_SECRET="your_secret_here"
   ```
   Or create a `.env` file:
   ```env
   VAPI_WEBHOOK_SECRET=your_secret_here
   PORT=3001
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:3001`.

### 2. Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

## Configuring Vapi

1. Go to your Vapi Dashboard.
2. In your Server URL settings, enter the public URL of your backend followed by `/webhook/vapi` (e.g., `https://your-domain.com/webhook/vapi`). If testing locally, you can use a tool like **ngrok** to expose your localhost to the internet: `ngrok http 3001`.
3. Set the Secret (or Header) in Vapi to match your `VAPI_WEBHOOK_SECRET`. Wait, Vapi sends an `Authorization: Bearer <SECRET>` header. You might need to configure Vapi to send this header or set the secret in Vapi webhook config.
4. Make sure **end-of-call-report** events are enabled.

## Testing with Mock Data

You can simulate a Vapi webhook using `curl` (while your backend is running):

```bash
curl -X POST http://localhost:3001/webhook/vapi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret" \
  -d '{
    "message": {
      "type": "end-of-call-report",
      "call": {
        "id": "call_12345",
        "status": "ended",
        "createdAt": "2024-05-15T10:00:00.000Z",
        "updatedAt": "2024-05-15T10:05:00.000Z"
      },
      "assistantId": "ast_9876",
      "endedReason": "customer-hung-up",
      "duration": 300,
      "customer": {
        "number": "+15551234567"
      },
      "transcript": "Doctor: Hello, how can I help you today?\nPatient: I need to refill my prescription.\nDoctor: Sure, I can help with that.",
      "recordingUrl": "https://example.com/recording.mp3",
      "analysis": {
        "summary": "Patient called to request a prescription refill.",
        "structuredData": {
          "intent": "prescription_refill",
          "urgency": "low"
        }
      }
    }
  }'
```

If the React frontend is open, it will immediately display the new mock call!

## Constraints Respected
- **No DB, No Auth**: Backend uses in-memory array (max 20 calls).
- **Vapi Private Key**: Not exposed in the browser (webhook secret is backend-only).
- **Real-Time**: Utilizes Server-Sent Events (SSE) for instant updates.
- **Aesthetics**: Vanilla CSS with modern styling (dark mode, glassmorphism hints, animations).
