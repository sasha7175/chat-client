/**
 * mirrorImage.js - Utility functions for creating mirrored image patterns
 * For use with Node.js and image processing libraries
 */

const fs = require('fs');
const path = require('path');

// Try to load Sharp for image processing (npm install sharp)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('Sharp not installed. Run: npm install sharp');
}

/**
 * Flip an image horizontally (left-right mirror) and save it
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save flipped image
 * @returns {Promise<void>}
 */
async function flipImageLeftRight(inputPath, outputPath) {
  if (!sharp) {
    throw new Error('Sharp library not installed. Run: npm install sharp');
  }

  try {
    await sharp(inputPath)
      .flop() // Flip horizontally
      .toFile(outputPath);
    
    console.log(`✓ Flipped image saved to: ${outputPath}`);
  } catch (error) {
    console.error(`✗ Failed to flip image: ${error.message}`);
    throw error;
  }
}

/**
 * Create a 4-way mirrored image (2x2 grid: normal, flipped X, flipped Y, flipped both)
 * Layout: [original | flippedX]
 *         [flippedY | flippedBoth]
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save the 4-mirror composite
 * @returns {Promise<void>}
 */
async function createFourWayMirror(inputPath, outputPath) {
  if (!sharp) {
    throw new Error('Sharp library not installed. Run: npm install sharp');
  }

  try {
    // Load the original image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    const width = metadata.width;
    const height = metadata.height;
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    // Create the four variants
    const original = await sharp(inputPath).toBuffer();
    const flippedX = await sharp(inputPath).flop().toBuffer(); // Flipped horizontally
    const flippedY = await sharp(inputPath).flip().toBuffer(); // Flipped vertically
    const flippedBoth = await sharp(inputPath).flop().flip().toBuffer(); // Flipped both ways
    
    // Create 2x2 grid: top row is original and flipped-X (the two horizontal flips)
    //                  bottom row is flipped-Y and flipped-both
    const composite = await sharp({
      create: {
        width: width * 2,
        height: height * 2,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
      .composite([
        { input: original, top: 0, left: 0 },           // Top-left: original
        { input: flippedX, top: 0, left: width },       // Top-right: flipped horizontally
        { input: flippedY, top: height, left: 0 },      // Bottom-left: flipped vertically
        { input: flippedBoth, top: height, left: width } // Bottom-right: flipped both
      ])
      .toFile(outputPath);
    
    console.log(`✓ 4-way mirror created: ${outputPath} (${composite.width}x${composite.height})`);
    console.log(`  Top row: original | flipped-X (horizontal mirrors)`);
    console.log(`  Bottom row: flipped-Y | flipped-both`);
  } catch (error) {
    console.error(`✗ Failed to create 4-way mirror: ${error.message}`);
    throw error;
  }
}

/**
 * CLI usage
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage:
  node mirrorImage.js flip <input> <output>     - Flip image horizontally and save
  node mirrorImage.js mirror4 <input> <output>  - Create 4-way mirror composite

Examples:
  node mirrorImage.js flip background.png flipped.png
  node mirrorImage.js mirror4 background.png background-mirror4.png
    `);
    process.exit(1);
  }
  
  const command = args[0];
  const inputPath = args[1];
  const outputPath = args[2];
  
  if (!fs.existsSync(inputPath)) {
    console.error(`✗ Input file not found: ${inputPath}`);
    process.exit(1);
  }
  
  if (command === 'flip') {
    flipImageLeftRight(inputPath, outputPath).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (command === 'mirror4') {
    createFourWayMirror(inputPath, outputPath).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else {
    console.error(`✗ Unknown command: ${command}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  flipImageLeftRight,
  createFourWayMirror
};
