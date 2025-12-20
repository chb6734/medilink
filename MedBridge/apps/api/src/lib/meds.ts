export function parseMedCandidates(text: string) {
  // MVP heuristic: extract non-empty lines, de-dup, cap to 30.
  // We keep OCR raw; proper normalization comes later.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2)
    .slice(0, 200);

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const key = l.replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(key);
    if (uniq.length >= 30) break;
  }
  return uniq;
}


