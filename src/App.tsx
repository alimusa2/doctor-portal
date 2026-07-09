import { useEffect, useState } from 'react';

// Type definitions
interface CallData {
  callId: string;
  assistantId: string;
  status: string;
  endedReason: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  customerNumber: string;
  transcript: string;
  recordingUrl: string;
  summary: string;
  structuredData: any;
}

// Helper to mask phone number
const maskPhone = (phone: string) => {
  if (!phone || phone === 'Unknown') return phone;
  if (phone.length > 4) {
    const last4 = phone.slice(-4);
    return `+1******${last4}`; // simple mask assuming US, or just mask middle
  }
  return phone;
};

// Helper to format date
const formatDate = (isoStr: string) => {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper to format duration
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

function App() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetch('/api/calls')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCalls(data);
      })
      .catch(err => console.error('Failed to fetch initial calls', err));

    // SSE setup
    const eventSource = new EventSource('/api/stream');
    
    eventSource.onopen = () => setIsConnected(true);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return; // Heartbeat
        
        // New call data arrived
        setCalls(prev => {
          const newCalls = [data, ...prev.filter(c => c.callId !== data.callId)];
          return newCalls.slice(0, 20); // Keep max 20
        });
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      // Simple reconnect logic could go here
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const selectedCall = calls.find(c => c.callId === selectedCallId);

  return (
    <div className="portal-container">
      {/* Sidebar - Recent Calls */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Doctor Portal</h1>
          <div className="status-indicator" title={isConnected ? 'Connected to stream' : 'Disconnected'}>
            <div className="status-dot" style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }}></div>
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>
        
        <div className="calls-list">
          {calls.length === 0 ? (
            <div className="empty-state">
              <p>Waiting for incoming calls...</p>
            </div>
          ) : (
            calls.map(call => (
              <div 
                key={call.callId} 
                className={`call-item ${selectedCallId === call.callId ? 'active' : ''}`}
                onClick={() => setSelectedCallId(call.callId)}
              >
                <div className="call-header">
                  <span className="call-number">{maskPhone(call.customerNumber)}</span>
                  <span className="call-time">{formatDate(call.startedAt)}</span>
                </div>
                <div className="call-meta">
                  <span className="tag">{formatDuration(call.durationSeconds)}</span>
                  <span className="tag">{call.endedReason || call.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Call Details */}
      <div className="main-content">
        {!selectedCall ? (
          <div className="details-placeholder">
            Select a call to view details
          </div>
        ) : (
          <div className="details-panel">
            <div className="details-header">
              <h2>Call Details</h2>
              <div className="details-meta">
                <span>Customer: {maskPhone(selectedCall.customerNumber)}</span>
                <span>•</span>
                <span>Date: {new Date(selectedCall.startedAt).toLocaleString()}</span>
                <span>•</span>
                <span>Duration: {formatDuration(selectedCall.durationSeconds)}</span>
              </div>
            </div>

            {selectedCall.summary && (
              <div className="section">
                <h3>Summary</h3>
                <p>{selectedCall.summary}</p>
              </div>
            )}

            {selectedCall.transcript && (
              <div className="section">
                <h3>Transcript</h3>
                <div className="transcript-box">
                  {selectedCall.transcript}
                </div>
              </div>
            )}

            {selectedCall.structuredData && Object.keys(selectedCall.structuredData).length > 0 && (
              <div className="section">
                <h3>Structured Data</h3>
                <div className="json-box">
                  <pre>{JSON.stringify(selectedCall.structuredData, null, 2)}</pre>
                </div>
              </div>
            )}

            {selectedCall.recordingUrl && (
              <div className="section">
                <h3>Recording</h3>
                <a href={selectedCall.recordingUrl} target="_blank" rel="noreferrer" className="btn recording-link">
                  Open Audio File
                </a>
                <audio controls src={selectedCall.recordingUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
