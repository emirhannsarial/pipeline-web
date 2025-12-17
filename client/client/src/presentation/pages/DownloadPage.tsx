import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransferStore } from '../store/useTransferStore';
import { AlertModal } from '../components/AlertModal';

export const DownloadPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { 
    joinRoom, 
    connectionStatus, 
    incomingMetadata, 
    acceptDownload, 
    rejectDownload, 
    progress, 
    transferState, 
    peerLeft, // DÜZELTME: senderLeft yerine peerLeft
    logs 
  } = useTransferStore();
  
  const hasJoined = useRef(false);
  const [showLogs, setShowLogs] = useState(false);

  const isConnected = connectionStatus.includes('CONNECTED') || connectionStatus.includes('BAĞLANDI');
  const isDownloading = transferState === 'TRANSFERRING';
  const isFinished = transferState === 'COMPLETED';
  const isRejected = transferState === 'REJECTED';
  const isIdle = transferState === 'IDLE';

  useEffect(() => {
    if (roomId && !hasJoined.current) {
      hasJoined.current = true;
      joinRoom(roomId);
      window.onbeforeunload = () => "Transfer will stop. Are you sure?";
    }
    return () => { window.onbeforeunload = null; };
  }, [roomId, joinRoom]);

  return (
    <div className="container">
      <div className="main-layout">
        
        <div className="ad-sidebar">📢 Ad Space</div>

        <div className="content-area">
          
          {/* MODAL: GÖNDERİCİ KAÇTI (peerLeft kullanıldı) */}
          {peerLeft && (
            <AlertModal 
              title="Sender Disconnected" 
              message="The sender closed the tab or lost connection. Transfer cannot continue."
              actionText="Go to Home"
              type="error"
              onAction={() => window.location.href = '/'}
            />
          )}

          <div className="card" style={{ padding: '40px 20px' }}>
            
            <div style={{ fontSize: '80px', marginBottom: '30px' }}>
              {!isConnected && !peerLeft && '⏳'}
              {isConnected && isIdle && !incomingMetadata && '🔗'}
              {incomingMetadata && isIdle && '📁'}
              {isDownloading && '⬇️'}
              {isFinished && '🎉'}
              {isRejected && '🚫'}
            </div>

            {/* DURUM 1: BAĞLANTI BEKLENİYOR */}
            {!isConnected && !peerLeft && (
                <div>
                    <h2>Connecting to Peer...</h2>
                    <p style={{ color: '#666' }}>Establishing secure P2P tunnel.</p>
                </div>
            )}
            
            {/* DURUM 2: DOSYA GELDİ - ONAY BEKLİYOR */}
            {isConnected && incomingMetadata && isIdle && (
              <div>
                <h3>File Ready!</h3>
                <p style={{ fontSize: '1.2rem', color: '#fff', margin: '10px 0' }}>{incomingMetadata.name}</p>
                <p style={{ color: '#888' }}>{(incomingMetadata.size / 1024 / 1024).toFixed(2)} MB</p>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '30px' }}>
                  <button onClick={rejectDownload} style={{ background: '#333' }}>Reject</button>
                  <button onClick={acceptDownload} style={{ background: '#2ecc71' }}>Download</button>
                </div>
              </div>
            )}

            {/* DURUM 3: İNDİRİLİYOR */}
            {isDownloading && (
              <div>
                <h2 style={{ color: '#646cff' }}>Downloading...</h2>
                <div className="progress-container" style={{ margin: '20px 0' }}>
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <p>{progress}%</p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>Please keep this tab open.</p>
              </div>
            )}

            {/* DURUM 4: REDDEDİLDİ */}
            {isRejected && (
                <div>
                    <h2 style={{ color: '#e74c3c' }}>Download Rejected</h2>
                    <p style={{ color: '#aaa', margin: '15px 0' }}>You chose not to download this file.</p>
                    <button onClick={() => navigate('/')} style={{ background: '#333' }}>
                        Go to Home
                    </button>
                </div>
            )}

            {/* DURUM 5: BEKLİYOR (Sender seçmediyse) */}
            {isConnected && !incomingMetadata && !isRejected && (
                <div>
                    <h2>Connected!</h2>
                    <p>Waiting for sender to select a file...</p>
                    <div className="loader" style={{ marginTop: '20px', color: '#666', fontSize: '0.8rem' }}>Ready to receive</div>
                </div>
            )}

            {/* DURUM 6: BİTTİ */}
            {isFinished && (
               <div>
                 <h2 style={{ color: '#2ecc71' }}>Transfer Completed!</h2>
                 <p>File saved to your downloads folder.</p>
                 <button onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Send a File</button>
               </div>
            )}

            {/* LOG PANELİ */}
            <div style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                <button 
                    onClick={() => setShowLogs(!showLogs)}
                    style={{ 
                        background: 'transparent', border: 'none', color: '#666', fontSize: '0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto'
                    }}
                >
                    {showLogs ? 'Hide Activity' : 'Show Activity'} 
                    <span style={{ fontSize: '0.8rem' }}>{showLogs ? '▲' : '▼'}</span>
                </button>

                {showLogs && (
                    <div style={{ 
                        marginTop: '15px', textAlign: 'left', background: '#1a1a1a', borderRadius: '12px', 
                        padding: '15px', maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem',
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                    }}>
                        {logs.length === 0 && <p style={{color:'#444', textAlign:'center'}}>No activity yet...</p>}
                        
                        {logs.map((log, i) => (
                            <div key={i} style={{ 
                                display: 'flex', gap: '10px', marginBottom: '8px', 
                                borderBottom: '1px solid #222', paddingBottom: '5px' 
                            }}>
                                <span style={{ color: '#666', minWidth: '60px' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span style={{ 
                                    color: log.includes('Error') ? '#e74c3c' : 
                                           log.includes('Completed') ? '#2ecc71' : '#ccc' 
                                }}>
                                    {log}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

          </div>
        </div>

        <div className="ad-sidebar">📢 Ad Space</div>
      </div>
    </div>
  );
};