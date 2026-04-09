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
    await checkPort(4000, 'Backend API Health', '/api/health');
    await checkPort(4000, 'Backend API Tree Traversal', '/api/workbench/tree?path=');
    await checkPort(5173, 'Frontend Vite Dev Server', '/');
}
run();
