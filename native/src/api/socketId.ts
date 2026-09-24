/**
 * The socket id from the WS gateway's `welcome` frame, attached as
 * `X-Socket-Id` on every mutating REST call so the server can exclude this
 * client's own socket when broadcasting the result of its own write
 * (server/src/nest/realtime/realtime.gateway.ts). Kept in its own module so
 * api/client.ts and api/websocket.ts can both reach it without importing
 * each other.
 */
let socketId: string | undefined;

export function getSocketId(): string | undefined {
  return socketId;
}

export function setSocketId(id: string | undefined): void {
  socketId = id;
}
