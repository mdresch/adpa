const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImM5YTBjMWRlYWEyN2JjNjMyNTUzYmM4MWEyMmQ4NzY1MWM3MTMyY2IiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWRwYS1mcm9udGVuZCIsImF1ZCI6ImFkcGEtZnJvbnRlbmQiLCJhdXRoX3RpbWUiOjE3ODAwMTE5MzAsInVzZXJfaWQiOiI2OUkyZ2lhbnFXU0RMb0JiZWFsU2VvUFE2dnQyIiwic3ViIjoiNjlJMmdpYW5xV1NETG9CYmVhbFNlb1BRNnZ0MiIsImlhdCI6MTc4MDAxMTkzMCwiZXhwIjoxNzgwMDE1NTMwLCJlbWFpbCI6Im1lbm5vLmRyZXNjaGVyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbIm1lbm5vLmRyZXNjaGVyQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.-zZx0t5-VY0jlVcnw5a1eKxslzPywQvg3dZfaHs4WcR4skPdCzdC1-kgnVzW5Gdppga7Y5Jemye_O9_dudDwr-9lpy5im9yArpMI3Iv6dnM1zd1qLQaC0fINHwvFT-Po0NjPOY1e-rRRwI61CgzIf7g1E9Pt6V3LrW9bUXqnM7kFCcJwGEVZrDhlGB_4H_sbIg_BzPLj2ObCB5k4zo_SM0RakRtkBEHe6liWhKVmexvOYimlunYLe9LDV5xRrT3-SXVT98xxBuX95SWH5Fcf5KoU7IBYC7eVZqqFr3tR3Z13nFsHW-sEYyR7wCDIC5bsoiDXm2WN4fTx2CuldUBLjA";

async function run() {
    try {
        const res1 = await fetch('http://localhost:5000/api/jobs/admin/all?limit=50', { headers: { 'Authorization': 'Bearer ' + token } });
        console.log("api/jobs/admin/all:", res1.status, await res1.text());
        
        const res2 = await fetch('http://localhost:5000/jobs/admin/all?limit=50', { headers: { 'Authorization': 'Bearer ' + token } });
        console.log("jobs/admin/all:", res2.status, await res2.text());
    } catch(e) {
        console.error(e);
    }
}
run();
