import http from 'http';

const data = JSON.stringify({
    action: "APPROVE",
    auditorId: "Marcus Vance",
    overrideRationale: "Manual unblocking of GOV-SEC-001 for test purposes."
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/governance/ledger/28883a1b-3ff5-483e-85fb-9c3d5a33c53e/adjudicate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
        console.log(`BODY: ${body}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
