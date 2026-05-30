import http from 'http';

const data = JSON.stringify({
    action: "APPROVE",
    auditorId: "Marcus Vance",
    overrideRationale: "Document generation should allow for a project to be open for public classsification. These are mainly test projects and do not contain client details but are rendered to be published in public to illustrate the effeciveness of the systems."
});

const options = {
    hostname: 'localhost',
    port: 3000,
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
