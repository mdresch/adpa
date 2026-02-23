import { Server as SocketIOServer } from "socket.io"
import { Server as HttpServer } from "http"
import { logger } from "./utils/logger"

let ioInstance: SocketIOServer | null = null

export function initSocketIO(server: HttpServer): SocketIOServer {
    const io = new SocketIOServer(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true)

                const allowedOrigins = [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    process.env.FRONTEND_URL,
                    /https:\/\/.*\.vercel\.app$/,
                    /https:\/\/adpa.*\.vercel\.app$/,
                    "https://adpa.vercel.app",
                    "https://adpa-production.up.railway.app",
                ]

                // Check if origin matches any allowed pattern
                const isAllowed = allowedOrigins.some(allowed => {
                    if (!allowed) return false
                    if (typeof allowed === 'string') {
                        return allowed === origin
                    }
                    if (allowed instanceof RegExp) {
                        return allowed.test(origin)
                    }
                    return false
                })

                if (isAllowed) {
                    callback(null, true)
                } else {
                    console.warn(`Socket.IO CORS blocked origin: ${origin}`)
                    callback(new Error(`Origin ${origin} not allowed by CORS`))
                }
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    })

    ioInstance = io
    return io
}

/**
 * Returns the Socket.IO server instance. 
 * If not initialized (e.g. during Next.js build), returns a dummy proxy object.
 */
export function getIO(): SocketIOServer {
    if (!ioInstance) {
        // Return a dummy object if not initialized, to prevent crashes in non-socket environments (like Next.js build)
        return {
            emit: () => false,
            to: () => ({ emit: () => false }),
            on: () => { },
            off: () => { },
        } as any
    }
    return ioInstance
}

// Named export for the instance to support existing code expecting the raw object
// Use a proxy so it always resolves to the current instance (or dummy)
export const io: SocketIOServer = new Proxy({} as SocketIOServer, {
    get(target, prop, receiver) {
        return Reflect.get(getIO(), prop, receiver)
    },
    apply(target, thisArg, argumentsList) {
        return Reflect.apply(getIO() as any, thisArg, argumentsList)
    }
})

// Support dynamic access via property if needed
export const socketProvider = {
    get instance() {
        return getIO()
    }
}
