import { EventEmitter } from 'events';

/**
 * Lightweight Telegram Synchronization Broker
 * We use a native Node.js EventEmitter as the core message bus.
 * Since we operate with a max of 15 channels and 2 participants (Human + Agent),
 * this completely eliminates the need for enterprise message queues like Redis or RabbitMQ.
 */
class SyncBroker extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // 15 channels * roughly 3 listeners (Telegram API, React UI, MCP Agent)
    }

    /**
     * Emits a message from any source (Telegram, React, MCP) uniformly to all listeners
     * tied to a specific channelId.
     */
    broadcastMessage(channelId, source, payload) {
        this.emit(`message:${channelId}`, { source, timestamp: Date.now(), ...payload });
    }

    /**
     * Subscribes a client (e.g. WebSocket connection from React UI or MCP tool)
     * to a specific channel's message stream.
     */
    subscribe(channelId, listenerFn) {
        this.on(`message:${channelId}`, listenerFn);
        return () => this.off(`message:${channelId}`, listenerFn); // returning an unsubscribe function to prevent memory leaks!
    }
}

// Export singleton instance mapped directly to the single Node.js process memory
export const broker = new SyncBroker();
