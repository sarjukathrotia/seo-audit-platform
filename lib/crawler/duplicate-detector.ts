import { createHash } from "crypto";

/**
 * Normalizes text content for duplicate detection:
 * - strips whitespace, punctuation, lowercases
 * - removes noise words
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates an exact MD5 hash of normalized content.
 */
export function computeExactHash(text: string): string {
  const norm = normalizeText(text);
  return createHash("md5").update(norm).digest("hex");
}

/**
 * Generates 3-word shingles for near-duplicate SimHash computation.
 */
export function generateShingles(text: string, k = 3): string[] {
  const words = normalizeText(text).split(" ").filter((w) => w.length > 2);
  if (words.length < k) return words;
  const shingles: string[] = [];
  for (let i = 0; i <= words.length - k; i++) {
    shingles.push(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

/**
 * 64-bit SimHash for near-duplicate page detection
 */
export function computeSimHash(text: string): string {
  const shingles = generateShingles(text);
  if (shingles.length === 0) return "0".repeat(64);

  const v = new Array(64).fill(0);

  for (const shingle of shingles) {
    const hash = createHash("md5").update(shingle).digest();
    // take first 8 bytes for 64-bit hash
    for (let i = 0; i < 64; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      const bit = (hash[byteIndex] >> bitIndex) & 1;
      v[i] += bit === 1 ? 1 : -1;
    }
  }

  let simhash = "";
  for (let i = 0; i < 64; i++) {
    simhash += v[i] > 0 ? "1" : "0";
  }
  return simhash;
}

/**
 * Computes Hamming distance between two 64-bit SimHashes.
 * Distance <= 3 typically indicates near-duplicate content.
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) dist++;
  }
  return dist;
}

export function findDuplicates(pages: { url: string; bodyText: string }[]): {
  exactDuplicates: { urls: string[]; titleSample?: string }[];
  nearDuplicates: { urlA: string; urlB: string; similarity: number }[];
} {
  const exactMap = new Map<string, string[]>();
  const hashes: { url: string; simhash: string; wordCount: number }[] = [];

  for (const page of pages) {
    if (page.bodyText.length < 50) continue; // skip tiny pages
    const exact = computeExactHash(page.bodyText);
    const existing = exactMap.get(exact) || [];
    existing.push(page.url);
    exactMap.set(exact, existing);

    const sim = computeSimHash(page.bodyText);
    hashes.push({ url: page.url, simhash: sim, wordCount: page.bodyText.split(/\s+/).length });
  }

  const exactDuplicates = Array.from(exactMap.values())
    .filter((urls) => urls.length > 1)
    .map((urls) => ({ urls }));

  const nearDuplicates: { urlA: string; urlB: string; similarity: number }[] = [];

  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      // If already in exact duplicate, don't double count
      const hA = hashes[i];
      const hB = hashes[j];
      const dist = hammingDistance(hA.simhash, hB.simhash);
      if (dist <= 3 && dist > 0) {
        const similarity = Math.round(((64 - dist) / 64) * 100);
        nearDuplicates.push({
          urlA: hA.url,
          urlB: hB.url,
          similarity,
        });
      }
    }
  }

  return { exactDuplicates, nearDuplicates };
}
