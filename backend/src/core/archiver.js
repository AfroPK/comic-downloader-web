const fs = require('fs').promises;
const path = require('path');
// Assume jszip is installed and available as per context
const JSZip = require('jszip');

/**
 * Zips all image files from a source directory into a CBZ archive.
 * @param {string} sourceDir The absolute path to the directory containing images.
 * @param {string} outputPath The absolute path where the resulting .cbz file will be saved.
 * @returns {Promise<void>} Resolves when zipping and cleanup are complete.
 */
async function createCbz(sourceDir, outputPath) {
    const zip = new JSZip();

    try {
        // 1. Read all files from the source directory
        const files = await fs.readdir(sourceDir);

        for (const fileName of files) {
            const filePath = path.join(sourceDir, fileName);
            const stat = await fs.stat(filePath);

            // Only process regular files (assuming images are regular files)
            if (stat.isFile()) {
                try {
                    const fileBuffer = await fs.readFile(filePath);
                    // Add the file to the zip archive, preserving its original name/relative path structure if needed
                    zip.file(fileName, fileBuffer);
                } catch (readError) {
                    console.error(`Could not read file ${filePath}:`, readError);
                    // Continue even if one file fails to read
                }
            }
        }

        if (Object.keys(zip.files).length === 0) {
            throw new Error("No files found in the source directory.");
        }

        // 2. Generate the CBZ buffer
        console.log("Generating zip archive...");
        const content = await zip.generateAsync({ type: "nodebuffer" });

        // 3. Write the resulting buffer to the specified output path
        await fs.writeFile(outputPath, content);
        console.log(`Successfully created CBZ file at ${outputPath}`);


        // 4. Clean up the source directory (only delete files, not empty dir)
        console.log("Cleaning up source directory...");
        for (const fileName of files) {
            const filePath = path.join(sourceDir, fileName);
            try {
                await fs.unlink(filePath);
                console.log(`Deleted file: ${fileName}`);
            } catch (cleanupError) {
                // Ignore errors if a file was already deleted or is inaccessible
                console.warn(`Could not delete file ${filePath}:`, cleanupError.message);
            }
        }

    } catch (error) {
        console.error("Failed to create CBZ archive:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

module.exports = {
    createCbz
};