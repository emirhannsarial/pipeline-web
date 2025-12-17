import { useState } from 'react';
import { useTransferStore } from '../store/useTransferStore';
import QRCode from "react-qr-code";
import { AlertModal } from '../components/AlertModal';

export const HomePage = () => {
  const { 
    createRoom, 
    roomId, 
    connectionStatus, 
    progress, 
    selectedFile, 
    selectFile, 
    transferState, 
    resetTransfer, 
    peerLeft, // DÜZELTME: senderLeft yerine peerLeft
    logs 
  } = useTransferStore();
  
  const [showToast, setShowToast] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  const shareLink = roomId ? `${window.location.origin}/download/${roomId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const isConnected = connectionStatus.includes('CONNECTED') || connectionStatus.includes('BAĞLANDI');

  return (
    <div className="container">
      <div className="main-layout">
        
        <div className="ad-sidebar">📢 Ad Space (160x600)</div>

        <div className="content-area">
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Send Files Without Limits</h1>
            <p style={{ color: '#aaa', fontSize: '1.2rem' }}>
              Direct P2P transfer. No file size limit. No servers. Just you and the receiver.
            </p>
          </div>

          {/* ALICI KAÇTI MODALI (peerLeft kullanıldı) */}
          {peerLeft && (
            <AlertModal 
              title="Receiver Disconnected" 
              message="The receiver has closed the tab or lost connection."
              actionText="Reload Page"
              type="error"
              onAction={() => window.location.reload()}
            />
          )}

          {!roomId && !selectedFile && (
            <div className="card upload-zone">
              <label style={{ cursor: 'pointer', display: 'block', padding: '40px' }}>
                <div style={{ fontSize: '70px', marginBottom: '20px' }}>📦</div>
                <h3>Click to Select a File</h3>
                <p style={{ color: '#666' }}>or drag and drop any file here</p>
                <input 
                  type="file" 
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && selectFile(e.target.files[0])}
                />
              </label>
            </div>
          )}

          {!roomId && selectedFile && (
            <div className="card">
              <div style={{ fontSize: '60px', marginBottom: '15px' }}>📄</div>
              <h3 style={{ wordBreak: 'break-all' }}>{selectedFile.name}</h3>
              <p style={{ color: '#888', marginBottom: '20px' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              
              <button onClick={createRoom} style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                Create Transfer Link ✨
              </button>
              
              <p 
                style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666', cursor: 'pointer', textDecoration: 'underline' }} 
                onClick={() => window.location.reload()}
              >
                Cancel
              </p>
            </div>
          )}

          {roomId && (
            <div className="card">
              <div className={`status-badge ${isConnected ? 'status-connected' : 'status-waiting'}`}>
                {isConnected ? '🟢 Peer Connected' : '🟡 Waiting for Peer...'}
              </div>

              {!isConnected && (
                <>
                  <p style={{ marginBottom: '10px' }}>Send this link to the receiver:</p>
                  
                  <div style={{ background: 'white', padding: '10px', width: 'fit-content', margin: '0 auto 20px auto', borderRadius: '8px' }}>
                      <QRCode value={shareLink} size={128} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <input type="text" readOnly value={shareLink} onClick={(e) => e.currentTarget.select()} />
                    <button onClick={copyToClipboard}>Copy Link</button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '15px' }}>
                    ⚠️ Do not close this tab until transfer is complete.
                  </p>
                </>
              )}

              {isConnected && (
                <div style={{ marginTop: '30px', textAlign: 'left' }}>
                  
                  {transferState === 'REJECTED' ? (
                    <div style={{ textAlign: 'center', color: '#e74c3c' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚫</div>
                      <h3>Receiver Rejected</h3>
                      <p>The receiver chose not to download this file.</p>
                      <button onClick={resetTransfer} style={{ marginTop: '15px', background: '#333' }}>
                        Try Again / Select New File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold' }}>
                        <span>
                          {transferState === 'COMPLETED' ? 'Completed' : 
                           transferState === 'TRANSFERRING' ? 'Sending...' : 
                           'Waiting for receiver to accept...'}
                        </span>
                        <span>%{progress}</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progress}%`, background: transferState === 'ERROR' ? '#e74c3c' : '#28a745' }}></div>
                      </div>
                    </>
                  )}

                  {transferState === 'COMPLETED' && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                       <h3 style={{ color: '#2ecc71' }}>✅ Transfer Successful!</h3>
                       <button onClick={() => window.location.reload()} style={{ marginTop: '10px', background: '#333' }}>Send Another File</button>
                    </div>
                  )}
                </div>
              )}

              {/* LOG PANELİ */}
              <div style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                  <button 
                      onClick={() => setShowLogs(!showLogs)}
                      style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto' }}
                  >
                      {showLogs ? 'Hide Activity' : 'Show Activity'} 
                      <span style={{ fontSize: '0.8rem' }}>{showLogs ? '▲' : '▼'}</span>
                  </button>

                  {showLogs && (
                      <div style={{ marginTop: '15px', textAlign: 'left', background: '#1a1a1a', borderRadius: '12px', padding: '15px', maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                          {logs.map((log, i) => (
                              <div key={i} style={{ borderBottom: '1px solid #222', paddingBottom: '5px', marginBottom: '5px' }}>
                                  &gt; {log}
                              </div>
                          ))}
                      </div>
                  )}
              </div>

            </div>
          )}
        </div>

        <div className="ad-sidebar">📢 Ad Space (160x600)</div>
      </div>

      {showToast && <div className="toast">✅ Link copied to clipboard!</div>}
    </div>
  );
};