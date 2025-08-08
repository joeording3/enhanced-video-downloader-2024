"use strict";
/**
 * Enhanced YouTube styling module
 * Makes the download button more visible on YouTube
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceYouTubeButton = enhanceYouTubeButton;
const utils_1 = require("./lib/utils");
/**
 * Enhanced YouTube styling function
 * Makes the download button more visible on YouTube
 * @param btn - The download button element
 */
function enhanceYouTubeButton(btn) {
    // Handle null/undefined button
    if (!btn) {
        return;
    }
    const hostname = (0, utils_1.getHostname)();
    // Handle null/undefined hostname
    if (!hostname) {
        return;
    }
    // More precise YouTube domain detection
    const isYouTubeDomain = hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "music.youtube.com" ||
        hostname.endsWith(".youtube.com");
    if (isYouTubeDomain) {
        // Enhancing YouTube button visibility
        // Add CSS class for enhanced YouTube styling
        btn.classList.add("youtube-enhanced");
        // Position in a more visible area for YouTube if not specifically placed by user
        if (!btn.style.top || btn.style.top === "10px") {
            // Move button to a more visible position if it's at the default
            btn.style.top = "70px"; // Below the YouTube header
            btn.style.left = String(window.innerWidth - 100) + "px"; // Right side with margin
        }
        else {
            // If button has a custom top position, still set the left position
            btn.style.left = String(window.innerWidth - 100) + "px"; // Right side with margin
        }
    }
}
