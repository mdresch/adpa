import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { Server } from 'http';

class StreamingBus extends EventEmitter {
    private io: SocketIOServer | null = null;

    attach(httpServer: Server) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: "*", // Configure for production
                methods: ["GET", "POST"]
            }
        });

        this.io.on('connection', (socket) => {
            logger.info(`[StreamingBus] Client connected: ${socket.id}`);
            
            socket.on('subscribeToRun', (runId: string) => {
                logger.info(`[StreamingBus] Client ${socket.id} subscribed to run ${runId}`);
                socket.join(runId);
            });

            socket.on('unsubscribeFromRun', (runId: string) => {
                logger.info(`[StreamingBus] Client ${socket.id} unsubscribed from run ${runId}`);
                socket.leave(runId);
            });

            socket.on('disconnect', () => {
                logger.info(`[StreamingBus] Client disconnected: ${socket.id}`);
            });
        });

        logger.info('[StreamingBus] WebSocket server attached and listening.');
    }

    emitToRun(runId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(runId).emit(event, data);
        }
        // Also emit locally for in-process listeners
        this.emit(runId, { event, data });
    }
}

export const streamingBus = new StreamingBus();
