import { useState } from 'react';
import { useTransferStore } from '../store/useTransferStore';
import QRCode from "react-qr-code";
export const HomePage = () => {
  const { createRoom, roomId, connectionStatus, progress, selectedFile, selectFile, transferState, resetTransfer } = useTransferStore();
  const [showToast, setShowToast] = useState(false);
  
  const shareLink = roomId ? `${window.location.origin}/download/${roomId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const isConnected = connectionStatus.includes('CONNECTED') || connectionStatus.includes('BAĞLANDI');

  return (
    <div className="container">
      {/* 3 Sütunlu Yapı */}
      <div className="main-layout">
        
        {/* SOL REKLAM (Masaüstünde görünür) */}
        <div className="ad-sidebar">
          📢 Ad Space (160x600)
        </div>

        {/* ORTA İÇERİK */}
        <div className="content-area">
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Send Files Without Limits</h1>
            <p style={{ color: '#aaa', fontSize: '1.2rem' }}>
              Direct P2P transfer. No file size limit. No servers. Just you and the receiver.
            </p>
          </div>

          {/* Durum 1: Dosya Seç */}
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

          {/* Durum 2: Link Oluştur */}
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

          {/* Durum 3: Paylaş ve Bekle */}
          {roomId && (
            <div className="card">
              <div className={`status-badge ${isConnected ? 'status-connected' : 'status-waiting'}`}>
                {isConnected ? '🟢 Peer Connected - Transferring' : '🟡 Waiting for Peer...'}
              </div>

              {/* Link Paylaşımı Kısmı */}
          {!isConnected && (
            <>
              <p style={{ marginBottom: '10px' }}>Send this link to the receiver:</p>
              
              {/* QR KOD ALANI (YENİ) */}
              <div style={{ background: 'white', padding: '10px', width: 'fit-content', margin: '0 auto 20px auto', borderRadius: '8px' }}>
                  <QRCode value={shareLink} size={128} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <input type="text" readOnly value={shareLink} onClick={(e) => e.currentTarget.select()} />
                <button onClick={copyToClipboard}>Copy Link</button>
              </div>
              
              {/* ... */}
            </>
          )}

              {/* İlerleme ve Durum */}
          {isConnected && (
            <div style={{ marginTop: '30px', textAlign: 'left' }}>
              
              {/* DURUM: REDDEDİLDİ */}
              {transferState === 'REJECTED' && (
                <div style={{ textAlign: 'center', color: '#e74c3c' }}>
                  <h3>❌ Receiver Rejected the File</h3>
                  <p>They chose not to download {selectedFile?.name}.</p>
                  <button onClick={resetTransfer} style={{ marginTop: '15px', background: '#333' }}>
                    Try Again
                  </button>
                </div>
              )}

              {/* DURUM: NORMAL TRANSFER */}
              {transferState !== 'REJECTED' && (
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

              {/* DURUM: TAMAMLANDI */}
              {transferState === 'COMPLETED' && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                   <h3 style={{ color: '#2ecc71' }}>✅ Transfer Successful!</h3>
                   <button onClick={() => window.location.reload()} style={{ marginTop: '10px', background: '#333' }}>Send Another File</button>
                </div>
              )}
            </div>
          )}
              
            </div>
          )}
        </div>

        {/* SAĞ REKLAM */}
        <div className="ad-sidebar">
          📢 Ad Space (160x600)
        </div>
      </div>

{/* --- ADSENSE İÇİN SEO İÇERİK BLOĞU --- */}
      <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'left', color: '#888', lineHeight: '1.8' }}>
        <hr style={{ borderColor: '#333', marginBottom: '40px' }} />
        
        <h2>Why Choose AirShift for File Transfer?</h2>
        <p>
          In the digital age, sharing large files shouldn't be complicated. AirShift offers a revolutionary approach to file sharing by utilizing <strong>WebRTC technology</strong>. Unlike traditional services like WeTransfer or Google Drive, we do not store your files on any server.
        </p>

        <h3>🚀 Truly Unlimited File Sharing</h3>
        <p>
          Most email services limit attachments to 25MB. Cloud services often require you to pay for extra storage. With AirShift, the only limit is your device's storage. Whether you are sending a 100GB video project or a massive database backup, our P2P AirShift handles it with ease.
        </p>

        <h3>🔒 End-to-End Encryption & Privacy</h3>
        <p>
          Your privacy is our priority. Since your files are streamed directly from the sender to the receiver, there is no "middleman". We cannot see your files, and hackers cannot intercept them from a central server because there isn't one. All data is encrypted using <strong>DTLS (Datagram Transport Layer Security)</strong> standards.
        </p>

        <h3>⚡ Blazing Fast P2P Speed</h3>
        <p>
          Why wait for a file to upload to a server, only to wait again for it to download? AirShift streams data in real-time. If you are on the same Wi-Fi network, transfers happen at local network speeds (LAN), which can be up to 10x faster than cloud uploads.
        </p>

        <h3>📱 No Registration Required</h3>
        <p>
          We believe in simplicity. You don't need to create an account, verify an email, or remember another password. Just select a file, copy the secure link, and share it. It works on Windows, macOS, Android, and iOS directly from the browser.
        </p>
      </div>
      {/* ------------------------------------- */}

    {showToast && <div className="toast">✅ Link copied to clipboard!</div>}
    </div>
  );
  
};