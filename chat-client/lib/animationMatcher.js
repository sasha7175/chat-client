// animationMatcher.js - Browser-based animation name matching using Fuse.js
// Usage: import { findBestAnimation } from './animationMatcher.js';
//        const match = findBestAnimation(userInput, animationNames);
// Requires: fuse.min.js loaded in the page (window.Fuse)

// ==================== INTENT WORDS ====================
// Words to strip from user input before matching
const INTENT_WORDS = [
  // Action verbs
  'do', 'make', 'show', 'play', 'perform', 'trigger', 'start', 'animate', 'animation',
  'can you', 'could you', 'please', 'try', 'do a', 'do an', 'do the', 'do some',
  // Polite requests
  'i want', 'i would like', 'let me see', 'give me', 'how about',
  'could i', 'would you', 'would it', 'let us', 'let me', 'may i', 'may we',
  'i need', 'i wish', 'i hope', 'i feel', 'i think', 'i see', 'i like', 'i love', 'i hate',
  'i am', 'i was', 'i will', 'i shall', 'i must', 'i should', 'i can', 'i could', 'i would',
  'i might', 'i may', 'i want to', 'i wanna', 'i gotta',
  // Compound requests
  'could we', 'could you please', 'would you please', 'can you please', 'please can you',
  'please do', 'please show', 'please make', 'please play', 'please perform',
  'please trigger', 'please start', 'please animate', 'please give', 'please let', 'please let me', 'please let us'
];

// ==================== UTILITIES ====================

/**
 * Normalize text: lowercase and remove special characters
 */
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Strip intent words from text to get the core animation request
 */
function stripIntent(text) {
  let t = normalize(text);
  for (const word of INTENT_WORDS) {
    // Remove word at the beginning followed by whitespace
    t = t.replace(new RegExp('^' + word + '\\s+', 'i'), '');
    // Remove word anywhere in the text (word boundary)
    t = t.replace(new RegExp('\\b' + word + '\\b', 'gi'), '');
  }
  return t.trim();
}

/**
 * Expand text with common synonyms to increase match accuracy
 */
function expandSynonyms(text) {
  const synonymMap = {
    'hello': 'wave',
    'hi': 'wave',
    'hey': 'wave',
    'greet': 'wave',
    'greeting': 'wave',
    'laugh': 'laughing',
    'chuckle': 'laughing',
    'giggle': 'laughing',
    'grin': 'smile',
    'smirk': 'smile',
    'happy': 'smile',
    'sad': 'cry',
    'frown': 'cry',
    'upset': 'cry',
    'angry': 'angry',
    'rage': 'angry',
    'mad': 'angry',
    'furious': 'angry',
    'move': 'run',
    'walk': 'run',
    'jog': 'run',
    'sprint': 'run',
    'go': 'run',
    'leap': 'jump',
    'hop': 'jump',
    'spring': 'jump',
    'bound': 'jump',
    'praise': 'cheer',
    'celebrate': 'cheer',
    'shout': 'cheer',
    'yell': 'cheer'
  };

  let expanded = text;
  for (const [synonym, canonical] of Object.entries(synonymMap)) {
    if (text.includes(synonym)) {
      expanded += ' ' + canonical;
    }
  }
  return expanded;
}

// ==================== MAIN MATCHING FUNCTION ====================

/**
 * Find the best matching animation for user input
 * @param {string} userInput - Raw user text (e.g., "can you do a dance?")
 * @param {string[]} animationNames - Available animation names (e.g., ['dance', 'walk', 'wave'])
 * @returns {string|null} The best matching animation name, or null if no good match
 */
function findBestAnimation(userInput, animationNames) {
  // Guard: check if Fuse.js is loaded
  if (typeof window.Fuse === 'undefined') {
    console.warn('[animationMatcher] Fuse.js not loaded! Animation matching will not work.');
    return null;
  }

  // Guard: validate inputs
  if (!userInput || typeof userInput !== 'string') return null;
  if (!animationNames || !Array.isArray(animationNames) || animationNames.length === 0) return null;

  try {
    // Step 1: Strip intent words to get the core animation request
    const filtered = stripIntent(userInput);
    if (!filtered) return null; // Empty after stripping intent

    // Step 2: Expand with synonyms
    const expanded = expandSynonyms(filtered);

    // Step 3: Create Fuse searcher with optimized options
    const fuse = new window.Fuse(animationNames, {
      includeScore: true,
      threshold: 0.4, // 0 = exact, 1 = very loose. 0.4 is good for typos and partial matches
      ignoreLocation: true, // Don't penalize matches not at the start of the string
      minMatchCharLength: 2 // Require at least 2 character match
    });

    // Step 4: Search with expanded text
    const results = fuse.search(expanded);

    // Step 5: Return best match if score is good enough
    if (results.length > 0) {
      const bestResult = results[0];
      // Optional: only accept if score is below threshold (lower is better in Fuse)
      // Score > 0.6 is considered "not a match" in our case
      if (bestResult.score < 0.6) {
        console.log('[animationMatcher] Matched:', bestResult.item, 'score:', bestResult.score.toFixed(2));
        return bestResult.item;
      }
    }

    // No good match found
    return null;
  } catch (e) {
    console.error('[animationMatcher] Error during matching:', e);
    return null;
  }
}

// ==================== EXPORT ====================

export { findBestAnimation };

