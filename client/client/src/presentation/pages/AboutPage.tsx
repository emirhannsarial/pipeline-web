export const AboutPage = () => (
  <div className="container" style={{ maxWidth: '800px', textAlign: 'left', marginTop: '40px' }}>
    <h1>About PipeLine.web</h1>
    <p>PipeLine.web is a modern, serverless file sharing tool designed for speed and privacy.</p>
    
    <h3>How it works?</h3>
    <p>Unlike traditional cloud services (Google Drive, WeTransfer), we do not store your files. We use <strong>WebRTC</strong> technology to create a direct tunnel between the sender and the receiver.</p>
    
    <h3>Why is it free?</h3>
    <p>Since we don't have expensive server storage costs, we can offer this service for free. We use ads to cover the minimal costs of signaling servers.</p>
  </div>
);