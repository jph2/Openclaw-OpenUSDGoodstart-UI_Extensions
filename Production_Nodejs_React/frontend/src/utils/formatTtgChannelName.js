/**
 * Telegram Topic Groups (TTG): normalize legacy display names where the prefix was "TG###"
 * instead of "TTG###". Does not change channel ids (tg.id).
 */
export function formatTtgChannelName(name) {
    if (name == null || typeof name !== 'string') return name;
    return name.replace(/^TG(\d)/, 'TTG$1');
}
