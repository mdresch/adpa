import { createClient } from 'redis';

const url = process.env.REDIS_URL || 'redis://default:GcEetitDQRMugNrjhTjCoGyovCKnOZRZ@turntable.proxy.rlwy.net:55348';

(async () => {
  const client = createClient({ url, socket: { keepAlive: 60000, reconnectStrategy: retries => Math.min(retries * 50, 2000) } });
  client.on('error', err => {
    console.error('Redis client error:', err);
  });

  try {
    await client.connect();
    const pong = await client.ping();
    console.log('PING ->', pong);
    await client.disconnect();
    process.exit(pong === 'PONG' ? 0 : 2);
  } catch (err) {
    console.error('Connection failed:', err);
    try { await client.disconnect(); } catch (_) {}
    process.exit(2);
  }
})();
