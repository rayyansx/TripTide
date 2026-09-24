import { WS_BASE_URL } from '../config';
import { fetchWsToken } from './auth';
import { setSocketId } from './socketId';

/**
 * Mirrors client/src/api/websocket.ts: mint a one-shot ephemeral token over
 * REST (bearer-authenticated, same as any other call), then open the raw
 * `/ws` socket with it as a query param. The server's `welcome` frame hands
 * back a socketId that must be echoed as X-Socket-Id on REST writes so the
 * server excludes this socket's own change from the broadcast it triggers
 * (server/src/nest/realtime/realtime.gateway.ts, nest/README.md).
 */
export async function connectRealtime(onEvent: (msg: unknown) => void): Promise<WebSocket> {
  const token = await fetchWsToken();
  const socket = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg?.type === 'welcome' && msg.socketId != null) {
        setSocketId(String(msg.socketId));
      }
      onEvent(msg);
    } catch {
      // Non-JSON frame — ignore, same as the web client does.
    }
  };

  socket.onclose = () => setSocketId(undefined);

  return socket;
}
