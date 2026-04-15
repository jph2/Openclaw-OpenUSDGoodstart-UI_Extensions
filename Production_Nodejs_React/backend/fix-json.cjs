const fs = require('fs');
const path = '/home/claw-agentbox/.openclaw/openclaw.json';
try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    let changed = false;
    const groups = data.channels && data.channels.telegram && data.channels.telegram.groups;
    if (groups) {
        for (const key in groups) {
            if (groups[key].model !== undefined) {
                delete groups[key].model;
                changed = true;
            }
        }
    }
    if (changed) {
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        console.log('Fixed openclaw.json: Removed unauthorized `model` properties.');
    } else {
        console.log('No `model` properties found to remove.');
    }
} catch (e) {
    console.error(e);
}
