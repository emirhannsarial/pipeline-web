export const PrivacyPage = () => (
  <div className="container" style={{ maxWidth: '800px', textAlign: 'left', marginTop: '40px' }}>
    <h1>Privacy Policy</h1>
    <p>Last updated: {new Date().getFullYear()}</p>
    
    <h3>1. Data Collection</h3>
    <p>We do NOT store any files you transfer. Files travel directly from your device to the receiver's device.</p>
    
    <h3>2. Signaling Data</h3>
    <p>Our servers only facilitate the connection handshake. This metadata is deleted immediately after the connection is established.</p>
    
    <h3>3. Cookies</h3>
    <p>We do not use tracking cookies. Third-party ad vendors (like Google) may use cookies to serve ads based on your prior visits.</p>
  </div>
);