import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTransferStore } from '../store/useTransferStore';

export const DownloadPage = () => {
  const { roomId } = useParams();
  const { joinRoom, connectionStatus, logs } = useTransferStore();
  const hasJoined = useRef(false);
  
  // YENİ: Timeout State
  const [isTimedOut, setIsTimedOut] = useState(false);
  
  const isDownloading = logs.some(l => l.includes('Downloading') || l.includes('İndirme'));
  const isFinished = logs.some(l => l.includes('COMPLETED') || l.includes('KAYDEDİLDİ'));
  const isConnected = connectionStatus.includes('CONNECTED') || connectionStatus.includes('BAĞLANDI');

  useEffect(() => {
    if (roomId && !hasJoined.current) {
      hasJoined.current = true;
      joinRoom(roomId);

      // YENİ: 15 Saniye Sayaç
      const timer = setTimeout(() => {
        const currentStatus = useTransferStore.getState().connectionStatus;
        if (!currentStatus.includes('CONNECTED') && !currentStatus.includes('BAĞLANDI')) {
          setIsTimedOut(true);
        }
      }, 15000); 

      return () => clearTimeout(timer);
    }
  }, [roomId, joinRoom]);

  return (
    <div className="container">
      <div className="main-layout">
        
        {/* SOL REKLAM */}
        <div className="ad-sidebar">📢 Ad Space (160x600)</div>

        {/* ORTA İÇERİK */}
        <div className="content-area">
          <div className="card" style={{ padding: '40px 20px' }}>
            
            {/* İkonlar */}
            <div style={{ fontSize: '80px', marginBottom: '30px' }}>
              {!isConnected && !isTimedOut && '⏳'}
              {isTimedOut && '⚠️'}
              {isConnected && !isDownloading && !isFinished && '🔗'}
              {isDownloading && !isFinished && '⬇️'}
              {isFinished && '🎉'}
            </div>

            {/* Durum: Timeout Hatası */}
            {isTimedOut && !isConnected && (
              <div>
                <h2 style={{ color: '#e74c3c' }}>Connection Timeout</h2>
                <p style={{ color: '#aaa' }}>Sender not found or offline.</p>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                  Please ensure the sender still has the page open.
                </p>
                <button onClick={() => window.location.reload()} style={{ marginTop: '20px', background: '#333' }}>Retry</button>
              </div>
            )}

            {/* Durum: Bağlanıyor */}
            {!isConnected && !isTimedOut && (
                <div>
                    <h2>Connecting to Peer...</h2>
                    <p style={{ color: '#666' }}>Establishing secure P2P tunnel.</p>
                </div>
            )}
            
            {/* Durum: Bağlandı */}
            {isConnected && !isDownloading && !isFinished && (
              <div>
                <h2 style={{ color: '#2ecc71' }}>Connected!</h2>
                <p>Waiting for sender to select the file...</p>
                <div className="loader" style={{ marginTop: '20px', color: '#666' }}>Ready to receive</div>
              </div>
            )}

            {/* Durum: İniyor */}
            {isDownloading && !isFinished && (
              <div>
                <h2 style={{ color: '#646cff' }}>Downloading File...</h2>
                <p style={{ color: '#aaa', marginTop: '10px' }}>Check your browser's download manager.</p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>Do not close this tab.</p>
              </div>
            )}

            {/* Durum: Bitti */}
            {isFinished && (
              <div>
                <h2 style={{ color: '#2ecc71' }}>Transfer Completed!</h2>
                <p>File saved to downloads folder.</p>
                <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px' }}>Send a File</button>
              </div>
            )}

          </div>
        </div>

        {/* SAĞ REKLAM */}
        <div className="ad-sidebar">📢 Ad Space (160x600)</div>

      </div>
    </div>
  );
};