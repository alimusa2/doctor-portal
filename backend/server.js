require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || 'test-secret';

app.use(cors());
app.use(express.json());

// In-memory storage for calls (max 20)
const MAX_CALLS = 20;
let recentCalls = [];

// Connected SSE clients
let sseClients = [];

// Helper to broadcast new calls to SSE clients
const broadcastNewCall = (callData) => {
  const payload = `data: ${JSON.stringify(callData)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('Error broadcasting to client', err);
    }
  });
};

app.post('/webhook/vapi', (req, res) => {
  // Verify secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${VAPI_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  if (payload.message && payload.message.type === 'end-of-call-report') {
    const report = payload.message;
    
    // Normalize call data
    const callData = {
      callId: report.call?.id || Date.now().toString(),
      assistantId: report.assistantId,
      status: report.call?.status,
      endedReason: report.endedReason,
      startedAt: report.call?.createdAt || new Date().toISOString(),
      endedAt: report.call?.updatedAt || new Date().toISOString(),
      durationSeconds: report.duration || 0,
      customerNumber: report.customer?.number || 'Unknown',
      transcript: report.call?.artifact?.transcript || report.transcript || '',
      recordingUrl: report.call?.artifact?.recordingUrl || report.recordingUrl || '',
      summary: report.call?.analysis?.summary || report.analysis?.summary || '',
      structuredData: report.call?.analysis?.structuredData || report.analysis?.structuredData || {},
    };

    // Unshift and slice to max 20
    recentCalls.unshift(callData);
    if (recentCalls.length > MAX_CALLS) {
      recentCalls = recentCalls.slice(0, MAX_CALLS);
    }

    broadcastNewCall(callData);
  }

  res.status(200).send('OK');
});

app.get('/api/calls', (req, res) => {
  res.json(recentCalls);
});

app.get('/api/calls/:callId', (req, res) => {
  const call = recentCalls.find(c => c.callId === req.params.callId);
  if (call) {
    res.json(call);
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send an initial heartbeat
  res.write(`data: {"type": "connected"}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
