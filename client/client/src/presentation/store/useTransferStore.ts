import { create } from 'zustand';
import { SocketSignalingRepository } from '../../data/repositories/SocketSignalingRepository';
import { WebRTCPeerRepository } from '../../data/repositories/WebRTCPeerRepository';
import { SendFileUseCase } from '../../core/domain/usecases/SendFileUseCase';
import { ReceiveFileUseCase } from '../../core/domain/usecases/ReceiveFileUseCase';
import type { FileMetadata } from '../../core/domain/entities/FileMetadata';
import { io } from 'socket.io-client';

// Wake Lock Değişkeni
let wakeLock: WakeLockSentinel | null = null;

// Ekranı Kilitleme Fonksiyonu
const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('💡 Screen Wake Lock active (Ekran açık tutuluyor)');
        } catch (err) {
            // DÜZELTME: 'any' yerine 'as Error' kullanımı
            const error = err as Error;
            console.error(`Wake Lock Error: ${error.name}, ${error.message}`);
        }
    }
};

// Kilidi Kaldırma Fonksiyonu
const releaseWakeLock = async () => {
    if (wakeLock) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('🌑 Screen Wake Lock released (Ekran serbest)');
        } catch (err) {
            // DÜZELTME: 'any' yerine 'as Error' kullanımı
            const error = err as Error;
            console.error(`Wake Lock Release Error: ${error.name}`);
        }
    }
};

// Server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);
const signalingRepo = new SocketSignalingRepository(socket);
const peerRepo = new WebRTCPeerRepository();
const sendFileUseCase = new SendFileUseCase(peerRepo);
const receiveFileUseCase = new ReceiveFileUseCase();

interface TransferState {
    roomId: string;
    connectionStatus: string;
    logs: string[];
    remotePeerId: string | null;
    progress: number;
    selectedFile: File | null;
    incomingMetadata: FileMetadata | null;
    transferState: 'IDLE' | 'WAITING_ACCEPT' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR' | 'REJECTED';
    senderLeft: boolean;
    
    // Actions
    createRoom: () => void;
    joinRoom: (roomId: string) => void;
    addLog: (msg: string) => void;
    selectFile: (file: File) => void;
    
    acceptDownload: () => void; 
    rejectDownload: () => void;
    resetTransfer: () => void;
}

type GetState = () => TransferState;
type SetState = (partial: Partial<TransferState>) => void;

export const useTransferStore = create<TransferState>((set, get) => ({
    roomId: '',
    connectionStatus: 'Idle',
    logs: [],
    remotePeerId: null,
    progress: 0,
    selectedFile: null,
    incomingMetadata: null,
    transferState: 'IDLE',
    senderLeft: false,

    addLog: (msg) => set((state) => ({ logs: [...state.logs, msg] })),

    resetTransfer: () => {
        set({ 
            transferState: 'IDLE', 
            progress: 0, 
            incomingMetadata: null,
        });
        releaseWakeLock(); // Resetlenince kilidi aç
    },

    selectFile: (file: File) => {
        set({ selectedFile: file, transferState: 'IDLE', progress: 0 });
        if (get().connectionStatus.includes('CONNECTED')) {
             sendMetadata(file);
        }
    },

    acceptDownload: async () => {
        const meta = get().incomingMetadata;
        if (!meta) return;

        try {
            await receiveFileUseCase.startDownload(meta); 
            set({ transferState: 'TRANSFERRING' });
            
            await requestWakeLock();
            
            peerRepo.sendData(JSON.stringify({ type: 'STATUS', status: 'DOWNLOAD_STARTED' }));
        } catch (error) { 
            get().addLog(`Download cancelled: ${error}`);
        }
    },

    rejectDownload: () => {
        set({ incomingMetadata: null, transferState: 'IDLE' });
        peerRepo.sendData(JSON.stringify({ type: 'STATUS', status: 'DOWNLOAD_REJECTED' }));
    },

    createRoom: async () => {
        const roomId = import.meta.env.MODE === 'development' ? 'test' : crypto.randomUUID().slice(0, 8);
        set({ roomId, connectionStatus: 'Link Created. Waiting...' });

        await signalingRepo.joinRoom(roomId);
        
        signalingRepo.onUserConnected((userId) => {
            get().addLog(`Peer connected: ${userId}`);
            set({ remotePeerId: userId });
            peerRepo.initialize(true);
            bindPeerEvents(userId, get, set);
        });

        signalingRepo.onSignalReceived((_, signal) => peerRepo.signal(signal));
        
        signalingRepo.onPeerDisconnected(() => {
            set({ senderLeft: true, connectionStatus: 'DISCONNECTED' });
            releaseWakeLock();
        });
    },

    joinRoom: async (roomId) => {
        set({ roomId, connectionStatus: 'Connecting...' });
        await signalingRepo.joinRoom(roomId);
        
        peerRepo.initialize(false);
        bindPeerEvents("WAITING_FOR_SENDER", get, set);

        signalingRepo.onSignalReceived((senderId, signal) => {
            set({ remotePeerId: senderId });
            peerRepo.signal(signal);
        });

        signalingRepo.onPeerDisconnected(() => {
            set({ senderLeft: true, connectionStatus: 'DISCONNECTED' });
            releaseWakeLock();
        });
    }
}));

function sendMetadata(file: File) {
    const metadata = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type
    };
    useTransferStore.setState({ transferState: 'WAITING_ACCEPT' }); 
    peerRepo.sendData(JSON.stringify({ type: 'METADATA', payload: metadata }));
}

async function startSendingData(file: File, get: GetState, set: SetState) {
    set({ transferState: 'TRANSFERRING' });
    
    await requestWakeLock();

    try {
        await sendFileUseCase.execute(file, (progress) => {
            set({ progress });
        });
        set({ transferState: 'COMPLETED' });
        get().addLog("✅ File sent successfully!");
        releaseWakeLock(); 
    } catch (error) {
        get().addLog(`❌ Error: ${error}`);
        set({ transferState: 'ERROR' });
        releaseWakeLock(); 
    }
}

function bindPeerEvents(targetId: string, get: GetState, set: SetState) {
    peerRepo.onSignal((signal) => {
        const currentTarget = get().remotePeerId || targetId;
        if (currentTarget === "WAITING_FOR_SENDER") return; 
        signalingRepo.sendSignal(currentTarget, signal);
    });

    peerRepo.onConnect(() => {
        set({ connectionStatus: 'CONNECTED (P2P)', senderLeft: false });
        if (!get().selectedFile) {
            peerRepo.sendData(JSON.stringify({ type: 'HELLO' }));
        }
    });
    
    peerRepo.onData((data: string | ArrayBuffer | Uint8Array) => {
        const bufferData = (typeof data === 'string') 
            ? new TextEncoder().encode(data) 
            : (data instanceof Uint8Array ? data : new Uint8Array(data));

        let isCommand = false;

        try {
            const textDecoder = new TextDecoder();
            const textString = textDecoder.decode(bufferData);

            if (textString.trim().startsWith('{') && textString.trim().endsWith('}')) {
                const msg = JSON.parse(textString);

                if (msg.type === 'HELLO') {
                    isCommand = true;
                    get().addLog("Receiver is ready.");
                    const file = get().selectedFile;
                    if (file) sendMetadata(file);
                }

                else if (msg.type === 'METADATA') {
                    isCommand = true;
                    set({ incomingMetadata: msg.payload }); 
                    get().addLog(`📄 Offer: ${msg.payload.name}`);
                }
                
                else if (msg.type === 'STATUS') {
                    isCommand = true;
                    if (msg.status === 'DOWNLOAD_STARTED') {
                        get().addLog("Receiver accepted. Sending started...");
                        const file = get().selectedFile;
                        if (file) startSendingData(file, get, set);
                    }
                    else if (msg.status === 'DOWNLOAD_REJECTED') {
                        get().addLog("Receiver rejected the file.");
                        set({ transferState: 'IDLE' });
                    }
                }
            }
        } catch {
            // DÜZELTME: ESLint'i mutlu etmek için yorum ekledik
            // Not a JSON/Text message, probably binary chunk. Continue.
        }

        if (!isCommand) {
            if (get().transferState !== 'TRANSFERRING') return;

            receiveFileUseCase.processChunk(bufferData.buffer as ArrayBuffer, (progress) => {
                 set({ progress });
                 if (progress === 100) {
                     set({ transferState: 'COMPLETED', incomingMetadata: null });
                     get().addLog("🎉 Completed!");
                     releaseWakeLock(); 
                 }
            });
        }
    });

    peerRepo.onError((err) => {
        set({ connectionStatus: 'ERROR', logs: [...get().logs, `Err: ${err.message}`] });
        releaseWakeLock();
    });
    peerRepo.onClose(() => {
        set({ connectionStatus: 'DISCONNECTED', senderLeft: true });
        releaseWakeLock();
    });
}