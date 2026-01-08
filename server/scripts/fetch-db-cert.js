// Usage: node fetch-db-cert.js <host> [port] [outPath]
// Example: node fetch-db-cert.js db.blxzjbxczpmmgiwbtmdo.supabase.co 5432 ../certs/db-ca.pem

const tls = require('tls');
const fs = require('fs');
const path = require('path');

const host = process.argv[2];
const port = parseInt(process.argv[3] || '5432', 10);
const outPath = process.argv[4] || path.join(__dirname, '..', 'certs', 'db-ca.pem');

if (!host) {
  console.error('Usage: node fetch-db-cert.js <host> [port] [outPath]');
  process.exit(2);
}

(async () => {
  try {
    const socket = tls.connect({ host, port, rejectUnauthorized: false });
    await new Promise((resolve, reject) => {
      socket.once('error', reject);
      socket.once('secureConnect', resolve);
    });

    // getPeerCertificate(true) returns the full chain as nested issuerCertificate
    let cert = socket.getPeerCertificate(true);
    if (!cert || Object.keys(cert).length === 0) {
      console.error('No certificate received from server');
      process.exit(3);
    }

    const certs = [];
    const seen = new Set();
    while (cert && cert.raw && !seen.has(cert.fingerprint)) {
      seen.add(cert.fingerprint);
      const pem = toPem(cert.raw);
      certs.push(pem);
      if (!cert.issuerCertificate || cert.issuerCertificate === cert) break;
      cert = cert.issuerCertificate;
    }

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    // Write entire chain (server -> intermediates -> root)
    fs.writeFileSync(outPath, certs.join('\n'));

    console.log('Wrote certificate chain to', outPath);
    console.log('Top cert (server) fingerprint:', certs.length ? certs[0].slice(0,80) + '...' : 'n/a');
    socket.end();
    process.exit(0);
  } catch (err) {
    console.error('Error fetching cert chain:', err && err.message ? err.message : err);
    process.exit(4);
  }
})();

function toPem(raw) {
  const b64 = raw.toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return ['-----BEGIN CERTIFICATE-----', ...lines, '-----END CERTIFICATE-----'].join('\n');
}
