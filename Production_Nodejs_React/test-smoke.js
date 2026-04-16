import http from 'http';

const checkPort = (port, name, path = '/') => new Promise((resolve) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
        console.log(`[PASS] ${name} responded with ${res.statusCode}`);
        resolve(res.statusCode === 200);
    }).on('error', (err) => {
        console.log(`[FAIL] ${name} is unreachable: ${err.message}`);
        resolve(false);
    });
});

async function run() {
    console.log('Running Ping Smoke Tests...\n');
    const apiPort = Number(process.env.PORT || 3000);
    await checkPort(apiPort, 'Backend API Health', '/api/health');
    await checkPort(apiPort, 'Backend API Tree Traversal', '/api/workbench/tree?path=');
    await checkPort(5173, 'Frontend Vite Dev Server', '/');
}
run();
