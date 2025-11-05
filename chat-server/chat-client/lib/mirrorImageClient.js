/**
 * mirrorImageClient.js - Client-side image mirroring using Canvas API
 * Creates 4-way mirrored images at runtime in the browser
 * No external dependencies required
 */

/**
 * Create a 4-way mirrored image using Canvas
 * Layout: [original | flipped-X]
 *         [flipped-Y | flipped-both]
 * @param {HTMLImageElement} imageElement - The image to mirror
 * @returns {HTMLCanvasElement} Canvas element with 4-mirror composite
 */
export function createFourWayMirror(imageElement) {
  if (!imageElement || !imageElement.width || !imageElement.height) {
    console.error('[Mirror] Invalid image element');
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = imageElement.width;
  const h = imageElement.height;
  
  canvas.width = w * 2;
  canvas.height = h * 2;
  
  // Top-left: original
  ctx.drawImage(imageElement, 0, 0);
  
  // Top-right: flipped horizontally (X-axis)
  ctx.save();
  ctx.translate(w * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(imageElement, 0, 0);
  ctx.restore();
  
  // Bottom-left: flipped vertically (Y-axis)
  ctx.save();
  ctx.translate(0, h * 2);
  ctx.scale(1, -1);
  ctx.drawImage(imageElement, 0, 0);
  ctx.restore();
  
  // Bottom-right: flipped both ways
  ctx.save();
  ctx.translate(w * 2, h * 2);
  ctx.scale(-1, -1);
  ctx.drawImage(imageElement, 0, 0);
  ctx.restore();
  
  return canvas;
}

/**
 * Synchronous version: Create mirrored texture and add to Phaser immediately
 * Returns the key so you can use it right away
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} imageKey - Key of the original image
 * @param {string} outputKey - Key for the mirrored texture (optional)
 * @returns {string} Key of the mirrored texture
 */
export function createFourWayMirrorSync(scene, imageKey, outputKey = null) {
  if (!outputKey) {
    outputKey = `${imageKey}_mirror4`;
  }
  
  try {
    // Get the original image from Phaser's texture manager
    const originalTexture = scene.textures.get(imageKey);
    if (!originalTexture) {
      console.error(`[Mirror] Texture not found: ${imageKey}`);
      return imageKey; // Fallback to original
    }
    
    const img = originalTexture.getSourceImage();
    if (!img || !img.width || !img.height) {
      console.error(`[Mirror] Invalid image source: ${imageKey}`);
      return imageKey; // Fallback to original
    }
    
    console.log(`[Mirror] Creating 4-way mirror from ${imageKey} (${img.width}x${img.height})...`);
    
    // Create the mirrored canvas
    const mirrorCanvas = createFourWayMirror(img);
    if (!mirrorCanvas) {
      console.error(`[Mirror] Failed to create canvas`);
      return imageKey; // Fallback to original
    }
    
    // Add the canvas directly to Phaser's texture manager
    scene.textures.addCanvas(outputKey, mirrorCanvas);
    
    console.log(`[Mirror] Successfully created: ${outputKey} (${mirrorCanvas.width}x${mirrorCanvas.height})`);
    return outputKey;
  } catch (e) {
    console.error(`[Mirror] Error creating mirrored texture: ${e.message}`);
    return imageKey; // Fallback to original
  }
}
