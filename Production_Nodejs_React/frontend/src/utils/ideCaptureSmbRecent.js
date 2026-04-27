/**
 * Recently used SMB capture form values — browser localStorage only (no password).
 */
const STORAGE_KEY = 'cm.ide_capture.smb.recent.v1';
const MAX_PROFILES = 14;

function profileDedupeKey(p) {
    return [
        String(p.host || '').trim().toLowerCase(),
        String(p.share || '').trim().toLowerCase(),
        String(p.username || '').trim().toLowerCase(),
        String(p.mountPoint || '').trim(),
        String(p.domain || '').trim().toLowerCase(),
        String(p.afterRelativePath || '').trim()
    ].join('\u0001');
}

export function loadSmbRecentProfiles() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const j = JSON.parse(raw);
        if (!j || !Array.isArray(j.profiles)) return [];
        return j.profiles.filter((p) => p && typeof p === 'object');
    } catch {
        return [];
    }
}

/**
 * @param {object} entry — host, share, username, mountPoint, domain?, afterRelativePath? (no password)
 */
/** Remove one saved profile by index (0-based). No-op if index is out of range. */
export function removeSmbRecentProfileAt(index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0) return;
    const prev = loadSmbRecentProfiles();
    if (i >= prev.length) return;
    const next = prev.filter((_, idx) => idx !== i);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: next }));
}

export function pushSmbRecentProfile(entry) {
    const row = {
        host: String(entry.host || '').trim(),
        share: String(entry.share || '').trim(),
        username: String(entry.username || '').trim(),
        mountPoint: String(entry.mountPoint || '').trim(),
        domain: String(entry.domain || '').trim(),
        afterRelativePath: String(entry.afterRelativePath || '').trim(),
        savedAt: new Date().toISOString()
    };
    if (!row.host && !row.mountPoint) return;

    const prev = loadSmbRecentProfiles();
    const k = profileDedupeKey(row);
    const filtered = prev.filter((p) => profileDedupeKey(p) !== k);
    const next = [row, ...filtered].slice(0, MAX_PROFILES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: next }));
}

/** Distinct non-empty values for one field, most recent profiles first. */
export function smbRecentValuesForField(profiles, field) {
    const seen = new Set();
    const out = [];
    for (const p of profiles) {
        const v = String(p[field] ?? '').trim();
        if (!v || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
    }
    return out.slice(0, 24);
}

export function formatSmbProfileLabel(p) {
    const h = p.host || '—';
    const sh = p.share || '—';
    const mp = p.mountPoint || '—';
    return `${h} · ${sh} → ${mp}`;
}
