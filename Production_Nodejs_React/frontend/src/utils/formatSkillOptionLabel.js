/**
 * Skill id + description in one line. Browsers collapse runs of spaces in native select options,
 * so we use " || " (double pipe) — stays readable and does not get squashed.
 * @param {string} id
 * @param {string} [desc]
 * @returns {string} e.g. "weather || Get current weather…"
 */
export function formatSkillOptionLabel(id, desc) {
    const d = (desc || '').trim();
    if (!d) return id;
    return `${id} || ${d}`;
}

export default formatSkillOptionLabel;
