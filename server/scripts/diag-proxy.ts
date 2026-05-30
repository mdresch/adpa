import http from 'http';

const data = JSON.stringify({
    action: "APPROVE",
    auditorId: "Marcus Vance",
    overrideRationale: "Testing proxy for CTRL-COBIT-DSS05."
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/governance/ledger/1574db96-6ddd-43d5-8740-b2b47bdbcd47/adjudicate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
