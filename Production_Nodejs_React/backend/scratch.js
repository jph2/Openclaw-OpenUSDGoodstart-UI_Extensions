import chokidar from 'chokidar';
import path from 'path';

const agentsDir = path.resolve('/home/claw-agentbox', '.openclaw/agents');

console.log(`Watching: ${agentsDir}`);

const watcher = chokidar.watch(agentsDir, {
    persistent: true,
    ignoreInitial: false,
    usePolling: true,
    interval: 500,
    depth: 3
});

watcher.on('add', (fp) => {
    if (fp.endsWith('.jsonl')) console.log('ADDED:', fp);
});
watcher.on('ready', () => {
    console.log('Initial scan complete. Ready for changes.');
    process.exit(0);
});
