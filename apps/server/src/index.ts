import { config } from './config.js';
import { createApp } from './server.js';
const cfg = config();
const app = await createApp(cfg, { vite: !cfg.production });
await app.listen();
console.log(`RallyRoom: http://localhost:${cfg.port} • ${cfg.mode.toUpperCase()}`);
console.log(`OBS browser source: http://localhost:${cfg.port}/overlay`);
console.log('Dashboard control key: private file .data/control-key (or configured CONTROL_KEY). Tokens never enter the overlay URL.');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => process.exit(0)); });
