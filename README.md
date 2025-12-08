# 🚀 PipeLine.web

> **Serverless, Limitless, Secure P2P File Transfer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Tech-React%20%7C%20WebRTC%20%7C%20TypeScript-blue)](https://reactjs.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-green)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

**PipeLine.web** is a modern file sharing application that allows users to send files of **any size** directly from device to device using **WebRTC**. No intermediate servers store your files, ensuring maximum privacy and speed.

---

## ✨ Features

- **🚀 Unlimited File Size:** Send 1 GB or 1 TB. Since there is no server storage, the only limit is your device's disk space.
- **🔒 End-to-End Encryption:** Data is transferred via secure WebRTC Data Channels (DTLS).
- **⚡ P2P Speed:** Direct connection between peers means the fastest possible transfer speed supported by your network.
- **💾 RAM Optimized:** Uses `StreamSaver.js` to write incoming data directly to the disk, preventing browser crashes on large files.
- **📱 Cross-Platform:** Works on any modern browser (Desktop & Mobile).
- **🌍 Network Traversal:** Integrated TURN servers (via Metered.ca) to bypass strict firewalls and NATs.

---

## 🏗️ Architecture

This project is built with strict **Clean Architecture** principles to ensure scalability, testability, and separation of concerns.

### Folder Structure

```
src/
├── core/                # The Brain (Framework Agnostic)
│   ├── domain/
│   │   ├── entities/    # Core business models (FileMetadata, Session)
│   │   ├── usecases/    # Business logic (SendFile, ReceiveFile)
│   │   └── repositories/# Abstract interfaces (IPeerRepository)
├── data/                # The Implementation (Dirty Layer)
│   ├── repositories/    # Concrete implementations (WebRTCPeerRepository, SocketSignaling)
├── presentation/        # The UI (React)
│   ├── components/      # Reusable UI components
│   ├── pages/           # Application views
│   └── store/           # State Management (Zustand) acts as Controllers/ViewModels
```

### Key Technologies

*   **Frontend:** React, TypeScript, Vite
*   **Core Protocol:** WebRTC (`simple-peer`)
*   **Signaling:** Node.js, Socket.io
*   **State Management:** Zustand
*   **File Handling:** StreamSaver.js (for handling large binary streams)
*   **Styling:** CSS Modules (Custom Dark Theme)

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

*   Node.js (v16 or higher)
*   npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/emirhannsarial/pipeline-web.git
cd pipeline-web
```

### 2. Setup Backend (Signaling Server)

```bash
cd server
npm install
# Create a .env file (Optional for local, defaults to port 3001)
node index.js
```
*Server will start on http://localhost:3001*

### 3. Setup Frontend (Client)

Open a new terminal:

```bash
cd client
npm install
```

### 4. Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_SERVER_URL=http://localhost:3001
# Optional: Get a free API Key from Metered.ca for better connectivity
VITE_METERED_API_KEY=your_metered_api_key
```

### 5. Run the App

```bash
npm run dev
```
*Open http://localhost:5173 in your browser.*

---

## 📚 How It Works?

1.  **Handshake:** Sender creates a room. The signaling server (Socket.io) exchanges connection details (SDP & ICE Candidates) between peers.
2.  **Tunneling:** A direct WebRTC connection is established. The signaling server disconnects (or stays idle).
3.  **Streaming:** The file is sliced into 64KB chunks.
4.  **Backpressure:** The sender monitors the buffer rate. If the network is slow, it pauses reading from the disk to prevent memory overflow.
5.  **Saving:** The receiver gets the chunks and writes them immediately to the hard drive using Streams.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/emirhannsarial">Emirhan Sarıal</a></sub>
</div>
