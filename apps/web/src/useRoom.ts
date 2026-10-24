import { useEffect, useState } from 'react';
import type { PublicState } from '../../../packages/game/src/schema.js';
export type Snapshot = { state: PublicState; transport: string; gap: boolean };
export function useRoom() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(false);
  useEffect(() => {
    let stopped = false, socket: WebSocket | null = null, timer: ReturnType<typeof setTimeout>;
    let lastSeq = -1;
    function connect() {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/room/main`);
      let first = true;
      socket.onopen = () => { setOnline(true); };
      socket.onmessage = e => {
        try {
          const next = JSON.parse(e.data) as Snapshot;
          if (!next.state || !Number.isInteger(next.state.seq)) return;
          // A fresh connection supplies the authoritative full snapshot, including after server reset.
          if (first || next.state.seq >= lastSeq) { first = false; lastSeq = next.state.seq; setSnapshot(next); }
        } catch { /* Ignore malformed view data. */ }
      };
      socket.onclose = () => { if (!stopped) { setOnline(false); timer = setTimeout(connect, 1500); } };
      socket.onerror = () => socket?.close();
    }
    connect();
    return () => { stopped = true; clearTimeout(timer); socket?.close(); };
  }, []);
  return { snapshot, online };
}
