import { create } from 'zustand';
import { SocketSignalingRepository } from '../../data/repositories/SocketSignalingRepository';
import { WebRTCPeerRepository } from '../../data/repositories/WebRTCPeerRepository';
import { SendFileUseCase } from '../../core/domain/usecases/SendFileUseCase';
import { ReceiveFileUseCase } from '../../core/domain/usecases/ReceiveFileUseCase';
import type { FileMetadata } from '../../core/domain/entities/FileMetadata';
import { io } from 'socket.io-client';

// --- WAKE LOCK (EKRAN AÇIK TUTMA) ---
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('💡 Screen Wake Lock active');
        } catch (err) {
            // Wake lock hatası kritik değildir, loglayıp geçiyoruz
            console.warn('Wake Lock failed:', err);
        }
    }
};

const releaseWakeLock = async () => {
    if (wakeLock) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('🌑 Screen Wake Lock released');
        } catch (err) {
            console.warn('Wake Lock release failed:', err);
        }
    }
};

// --- BAĞIMLILIKLAR ---
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);
const signalingRepo = new SocketSignalingRepository(socket);
const peerRepo = new WebRTCPeerRepository();
const sendFileUseCase = new SendFileUseCase(peerRepo);
const receiveFileUseCase = new ReceiveFileUseCase();

// --- STATE TİPLERİ ---
interface TransferState {
    roomId: string;
    connectionStatus: string;
    logs: string[];
    remotePeerId: string | null;
    progress: number;
    selectedFile: File | null;
    incomingMetadata: FileMetadata | null;
    // REJECTED ve ERROR durumları eklendi
    transferState: 'IDLE' | 'WAITING_ACCEPT' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR' | 'REJECTED';
    peerLeft: boolean; // Karşı tarafın koptuğunu anlatan bayrak
    
    // Actions
    createRoom: () => void;
    joinRoom: (roomId: string) => void;
    addLog: (msg: string) => void;
    selectFile: (file: File) => void;
    
    acceptDownload: () => void; 
    rejectDownload: () => void;
    resetTransfer: () => void;
    disconnect: () => void;
}

type GetState = () => TransferState;
type SetState = (partial: Partial<TransferState>) => void;

// --- STORE ---
export const useTransferStore = create<TransferState>((set, get) => ({
    roomId: '',
    connectionStatus: 'Idle',
    logs: [],
    remotePeerId: null,
    progress: 0,
    selectedFile: null,
    incomingMetadata: null,
    transferState: 'IDLE',
    peerLeft: false,

    addLog: (msg) => set((state) => ({ logs: [...state.logs, msg] })),

    // Tamamen sıfırlama (Yeni transfer için)
    resetTransfer: () => {
        set({ 
            transferState: 'IDLE', 
            progress: 0, 
            incomingMetadata: null,
            // selectedFile'ı koruyoruz ki gönderici aynı dosyayı tekrar deneyebilsin
        });
        releaseWakeLock();
    },

    // Uygulamadan çıkış
    disconnect: () => {
        window.location.href = '/';
    },

    selectFile: (file: File) => {
        set({ selectedFile: file, transferState: 'IDLE', progress: 0 });
        // Eğer zaten bağlıysa, dosya bilgisini hemen gönder
        const status = get().connectionStatus;
        if (status.includes('CONNECTED') || status.includes('Bağlandı')) {
             sendMetadata(file);
        }
    },

    acceptDownload: async () => {
        const meta = get().incomingMetadata;
        if (!meta) return;

        try {
            // İndirme penceresini aç
            await receiveFileUseCase.startDownload(meta); 
            
            set({ transferState: 'TRANSFERRING' });
            await requestWakeLock(); // Ekranı kilitle
            
            // Göndericiye "Başla" komutu ver
            peerRepo.sendData(JSON.stringify({ type: 'STATUS', status: 'DOWNLOAD_STARTED' }));
        } catch (error) { 
            get().addLog(`Download cancelled: ${error}`);
        }
    },

    rejectDownload: () => {
        // Alıcı tarafında durumu sıfırla (veya REJECTED yapıp UI gösterebilirsin)
        set({ incomingMetadata: null, transferState: 'REJECTED' });
        
        // Göndericiye haber ver
        peerRepo.sendData(JSON.stringify({ type: 'STATUS', status: 'DOWNLOAD_REJECTED' }));
    },

    createRoom: async () => {
        const roomId = import.meta.env.MODE === 'development' ? 'test' : crypto.randomUUID().slice(0, 8);
        set({ roomId, connectionStatus: 'Link Created. Waiting...', peerLeft: false });

        await signalingRepo.joinRoom(roomId);
        
        signalingRepo.onUserConnected((userId) => {
            get().addLog(`Peer connected: ${userId}`);
            set({ remotePeerId: userId, peerLeft: false });
            peerRepo.initialize(true);
            bindPeerEvents(userId, get, set);
        });

        // TypeScript hatasını önlemek için _ kullandık
        signalingRepo.onSignalReceived((_, signal) => peerRepo.signal(signal));
        
        signalingRepo.onPeerDisconnected(() => {
            set({ peerLeft: true, connectionStatus: 'DISCONNECTED' });
            releaseWakeLock();
        });
    },

    joinRoom: async (roomId) => {
        set({ roomId, connectionStatus: 'Connecting...', peerLeft: false });
        await signalingRepo.joinRoom(roomId);
        
        peerRepo.initialize(false);
        bindPeerEvents("WAITING_FOR_SENDER", get, set);

        signalingRepo.onSignalReceived((senderId, signal) => {
            set({ remotePeerId: senderId, peerLeft: false });
            peerRepo.signal(signal);
        });

        signalingRepo.onPeerDisconnected(() => {
            set({ peerLeft: true, connectionStatus: 'DISCONNECTED' });
            releaseWakeLock();
        });
    }
}));

// --- YARDIMCI FONKSİYONLAR ---

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
    } catch {
            // Not a JSON message, ignore.
        }
}

function bindPeerEvents(targetId: string, get: GetState, set: SetState) {
    peerRepo.onSignal((signal) => {
        const currentTarget = get().remotePeerId || targetId;
        if (currentTarget === "WAITING_FOR_SENDER") return; 
        signalingRepo.sendSignal(currentTarget, signal);
    });

    peerRepo.onConnect(() => {
        set({ connectionStatus: 'CONNECTED (P2P)', peerLeft: false });
        
        // Alıcıysak, göndericiye hazır olduğumuzu bildiriyoruz (HELLO)
        if (!get().selectedFile) {
            peerRepo.sendData(JSON.stringify({ type: 'HELLO' }));
        }
    });
    
    peerRepo.onData((data: string | ArrayBuffer | Uint8Array) => {
        const bufferData = (typeof data === 'string') 
            ? new TextEncoder().encode(data) 
            : (data instanceof Uint8Array ? data : new Uint8Array(data));

        let isCommand = false;

        // JSON Kontrolü (Komutlar için)
        try {
            const textDecoder = new TextDecoder();
            const textString = textDecoder.decode(bufferData);

            // Sadece JSON formatına benziyorsa parse et
            if (textString.trim().startsWith('{') && textString.trim().endsWith('}')) {
                const msg = JSON.parse(textString);

                // 1. HELLO (Alıcı Hazır)
                if (msg.type === 'HELLO') {
                    isCommand = true;
                    get().addLog("Receiver is ready.");
                    const file = get().selectedFile;
                    if (file) sendMetadata(file);
                }

                // 2. METADATA (Dosya Bilgisi Geldi)
                else if (msg.type === 'METADATA') {
                    isCommand = true;
                    set({ incomingMetadata: msg.payload, transferState: 'IDLE' }); 
                    get().addLog(`📄 Offer: ${msg.payload.name}`);
                }
                
                // 3. STATUS (Durum Güncellemeleri)
                else if (msg.type === 'STATUS') {
                    isCommand = true;
                    if (msg.status === 'DOWNLOAD_STARTED') {
                        const file = get().selectedFile;
                        if (file) startSendingData(file, get, set);
                    }
                    else if (msg.status === 'DOWNLOAD_REJECTED') {
                        get().addLog("Receiver rejected the file.");
                        set({ transferState: 'REJECTED' }); // Göndericiye reddedildiğini bildir
                    }
                }
            }
        } catch {
            // JSON değilse binary veridir, hatayı yutuyoruz.
        }

        // Binary Veri İşleme (Dosya Parçaları)
        if (!isCommand) {
            // Sadece TRANSFERRING durumundaysak veriyi işle
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
    
    // WebRTC koptuğunda
    peerRepo.onClose(() => {
        set({ connectionStatus: 'DISCONNECTED', peerLeft: true });
        releaseWakeLock();
    });
}