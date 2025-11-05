// game.js - Phaser chatroom with animation matching and profanity filtering
// Requires: Phaser, Fuse.js (loaded in index.html)

import { findBestAnimation as matchAnimation } from './lib/animationMatcher.js';
import { createFourWayMirrorSync } from './lib/mirrorImageClient.js';

// ==================== DEBUG FLAGS ====================
const DEBUG = true;
const log = (tag, msg) => DEBUG && console.log(`${tag} ${msg}`);
const warn = (tag, msg) => DEBUG && console.warn(`${tag} ${msg}`);
const error = (tag, msg) => DEBUG && console.error(`${tag} ${msg}`);

// ==================== SPINE ASSET CONFIGURATION ====================

// Load Spine assets from public/assets/spine/ directory
const SPINE_SKINS = {
  'mario': {
    json: './assets/spine/mario/skeleton.json',
    atlas: './assets/spine/mario/skeleton.atlas',
    png: './assets/spine/mario/skeleton.png'
  },
  'luigi': {
    json: './assets/spine/luigi/skeleton.json',
    atlas: './assets/spine/luigi/skeleton.atlas',
    png: './assets/spine/luigi/skeleton.png'
  },
  'repanzel': {
    json: './assets/spine/repanzel/skeleton.json',
    atlas: './assets/spine/repanzel/skeleton.atlas',
    png: './assets/spine/repanzel/skeleton.png'
  },
  'rock': {
    json: './assets/spine/skeleton1/skeleton.json',
    atlas: './assets/spine/skeleton1/skeleton.atlas',
    png: './assets/spine/skeleton1/skeleton.png'
  },
  'skinMan1': {
    json: './assets/spine/skinMan1/skeleton.json',
    atlas: './assets/spine/skinMan1/skeleton.atlas',
    png: './assets/spine/skinMan1/skeleton.png'
  },
  'skinMan2': {
    json: './assets/spine/skinMan2/skeleton.json',
    atlas: './assets/spine/skinMan2/skeleton.atlas',
    png: './assets/spine/skinMan2/skeleton.png'
  },
  'skinMan2twin2': {
    json: './assets/spine/skinMan2twin2/skeleton.json',
    atlas: './assets/spine/skinMan2twin2/skeleton.atlas',
    png: './assets/spine/skinMan2twin2/skeleton.png'
  },
  'skinMan3': {
    json: './assets/spine/skinMan3/skeleton.json',
    atlas: './assets/spine/skinMan3/skeleton.atlas',
    png: './assets/spine/skinMan3/skeleton.png'
  },
  'skinMan4': {
    json: './assets/spine/skinMan4/skeleton.json',
    atlas: './assets/spine/skinMan4/skeleton.atlas',
    png: './assets/spine/skinMan4/skeleton.png'
  },
  'skinMan5': {
    json: './assets/spine/skinMan5/skeleton.json',
    atlas: './assets/spine/skinMan5/skeleton.atlas',
    png: './assets/spine/skinMan5/skeleton.png'
  },
  'skinMan6': {
    json: './assets/spine/skinMan6/skeleton.json',
    atlas: './assets/spine/skinMan6/skeleton.atlas',
    png: './assets/spine/skinMan6/skeleton.png'
  },
  'skinMan7': {
    json: './assets/spine/skinMan7/skeleton.json',
    atlas: './assets/spine/skinMan7/skeleton.atlas',
    png: './assets/spine/skinMan7/skeleton.png'
  },
  'woman2ceo': {
    json: './assets/spine/woman2ceo/skeleton.json',
    atlas: './assets/spine/woman2ceo/skeleton.atlas',
    png: './assets/spine/woman2ceo/skeleton.png'
  }
};

// ==================== SPINE ASSET LOADER ====================

class SpineAssetLoader {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Load all spine skins during preload phase
   */
  preloadAllSkins() {
    log('[Spine]', 'Preloading all skins...');
    for (const [skinName, skinData] of Object.entries(SPINE_SKINS)) {
      const key = `spine_${skinName}`;
      log('[Spine]', `Loading ${skinName} with key ${key}`);
      this.scene.load.spineJson(key, skinData.json);
      this.scene.load.spineAtlas(key, skinData.atlas);
    }
  }

  /**
   * Create a Spine sprite for a player
   */
  createSpineSprite(x, y, skinName = 'default') {
    if (!SPINE_SKINS[skinName]) {
      error('[Spine]', `Unknown skin: ${skinName}`);
      return null;
    }

    const key = `spine_${skinName}`;
    try {
      // Create spine: x, y, dataKey, atlasKey
      // Position y is adjusted to place sprite's feet at the given y coordinate
      const sprite = this.scene.add.spine(x, y, key, key);
      sprite.setScale(0.25);
      
      // Set origin to bottom center so sprite's feet are at (x, y)
      sprite.setOrigin(0.5, 1);
      
      // Play 'idle' animation by default if available
      if (sprite.animationState && sprite.skeleton) {
        const animations = sprite.skeleton.data.animations;
        const hasIdle = animations.some(a => a.name === 'idle');
        
        if (hasIdle) {
          sprite.animationState.setAnimation(0, 'idle', true);
        } else if (animations && animations.length > 0) {
          sprite.animationState.setAnimation(0, animations[0].name, true);
        }
        
        // Setup smooth crossfades between animations
        const state = sprite.animationState;
        state.data.defaultMix = 0.2; // 200ms smooth transition
      }
      
      // DEBUG: Draw a box where we think the spine is
      // Approximate spine dimensions: 64px wide × 250px tall, anchored at bottom center
      // const debugBox = this.scene.add.rectangle(x, y, 64, 250, 0xff0000, 0.3);
      // debugBox.setOrigin(0.5, 1); // Match spine origin
      // debugBox.setDepth(9999); // Highest depth so it appears on top
      
      return sprite;
    } catch (e) {
      error('[Spine]', `Failed to create sprite: ${e}`);
      return null;
    }
  }
}

// ==================== PROFANITY FILTER ====================

let profanityFilter = null;

/**
 * Initialize profanity filter using leo-profanity
 */
function initProfanityFilter() {
  if (typeof window.LeoProfanity === 'undefined') {
    warn('[Profanity]', 'leo-profanity not loaded!');
    return null;
  }
  try {
    log('[Profanity]', 'Filter initialized using leo-profanity');
    return window.LeoProfanity;
  } catch (e) {
    error('[Profanity]', `Failed to initialize filter: ${e}`);
    return null;
  }
}

/**
 * Check if text contains profanity using leo-profanity
 */
function isProfane(text) {
  if (!profanityFilter) return false;
  try {
    const result = profanityFilter.check(text);
    if (result) {
      log('[Profanity]', `Found in text: ${text}`);
    }
    return result;
  } catch (e) {
    error('[Profanity]', `Error checking text: ${e}`);
    return false;
  }
}

// ==================== UTILITIES ====================

// Random name word lists
const ADJECTIVES = [
  'Swift', 'Clever', 'Bold', 'Bright', 'Happy', 'Silly', 'Sneaky', 'Cool', 'Wild', 'Zesty',
  'Mighty', 'Sleek', 'Fuzzy', 'Playful', 'Groovy', 'Epic', 'Tiny', 'Giant', 'Sly', 'Jolly',
  'Mystical', 'Radiant', 'Cosmic', 'Quantum', 'Stellar', 'Neon', 'Primal', 'Joyful', 'Serene', 'Vivid',
  'Ethereal', 'Golden', 'Azure', 'Sunny', 'Ivory', 'Shimmering', 'Lunar', 'Solar', 'Arctic', 'Tropical',
  'Blazing', 'Frosty', 'Silent', 'Thunder', 'Luminous', 'Brilliant', 'Sparkly', 'Cheerful', 'Rogue', 'Noble'
];

const NOUNS = [
  'Phoenix', 'Dragon', 'Griffin', 'Basilisk', 'Kraken', 'Leviathan', 'Sphinx', 'Chimera', 'Hydra', 'Minotaur',
  'Pegasus', 'Harpy', 'Wyvern', 'Drake', 'Wyrm', 'Unicorn', 'Angel', 'Specter', 'Starlight', 'Rainbow',
  'Valkyrie', 'Golem', 'Gargoyle', 'Kitsune', 'Youkai', 'Tengu', 'Cherub', 'Sprite', 'Nymph', 'Satyr',
  'Centaur', 'Siren', 'Mermaid', 'Pixie', 'Fairy', 'Aurora', 'Imp', 'Familiar', 'Homunculus', 'Titan',
  'Colossus', 'Cyclops', 'Phoenix', 'Medusa', 'Gorgon', 'Manticore', 'Basilisk', 'Wonder', 'Majesty', 'Luminary'
];

/**
 * Generate a random default name from adjective + noun
 */
function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

// ==================== CHAT BUBBLE SETTINGS ====================

const CHAT_BUBBLE_MAX_WIDTH = 280;
const CHAT_BUBBLE_PADDING_X = 18;
const CHAT_BUBBLE_PADDING_Y = 12;
const CHAT_BUBBLE_VERTICAL_GAP = 24;

// ==================== GAME SCENE ====================

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.ws = null;
    this.myId = null;
    this.myName = null; // Player's chosen name
    this.mySkin = this.getRandomSkin(); // Randomly assigned skin
    this.hasRenamed = false; // Track if player has used their rename button
    this.spineLoader = null; // Spine asset loader
    this.players = {}; // id -> { sprite, nameText, chatText, x, y, skin, lastDir, lastAnim, isMoving, emoteEndTime, isPlayingEmote, lastMovementTime }
    this.lastSent = 0;
    this.sendInterval = 200; // ms between position updates
    this.isOnline = false;
    this.worldSize = 2000; // 5000x5000 grid
    this.animationMatcher = null; // Fuse matcher for animation names
    this.animationDurations = {}; // animationName -> duration in seconds
    this.animationNameMap = {}; // simplified name -> full animation name
    this.emoteEndTime = 0; // Track when current emote should end
    this.isPlayingEmote = false; // Flag to skip animation updates while emote plays
    this.moveKeys = null; // WASD movement keys
    this.cursorKeys = null; // Arrow keys
    this.arrowKeyHandler = null; // Browser-level arrow key preventer
    this.joystick = { active: false, dirX: 0, dirY: 0 }; // Mobile joystick state
  }

  /**
   * Get a random skin from available SPINE_SKINS
   */
  getRandomSkin() {
    const skinNames = Object.keys(SPINE_SKINS);
    const randomIndex = Math.floor(Math.random() * skinNames.length);
    return skinNames[randomIndex];
  }

  preload() {
    // Load background image
    this.load.image('background', './assets/background/background.webp');
    
    // Initialize Spine asset loader and preload all skins
    this.spineLoader = new SpineAssetLoader(this);
    this.spineLoader.preloadAllSkins();
  }

  create() {
    // Spine assets are already preloaded

    // Set up camera
    this.cameras.main.setBackgroundColor('#0d1117');

    // Create 4-way mirrored background from the loaded image
    try {
      log('[Background]', 'Creating 4-way mirrored background...');
      const mirrorKey = createFourWayMirrorSync(this, 'background', 'background_mirror4');
      
      // Add the mirrored background image at world origin
      const bg = this.add.image(0, 0, mirrorKey);
      bg.setOrigin(0, 0);
      bg.setDepth(-1);
      
      log('[Background]', `Background mirror created and added to scene`);
    } catch (e) {
      warn('[Background]', `Failed to create mirrored background: ${e}`);
      // Fallback: just use the original unmirrored image
      const bg = this.add.image(0, 0, 'background');
      bg.setOrigin(0, 0);
      bg.setDepth(-1);
    }

    // Initialize profanity filter
    profanityFilter = initProfanityFilter();

    // Extract animation names from all Spine skins for emote matching
    this.extractAllAnimationNames();

    // Set up keyboard controls for player movement (WASD + arrows)
    this.moveKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.input.keyboard.addCapture(['W', 'A', 'S', 'D']);
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.arrowKeyHandler = (event) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
        !['INPUT', 'TEXTAREA'].includes((event.target && event.target.tagName) || '')
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', this.arrowKeyHandler, { passive: false });
    const removeArrowHandler = () => {
      if (this.arrowKeyHandler) {
        window.removeEventListener('keydown', this.arrowKeyHandler);
        this.arrowKeyHandler = null;
      }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeArrowHandler);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      removeArrowHandler();
    });
    
    // Initialize name picker
    this.setupNamePicker();
    
    // Initialize rename UI
    this.setupRenameUI();
    
    // Initialize chat UI event listeners (disabled until name picked)
    this.setupChatInput();
    
    // Initialize mobile joystick
    this.setupMobileJoystick();

    // Try to connect to WebSocket server
    this.connectToWebSocket();
  }

  update(time) {
    // Only update if we have a player
    if (!this.myId || !this.players[this.myId]) return;

    const p = this.players[this.myId];
    
    const speed = 200 * (this.game.loop.delta / 1000); // pixels per second
    let moved = false;
    let dirX = 0, dirY = 0;

    // Check keyboard input
    const keys = this.moveKeys;
    const arrows = this.cursorKeys;
    if ((keys && keys.left.isDown) || (arrows && arrows.left.isDown)) { p.x -= speed; dirX = -1; moved = true; }
    if ((keys && keys.right.isDown) || (arrows && arrows.right.isDown)) { p.x += speed; dirX = 1; moved = true; }
    if ((keys && keys.up.isDown) || (arrows && arrows.up.isDown)) { p.y -= speed; dirY = -1; moved = true; }
    if ((keys && keys.down.isDown) || (arrows && arrows.down.isDown)) { p.y += speed; dirY = 1; moved = true; }
    
    // Check mobile joystick input
    if (this.joystick.active) {
      p.x += this.joystick.dirX * speed;
      p.y += this.joystick.dirY * speed;
      dirX = this.joystick.dirX;
      dirY = this.joystick.dirY;
      moved = true;
    }

    // If moving during an emote, interrupt the emote and play walk animation
    if (moved && this.isPlayingEmote) {
      log('[Emote]', 'Interrupted by movement, switching to walk');
      this.isPlayingEmote = false;
      this.emoteEndTime = 0;
    }
    
    // Check if emote animation has finished and return to normal animation system
    if (this.isPlayingEmote && this.emoteEndTime > 0 && Date.now() >= this.emoteEndTime) {
      this.emoteEndTime = 0;
      this.isPlayingEmote = false;
      log('[Emote]', 'Finished, returning to normal animations');
    }

    // Clamp position to world bounds
    p.x = Phaser.Math.Clamp(p.x, 16, this.worldSize - 16);
    p.y = Phaser.Math.Clamp(p.y, 24, this.worldSize - 24);

    // Update sprite and text display
    p.sprite.x = p.x;
    p.sprite.y = p.y;
    if (p.nameText) { p.nameText.x = p.x; p.nameText.y = p.y - 250 - 10; }
    
    // Update depth based on y position (lower y = higher depth for isometric look)
    if (p.sprite.setDepth) {
      p.sprite.setDepth(p.y);
    }
    if (p.nameText && p.nameText.setDepth) {
      p.nameText.setDepth(p.y + 1);
    }

    this.updateChatBubblePosition(p);

    // Only update animation if not playing emote
    if (!this.isPlayingEmote) {
      this.updatePlayerAnimation(p, moved, dirX);
    }

    // Send position update to server (throttled)
    // Send continuously to keep direction synced
    if (Date.now() - this.lastSent > this.sendInterval) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'move', x: Math.round(p.x), y: Math.round(p.y) }));
      }
      this.lastSent = Date.now();
    }
    
    // Update remote player animations
    this.updateRemotePlayerAnimations();
  }

  /**
   * Update animations for all remote players based on movement
   */
  updateRemotePlayerAnimations() {
    const now = Date.now();
    
    for (const [id, p] of Object.entries(this.players)) {
      if (id === this.myId) continue; // Skip local player
      if (!p.sprite || !p.sprite.animationState || !p.sprite.skeleton) continue;
      
      // Adjust depth based on y position (lower y = higher depth for isometric look)
      if (p.sprite.setDepth) {
        p.sprite.setDepth(p.y);
      }
      if (p.nameText && p.nameText.setDepth) {
        p.nameText.setDepth(p.y + 1); // Name text slightly above sprite
      }
      
      // Skip animation updates for 100ms after spawn to ensure idle animation plays
      if (p.justSpawned && (now - p.spawnTime) < 100) {
        continue;
      }
      p.justSpawned = false; // Clear flag after spawn window
      
      // Check if remote player is currently playing a server-sent emote
      if (p.isPlayingEmote && p.emoteEndTime > 0 && now >= p.emoteEndTime) {
        // Emote finished, return to idle
        p.isPlayingEmote = false;
        p.emoteEndTime = 0;
        const animations = p.sprite.skeleton.data.animations;
        const hasIdle = animations.some(a => a.name === 'idle');
        if (hasIdle) {
          p.sprite.animationState.setAnimation(0, 'idle', true);
          p.lastAnim = 'idle';
        }
      }
      
      // If not playing a special emote, handle walk/idle based on movement
      if (!p.isPlayingEmote) {
        const animations = p.sprite.skeleton.data.animations;
        const hasWalk = animations.some(a => a.name === 'walk');
        const hasIdle = animations.some(a => a.name === 'idle');
        
        // Determine if moving: if we haven't received an update in 250ms+, they've stopped
        // (movement updates come every 100ms when moving, so 250ms threshold means stopped)
        const timeSinceLastMovement = now - (p.lastMovementTime || now);
        const isMoving = timeSinceLastMovement < 250;
        
        const targetAnim = isMoving && hasWalk ? 'walk' : 'idle';
        if (p.lastAnim !== targetAnim) {
          if (hasIdle || (hasWalk && isMoving)) {
            p.sprite.animationState.setAnimation(0, targetAnim, true); // Always loop for walk and idle
            p.lastAnim = targetAnim;
          }
        }
      }
    }
  }

  getChatBubbleAnchorY(p, nextNameY) {
    if (!p) return 0;
    const nameY = typeof nextNameY === 'number'
      ? nextNameY
      : (p.nameText ? p.nameText.y : p.y - 260);
    return nameY - CHAT_BUBBLE_VERTICAL_GAP;
  }

  /**
   * Keep chat bubble aligned with the player sprite
   */
  updateChatBubblePosition(p) {
    if (!p || !p.chatBubble || !p.chatBubble.container) return;
    const bubbleData = p.chatBubble;
    if (bubbleData.isFloating) return;

    const targetX = p.x;
    const targetY = this.getChatBubbleAnchorY(p);
    bubbleData.targetX = targetX;
    bubbleData.targetY = targetY;

    const container = bubbleData.container;
    const delta = this.game.loop ? this.game.loop.delta : 16;
    const smoothing = Phaser.Math.Clamp(1 - Math.exp(-delta / 120), 0.08, 0.45);
    container.x = Phaser.Math.Linear(container.x, targetX, smoothing);
    container.y = Phaser.Math.Linear(container.y, targetY, smoothing);
    if (Math.abs(container.x - targetX) < 0.3) container.x = targetX;
    if (Math.abs(container.y - targetY) < 0.3) container.y = targetY;
    container.setDepth(p.y + 2);
  }

  /**
   * Update player animation based on movement state
   */
  updatePlayerAnimation(p, isMoving, dirX) {
    if (!p.sprite || !p.sprite.animationState || !p.sprite.skeleton) return;

    const animations = p.sprite.skeleton.data.animations;
    const hasWalk = animations.some(a => a.name === 'walk');
    const hasIdle = animations.some(a => a.name === 'idle');

    // Determine target animation
    const targetAnim = isMoving && hasWalk ? 'walk' : 'idle';

    // Switch animation if different
    if (p.lastAnim !== targetAnim) {
      if (hasIdle || (hasWalk && isMoving)) {
        p.sprite.animationState.setAnimation(0, targetAnim, true);
        p.lastAnim = targetAnim;
      }
    }

    // Handle direction flipping (only if moving horizontally)
    // Use absolute scale value to avoid stretching
    if (dirX !== 0) {
      const newDir = dirX > 0 ? 1 : -1;
      if (p.lastDir !== newDir) {
        // Set both scaleX and scaleY to preserve aspect ratio
        p.sprite.scaleX = Math.abs(p.sprite.scaleX) * newDir;
        p.lastDir = newDir;
      }
    }

    p.isMoving = isMoving;
  }

  /**
   * Extract all animation names from loaded Spine skeletons
   * Build a Fuse.js matcher for fuzzy animation matching
   * Note: Simplified animation names (e.g., "UpperBodyBits/DanceWithMicrophone" -> "DanceWithMicrophone")
   */
  extractAllAnimationNames() {
    if (!this.spineLoader) return;

    const allAnimations = new Set();
    const animationMap = {}; // Maps simplified name -> full name for playback

    // Helper to get simplified animation name (last part after /)
    const simplifyAnimName = (fullName) => {
      const lastSlash = fullName.lastIndexOf('/');
      return lastSlash >= 0 ? fullName.substring(lastSlash + 1) : fullName;
    };

    // Only extract animations from the player's own skin
    // (Everyone else does the same for their skin, so we don't need to scan all skins)
    const skinName = this.mySkin || 'default';
    const key = `spine_${skinName}`;
    try {
      // Create a temporary sprite just to read its animations
      const testSprite = this.add.spine(0, 0, key, key);
      
      if (testSprite && testSprite.skeleton && testSprite.skeleton.data.animations) {
        const animData = testSprite.skeleton.data.animations;
        const animNames = animData.map(a => a.name);
        
        // Store animation durations for later use (using full name as key)
        animData.forEach(anim => {
          if (anim.name && typeof anim.duration === 'number') {
            this.animationDurations[anim.name] = anim.duration;
          }
        });
        
        // Add to global set for matching (using simplified names)
        animNames.forEach(name => {
          const simplified = simplifyAnimName(name);
          allAnimations.add(simplified);
          // Map simplified name back to full name for playback
          if (!animationMap[simplified]) {
            animationMap[simplified] = name;
          }
        });
        
        log('[Animations]', `${skinName}: ${animNames.join(', ')}`);
      }
      
      // Clean up test sprite
      testSprite.destroy();
    } catch (e) {
      warn('[Animations]', `Failed to extract from ${skinName}: ${e}`);
    }

    // Store the mapping for later use
    this.animationNameMap = animationMap;

    // Convert to array and create Fuse matcher
    const animArray = Array.from(allAnimations).sort();
    log('[Animations]', `Total unique animations: ${animArray.length}`);
    log('[Animations]', `Stored durations: ${JSON.stringify(Object.keys(this.animationDurations).length)} entries`);
    log('[Animations]', `Name mapping: ${JSON.stringify(Object.keys(this.animationNameMap).length)} entries`);

    if (typeof window.Fuse !== 'undefined' && animArray.length > 0) {
      this.animationMatcher = new window.Fuse(animArray, {
        includeScore: true,
        threshold: 0.6, // More lenient threshold to catch more matches
        ignoreLocation: true,
        minMatchCharLength: 1,
        shouldSort: true,
        useExtendedSearch: true,
        keys: [] // Direct string search, not key-based
      });
      this.allAnimationsList = animArray; // Store for fallback selection
    }
  }

  /**
   * Find best matching animation for a user input
   */
  findBestAnimation(input) {
    if (!input) return 'idle';

    if (this.allAnimationsList && this.allAnimationsList.length > 0) {
      const helperMatch = matchAnimation(input, this.allAnimationsList);
      if (helperMatch) {
        log('[Emote]', `Helper match for "${input}" -> "${helperMatch}"`);
        return helperMatch;
      }
    }

    if (!this.animationMatcher) {
      if (this.allAnimationsList && this.allAnimationsList.length > 0) {
        return this.allAnimationsList[0];
      }
      return 'idle';
    }

    const searchTerm = input.toLowerCase();
    const allAnims = this.animationMatcher.getIndex().records.map(r => r.item).filter(Boolean);

    const exactMatch = allAnims.find(a => a.toLowerCase() === searchTerm);
    if (exactMatch) {
      log('[Emote]', `Exact match for "${input}" -> "${exactMatch}"`);
      return exactMatch;
    }

    const startsWith = allAnims.filter(a => a.toLowerCase().startsWith(searchTerm));
    if (startsWith.length > 0) {
      startsWith.sort((a, b) => a.length - b.length);
      console.log(`[Emote] Prefix match for "${input}" -> "${startsWith[0]}"`);
      return startsWith[0];
    }

    const contains = allAnims.filter(a => a.toLowerCase().includes(searchTerm));
    if (contains.length > 0) {
      contains.sort((a, b) => a.length - b.length);
      log('[Emote]', `Substring match for "${input}" -> "${contains[0]}"`);
      return contains[0];
    }

    const results = this.animationMatcher.search(searchTerm);
    if (results.length > 0) {
      const reasonableMatches = results.filter(r => r.score < 0.5);
      if (reasonableMatches.length > 0) {
        log('[Emote]', `Fuzzy match for "${input}" -> "${reasonableMatches[0].item}" (score: ${reasonableMatches[0].score.toFixed(2)})`);
        return reasonableMatches[0].item;
      }
    }

    if (this.allAnimationsList && this.allAnimationsList.length > 0) {
      const random = this.allAnimationsList[Math.floor(Math.random() * this.allAnimationsList.length)];
      log('[Emote]', `No good match for "${input}", random pick -> "${random}"`);
      return random;
    }

    console.log(`[Emote] No animations available, defaulting to idle`);
    return 'idle';
  }

  /**
   * Play an animation on the player's sprite
   */
  playEmote(animationName) {
    if (!this.myId || !this.players[this.myId]) return;

    const p = this.players[this.myId];
    if (!p.sprite || !p.sprite.animationState || !p.sprite.skeleton) return;

    // Get the full animation name (in case it was simplified)
    let fullAnimName = animationName;
    if (this.animationNameMap && this.animationNameMap[animationName]) {
      fullAnimName = this.animationNameMap[animationName];
    }

    const animations = p.sprite.skeleton.data.animations;
    const hasAnim = animations.some(a => a.name === fullAnimName);

    if (!hasAnim) {
      log('[Emote]', `Animation "${fullAnimName}" not available`);
      return;
    }

    // Get current animation state
    const state = p.sprite.animationState;
    const entry = state.getCurrent(0);

    // Only play if not already playing this animation
    if (entry && entry.animation && entry.animation.name === fullAnimName) {
      log('[Emote]', `"${fullAnimName}" already playing`);
      return;
    }

    // Mark that we're playing an emote so animation updates are skipped
    this.isPlayingEmote = true;
    
    // Play the emote animation once (not looped), don't queue anything
    state.setAnimation(0, fullAnimName, false);
    
    p.lastAnim = fullAnimName;
    
    // Get animation duration and schedule return to idle
    const duration = this.animationDurations[fullAnimName] || 1;
    this.emoteEndTime = Date.now() + (duration * 1000);
    
    // Broadcast animation to other players
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'animate', animation: fullAnimName }));
    }
    
    log('[Emote]', `Playing "${fullAnimName}" (${duration.toFixed(2)}s duration)`);
  }

  /**
   * Connect to WebSocket server with fallback chain: Cloud → Local → Solo mode
   */
  connectToWebSocket() {
    const candidates = [
      'wss://chat-client-xno8.onrender.com',  // Secure WebSocket for Render (HTTPS)
      'ws://chat-client-xno8.onrender.com',   // Fallback to non-secure if needed
      'ws://localhost:3000'                    // Local development fallback
    ];
    this.attemptWebSocketConnection(candidates);
  }

  /**
   * Attempt WebSocket connection with fallback URLs
   * @param {string[]} urls - Array of URLs to try in order
   */
  attemptWebSocketConnection(urls) {
    if (!urls || urls.length === 0) {
      warn('[WS]', 'No more URLs to try, falling back to solo mode');
      this.fallbackSoloMode();
      return;
    }

    const wsURL = urls[0];
    const remainingURLs = urls.slice(1);

    log('[WS]', `Attempting connection to ${wsURL}...`);
    this.updateLoadingStatus(`Connecting...`);

    let ws;
    try {
      ws = new WebSocket(wsURL);
    } catch (e) {
      warn('[WS]', `WebSocket constructor failed for ${wsURL}: ${e.message}`);
      this.attemptWebSocketConnection(remainingURLs);
      return;
    }

    this.ws = ws;
    let opened = false;
    let failureHandled = false;
    let timeoutId = null;

    // Set a timeout to trigger fallback if connection takes too long
    timeoutId = setTimeout(() => {
      if (!opened) {
        warn('[WS]', `Connection timeout for ${wsURL}, trying next URL...`);
        failureHandled = true;
        ws.close();
        this.attemptWebSocketConnection(remainingURLs);
      }
    }, 5000); // 5 second timeout

    ws.onopen = () => {
      clearTimeout(timeoutId);
      opened = true;
      this.isOnline = true;
      log('[WS]', `Connected to ${wsURL}`);
      this.updateStatusDisplay();
      this.hideLoadingScreen();
    };

    ws.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        warn('[WS]', `Failed to parse message: ${e}`);
        return;
      }
      this.handleMessage(data);
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      log('[WS]', `Connection closed for ${wsURL}`);
      if (!opened && !failureHandled) {
        warn('[WS]', `Connection failed for ${wsURL}, trying next URL...`);
        failureHandled = true;
        this.attemptWebSocketConnection(remainingURLs);
      } else if (opened) {
        this.isOnline = false;
        this.updateStatusDisplay();
      }
    };

    ws.onerror = (e) => {
      clearTimeout(timeoutId);
      warn('[WS]', `Connection error for ${wsURL}: ${e}`);
      if (!opened && !failureHandled) {
        warn('[WS]', 'Trying next URL in fallback chain...');
        failureHandled = true;
        this.attemptWebSocketConnection(remainingURLs);
      } else if (opened) {
        this.isOnline = false;
        this.updateStatusDisplay();
      }
    };
  }

  /**
   * Fallback to solo mode (no server connection)
   */
  fallbackSoloMode() {
    log('[Game]', 'Entering solo mode (offline)');
    if (this.players['solo']) return; // Already in solo mode
    this.isOnline = false;
    this.myId = 'solo';
    // Spawn player immediately with pre-assigned random name
    this.spawnMyPlayer();
    this.updateStatusDisplay();
    this.hideLoadingScreen();
  }

  /**
   * Update loading status text
   */
  updateLoadingStatus(message) {
    const status = document.getElementById('loading-status');
    if (status) status.innerText = message;
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Update the status display in the console
   */
  updateStatusDisplay() {
    const status = document.getElementById('status');
    if (status) {
      if (this.isOnline) {
        status.innerText = '✓ Ready';
        status.style.color = '#88ff88';
      } else {
        status.innerText = '✓ Ready';
        status.style.color = '#888888';
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'welcome':
        this.myId = data.id;
        // Spawn player immediately with pre-assigned random name
        this.spawnMyPlayer();
        this.updateStatusDisplay();
        log('[Game]', `Welcomed as ${data.id}`);
        break;

      case 'stateSync':
        // Load all existing players with their current positions, names, and skins
        if (data.players) {
          for (const player of data.players) {
            if (!this.players[player.id]) {
              this.addPlayer(player.id, player.x, player.y, false, player.name, player.skin || 'default');
              log('[Game]', `Synced player: ${player.id} as ${player.name} skin: ${player.skin} at [${player.x}, ${player.y}]`);
            }
          }
        }
        break;

      case 'playerJoined':
        if (!this.players[data.id]) {
          this.addPlayer(data.id, data.x || 1000, data.y || 1000, false, data.name, data.skin || 'default');
          log('[Game]', `Player joined: ${data.id} as ${data.name} skin: ${data.skin}`);
        }
        break;

      case 'playerLeft':
        this.removePlayer(data.id);
        log('[Game]', `Player left: ${data.id}`);
        break;

      case 'update':
        this.applyUpdate(data);
        break;

      case 'bulkUpdate':
        // New batched position updates
        if (data.updates) {
          log('[Game]', `Received bulkUpdate with ${data.updates.length} updates`);
          for (const update of data.updates) {
            // Don't apply updates to our own player (we control local position)
            if (update.id !== this.myId) {
              this.applyUpdate({ id: update.id, dataType: 'move', x: update.x, y: update.y });
            }
          }
        }
        break;

      default:
        warn('[Game]', `Unknown message type: ${data.type}`);
    }
  }

  /**
   * Add a player sprite and name text
   */
  addPlayer(id, x, y, isMe, displayName, skinName = 'default') {
    if (this.players[id]) return; // Already exists

    let sprite = null;

    // Try to create Spine sprite
    if (this.spineLoader && SPINE_SKINS[skinName]) {
      sprite = this.spineLoader.createSpineSprite(x, y, skinName);
      // Set initial animation to idle
      if (sprite && sprite.animationState) {
        sprite.animationState.setAnimation(0, 'idle', true);
      }
    }

    // Fallback to simple graphics if Spine fails or not available
    if (!sprite) {
      const g = this.add.graphics();
      g.fillStyle(isMe ? 0x44ff88 : 0x8888ff, 1);
      g.fillRoundedRect(-16, -24, 32, 48, 6);
      g.x = x;
      g.y = y;
      sprite = g;
    }

    // Create name text above the sprite (above the 250px tall spine)
    const nameText = this.add.text(x, y - 250 - 10, displayName || id, {
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontStyle: 'normal',
      fontWeight: '500',
      color: '#e0e0e0',
      align: 'center'
    }).setOrigin(0.5, 1).setDepth(100);

    this.players[id] = {
      sprite,
      nameText,
      chatText: null,
      chatBubble: null,
      x,
      y,
      skin: skinName,
      lastDir: 1,        // 1 for right, -1 for left
      lastAnim: 'idle',  // Start with idle
      isMoving: false,   // Track movement state
      emoteEndTime: 0,
      isPlayingEmote: false,
      lastMovementTime: Date.now(),  // Set to now so they start in idle
      justSpawned: true, // Flag to skip animation updates on first frame
      spawnTime: Date.now() // Track when they spawned
    };

    // Center camera on our player, offset so sprite visual center is screen center
    // Spine is 250px tall with origin at bottom (0.5, 1), so visual center is 125px above feet
    if (isMe) {
      // Start follow with offset: offset camera down by 125px to center the 250px tall spine
      this.cameras.main.startFollow(sprite, true, 1, 1);
      this.cameras.main.setFollowOffset(0, 125);
    }
  }

  /**
   * Remove a player sprite and all associated text
   */
  removePlayer(id) {
    const p = this.players[id];
    if (!p) return;

    if (p.sprite) p.sprite.destroy();
    if (p.nameText) p.nameText.destroy();
    if (p.chatText) p.chatText.destroy();
    if (p.chatBubble && p.chatBubble.container) {
      this.tweens.killTweensOf(p.chatBubble.container);
      p.chatBubble.container.destroy();
    }

    delete this.players[id];
  }

  /**
   * Apply an incoming update (move, animate, chat)
   */
  applyUpdate(data) {
    const id = data.id;
    if (!id) return;

    // Create player if they don't exist
    if (!this.players[id]) {
      this.addPlayer(id, data.x || 400, data.y || 300, false);
    }

    const p = this.players[id];
    if (!p) return;

    switch (data.dataType) {
      case 'move':
        // Update position
        const prevX = p.x;
        const prevY = p.y;
        p.x = data.x;
        p.y = data.y;
        
        // Infer movement direction from position change
        const dx = data.x - prevX;
        const dy = data.y - prevY;
        
        // Skip all logic on first position update after spawn
        if (p.justSpawned) {
          // First update after spawn - just set position directly
          p.sprite.x = data.x;
          p.sprite.y = data.y;
          if (p.nameText) {
            p.nameText.x = data.x;
            p.nameText.y = data.y - 250 - 10;
          }
          p.justSpawned = false; // Clear the flag for future updates
          break; // Skip all animation and tween logic
        }
        
        // Only update lastMovementTime if position actually changed significantly
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          p.lastMovementTime = Date.now();
        }
        
        // Update facing direction based on horizontal movement
        if (dx !== 0) {
          const newDir = dx > 0 ? 1 : -1;
          if (p.lastDir !== newDir) {
            p.sprite.scaleX = Math.abs(p.sprite.scaleX) * newDir;
            p.lastDir = newDir;
          }
        }
        
        // Smooth tween to new position for visual smoothness (200ms)
        const targetNameY = data.y - 250 - 10;
        this.tweens.add({
          targets: p.sprite,
          x: data.x,
          y: data.y,
          duration: 200,
          ease: 'Linear'
        });
        if (p.nameText) {
          this.tweens.add({
            targets: p.nameText,
            x: data.x,
            y: targetNameY,
            duration: 200,
            ease: 'Linear'
          });
        }

        if (p.chatBubble && p.chatBubble.container && !p.chatBubble.isFloating) {
          p.chatBubble.targetX = data.x;
          p.chatBubble.targetY = this.getChatBubbleAnchorY(p, targetNameY);
        }
        
        // Update animation: if moving, play walk; if not moving, play idle
        if (p.sprite && p.sprite.animationState && p.sprite.skeleton) {
          const isMoving = (Math.abs(dx) > 1 || Math.abs(dy) > 1);
          const animations = p.sprite.skeleton.data.animations;
          const hasWalk = animations.some(a => a.name === 'walk');
          const hasIdle = animations.some(a => a.name === 'idle');
          
          // If they start moving while playing an emote, interrupt and play walk
          if (isMoving && p.isPlayingEmote && hasWalk) {
            p.sprite.animationState.setAnimation(0, 'walk', true);
            p.lastAnim = 'walk';
            p.isPlayingEmote = false;
            p.emoteEndTime = 0;
          } else if (!p.isPlayingEmote) {
            // Only update animation if not playing emote (or emote was just interrupted)
            const targetAnim = isMoving && hasWalk ? 'walk' : 'idle';
            if (p.lastAnim !== targetAnim) {
              if (hasIdle || (hasWalk && isMoving)) {
                p.sprite.animationState.setAnimation(0, targetAnim, true); // Always loop for walk and idle
                p.lastAnim = targetAnim;
              }
            }
          }
        }
        break;

      case 'animate':
        // Animation handling for remote players
        if (p.sprite && p.sprite.animationState && p.sprite.skeleton) {
          const animations = p.sprite.skeleton.data.animations;
          const hasAnim = animations.some(a => a.name === data.animation);
          
          if (hasAnim) {
            // Check if different animation
            const state = p.sprite.animationState;
            const entry = state.getCurrent(0);
            if (!entry || !entry.animation || entry.animation.name !== data.animation) {
              // Play the remote animation
              state.setAnimation(0, data.animation, false);
              p.lastAnim = data.animation;
              p.isPlayingEmote = true;
              
              // Track when this emote should end
              const duration = this.animationDurations[data.animation] || 1;
              p.emoteEndTime = Date.now() + (duration * 1000);
              
              log('[Game]', `Remote animation from ${id}: ${data.animation}`);
            }
          } else {
            log('[Game]', `Animation "${data.animation}" not available on remote player ${id}`);
          }
        }
        break;

      case 'chat':
        this.showChatBubble(p, data.message);
        break;

      default:
        warn('[Game]', `Unknown update type: ${data.dataType}`);
    }
  }

    /**
   * Send a chat message to the server or play animation locally
   */
  sendChatMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Online: send to server
      this.ws.send(JSON.stringify({ type: 'chat', message }));
      if (this.myId && this.players[this.myId]) {
        this.showChatBubble(this.players[this.myId], message);
      }
    } else {
      // Offline: show chat bubble only (no animation - that's for emote button)
      if (this.myId && this.players[this.myId]) {
        this.showChatBubble(this.players[this.myId], message);
      }
    }
  }

  /**
   * Try to match user input to an animation name
   */
  tryLocalAnimation(message) {
    const best = this.findBestAnimation(message);
    if (best && best !== 'idle') {
      log('[Game]', `Matched animation: ${best}`);
      this.playEmote(best);
    } else {
      log('[Game]', `No animation match for: ${message}`);
    }
  }

  /**
   * Set up the name picker modal
   */
  setupNamePicker() {
    // Auto-assign random name and spawn immediately
    this.myName = generateRandomName();
    // Don't show the modal - we'll spawn directly when we get our ID
  }
  
  /**
   * Spawn the player after name is picked
   */
  spawnMyPlayer() {
    if (!this.myId) {
      warn('[Game]', 'Cannot spawn - no myId yet');
      return;
    }
    
    // Spawn at world center with 5% randomization zone
    // Round to match server rounding to avoid jitter on spawn
    const center = this.worldSize / 2;
    const zoneSize = this.worldSize * 0.05; // 5% of world size
    const spawnX = Math.round(center + (Math.random() - 0.5) * 2 * zoneSize);
    const spawnY = Math.round(center + (Math.random() - 0.5) * 2 * zoneSize);
    
    this.addPlayer(this.myId, spawnX, spawnY, true, this.myName, this.mySkin);
    this.updateStatusDisplay();
    
    // Send initial position to server immediately so it's synchronized
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'move', x: spawnX, y: spawnY }));
    }
    
    // If online, tell other players we joined
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'playerJoined', name: this.myName, skin: this.mySkin }));
    }
  }

  /**
   * Set up rename UI
   */
  setupRenameUI() {
    const renameInput = document.getElementById('rename-input');
    const renameBtn = document.getElementById('rename-btn');
    const renameCloseBtn = document.getElementById('rename-close-btn');
    const renameConfirmBtn = document.getElementById('rename-confirm-btn');
    const renameUI = document.getElementById('rename-ui');
    
    const openRenameInput = () => {
      if (this.hasRenamed) return; // Don't open if already renamed
      // Open state: show input, red X, and green check
      renameInput.classList.add('active');
      renameCloseBtn.classList.add('hidden');
      renameConfirmBtn.classList.add('active');
      renameBtn.textContent = 'Rename';
      renameInput.focus();
    };
    
    const closeRenameInput = () => {
      // Closed state: hide input, show red X, hide green check
      renameInput.classList.remove('active');
      renameCloseBtn.classList.remove('hidden');
      renameConfirmBtn.classList.remove('active');
      renameInput.value = '';
      renameInput.style.borderColor = ''; // Clear any error styling
    };
    
    const hideRenameUI = () => {
      // Hide and disable the entire rename UI (without renaming)
      renameUI.classList.add('disabled');
      renameBtn.disabled = true;
      renameInput.disabled = true;
      renameCloseBtn.disabled = true;
      renameConfirmBtn.disabled = true;
      closeRenameInput();
    };
    
    const disableRenameUI = () => {
      // Disable and hide the entire rename UI
      renameUI.classList.add('disabled');
      renameBtn.disabled = true;
      renameInput.disabled = true;
      renameCloseBtn.disabled = true;
      renameConfirmBtn.disabled = true;
      closeRenameInput();
    };
    
    const performRename = () => {
      if (this.hasRenamed) {
        renameInput.style.borderColor = '#ff4444';
        setTimeout(() => { renameInput.style.borderColor = ''; }, 300);
        return;
      }
      
      const newName = renameInput.value.trim();
      if (!newName || newName.length > 30) {
        renameInput.style.borderColor = '#ff4444';
        setTimeout(() => { renameInput.style.borderColor = ''; }, 300);
        return;
      }
      
      this.myName = newName;
      this.hasRenamed = true;
      if (this.myId && this.players[this.myId]) {
        this.players[this.myId].nameText.setText(newName);
      }
      disableRenameUI(); // Hide and disable the entire UI after rename
      log('[Game]', `Renamed to: ${newName}`);
    };
    
    renameBtn.addEventListener('click', () => {
      // Toggle: if input is open, close it; if closed, open it
      if (renameInput.classList.contains('active')) {
        closeRenameInput();
      } else {
        openRenameInput();
      }
    });
    renameCloseBtn.addEventListener('click', hideRenameUI);
    renameConfirmBtn.addEventListener('click', performRename);
    renameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performRename();
    });
  }

  /**
   * Set up chat input event listeners
   */
  setupChatInput() {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatAnim = document.getElementById('chat-anim');

    // Stop Phaser from intercepting keyboard when chat is focused
    chatInput.addEventListener('focus', () => {
      this.input.keyboard.enabled = false;
    });
    
    chatInput.addEventListener('blur', () => {
      this.input.keyboard.enabled = true;
    });

    // Prevent Phaser's keyboard manager from consuming keyboard events
    chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          playAnim();
        } else {
          send();
        }
      }
    });
    
    chatInput.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    
    chatInput.addEventListener('keypress', (e) => {
      e.stopPropagation();
    });

    const send = () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      if (isProfane(msg)) {
        log('[Chat]', 'Message blocked (profanity)');
        chatInput.style.background = '#ff4444';
        setTimeout(() => { chatInput.style.background = ''; }, 300);
        chatInput.value = '';
        return;
      }
      this.sendChatMessage(msg);
      chatInput.value = '';
      setTimeout(() => chatInput.blur(), 0);
    };

    const playAnim = () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      
      // Check if this is a rename command: /rename NewName
      if (msg.toLowerCase().startsWith('/rename ')) {
        if (this.hasRenamed) {
          log('[Chat]', 'Already renamed once');
          chatInput.style.background = '#ff4444';
          setTimeout(() => { chatInput.style.background = ''; }, 300);
          chatInput.value = '';
          return;
        }
        
        const newName = msg.slice(8).trim();
        if (!newName || newName.length > 30) {
          chatInput.style.background = '#ff4444';
          setTimeout(() => { chatInput.style.background = ''; }, 300);
          chatInput.value = '';
          return;
        }
        
        this.myName = newName;
        this.hasRenamed = true;
        if (this.myId && this.players[this.myId]) {
          this.players[this.myId].nameText.setText(newName);
        }
        log('[Chat]', `Renamed to: ${newName}`);
        chatInput.value = '';
        setTimeout(() => chatInput.blur(), 0);
        return;
      }
      
      if (isProfane(msg)) {
        log('[Chat]', 'Message blocked (profanity)');
        chatInput.style.background = '#ff4444';
        setTimeout(() => { chatInput.style.background = ''; }, 300);
        chatInput.value = '';
        return;
      }
      this.tryLocalAnimation(msg);
      chatInput.value = '';
      setTimeout(() => chatInput.blur(), 0);
    };

    chatSend.addEventListener('click', send);
    chatAnim.addEventListener('click', playAnim);
  }

  /**
   * Set up mobile joystick controls
   */
  setupMobileJoystick() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    
    if (!joystickBase || !joystickStick) return;
    
    let startX = 0, startY = 0;
    const maxDistance = 35; // Maximum distance from center
    
    const handleStart = (clientX, clientY) => {
      const rect = joystickBase.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      this.joystick.active = true;
      handleMove(clientX, clientY);
    };
    
    const handleMove = (clientX, clientY) => {
      if (!this.joystick.active) return;
      
      let deltaX = clientX - startX;
      let deltaY = clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }
      
      // Update stick visual position
      joystickStick.style.left = (35 + deltaX) + 'px';
      joystickStick.style.top = (35 + deltaY) + 'px';
      
      // Update direction for game movement (normalized -1 to 1)
      this.joystick.dirX = deltaX / maxDistance;
      this.joystick.dirY = deltaY / maxDistance;
    };
    
    const handleEnd = () => {
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      // Reset stick to center
      joystickStick.style.left = '35px';
      joystickStick.style.top = '35px';
    };
    
    // Touch events
    joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }, { passive: false });
    
    joystickBase.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }, { passive: false });
    
    joystickBase.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    }, { passive: false });
    
    // Mouse events (for testing on desktop)
    joystickBase.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.joystick.active) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (this.joystick.active) {
        e.preventDefault();
        handleEnd();
      }
    });
    
    log('[Mobile]', 'Joystick controls initialized');
  }

  /**
   * Display a chat bubble above a player
   */
  showChatBubble(player, message) {
    if (!player) return;

    if (player.chatBubble && player.chatBubble.container) {
      this.tweens.killTweensOf(player.chatBubble.container);
      player.chatBubble.container.destroy();
      player.chatBubble = null;
    }
    if (player.chatText) {
      player.chatText.destroy();
      player.chatText = null;
    }

    const maxContentWidth = CHAT_BUBBLE_MAX_WIDTH - (CHAT_BUBBLE_PADDING_X * 2);

    const text = this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontStyle: 'bold',
      color: '#1f2937',
      align: 'center',
      wordWrap: { width: maxContentWidth },
      lineSpacing: 6,
      resolution: 2
    }).setOrigin(0.5, 0.5).setDepth(2);
    text.setShadow(0, 2, 'rgba(30,41,59,0.45)', 4, false, true);

    const contentWidth = Math.min(maxContentWidth, text.width);
    const contentHeight = text.height;

    const bubbleWidth = Math.max(contentWidth + (CHAT_BUBBLE_PADDING_X * 2), 120);
    const bubbleHeight = contentHeight + (CHAT_BUBBLE_PADDING_Y * 2);

    const rectTop = -bubbleHeight;
    const rectLeft = -bubbleWidth / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.18);
    shadow.fillRoundedRect(rectLeft + 4, rectTop + 6, bubbleWidth, bubbleHeight, 20);
    shadow.setDepth(0);

    const bubble = this.add.graphics();
    bubble.fillStyle(0xf8fafc, 0.97);
    bubble.fillRoundedRect(rectLeft, rectTop, bubbleWidth, bubbleHeight, 20);
    bubble.lineStyle(2, 0xb9c4ff, 0.6);
    bubble.strokeRoundedRect(rectLeft, rectTop, bubbleWidth, bubbleHeight, 20);
    bubble.setDepth(1);

    text.y = rectTop + (bubbleHeight / 2);
    const anchorY = this.getChatBubbleAnchorY(player);
    const container = this.add.container(player.x, anchorY);
    container.add([shadow, bubble, text]);
    container.setScale(0.9);
    container.setAlpha(0);
    container.setDepth(player.y + 2);

    const bubbleData = {
      container,
      text,
      background: bubble,
      shadow,
      isFloating: false,
      targetX: player.x,
      targetY: anchorY
    };

    player.chatText = text;
    player.chatBubble = bubbleData;

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.Out'
    });

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: `-=10`,
      duration: 280,
      delay: 4000,
      ease: 'Sine.easeIn',
      onStart: () => {
        bubbleData.isFloating = true;
      },
      onComplete: () => {
        container.destroy();
        if (player && player.chatBubble && player.chatBubble.container === container) {
          player.chatBubble = null;
          player.chatText = null;
        }
      }
    });
  }
}

// ==================== PHASER CONFIG ====================

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  plugins: {
    scene: [
      {
        key: 'SpinePlugin',
        plugin: window.spine && window.spine.SpinePlugin,
        mapping: 'spine'
      }
    ]
  }
};

const game = new Phaser.Game(config);
log('[Game]', 'Phaser game initialized');
