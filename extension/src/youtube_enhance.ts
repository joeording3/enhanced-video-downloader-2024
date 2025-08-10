/**
 * YouTube enhancement functionality for the Enhanced Video Downloader extension.
 * Provides video detection and download button injection for YouTube.
 */
// @ts-nocheck


import { ButtonState } from "./types";
import { getHostname } from "./lib/utils";

/**
 * Enhanced YouTube styling function
 * Makes the download button more visible on YouTube
 * @param btn - The download button element
 */
export function enhanceYouTubeButton(btn: HTMLElement | null | undefined): void {
  // Handle null/undefined button
  if (!btn) {
    return;
  }

  const hostname = getHostname();

  // Handle null/undefined hostname
  if (!hostname) {
    return;
  }

  // More precise YouTube domain detection
  const isYouTubeDomain =
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com" ||
    hostname.endsWith(".youtube.com");

  if (isYouTubeDomain) {
    // Enhancing YouTube button visibility

    // Add CSS class for enhanced YouTube styling
    btn.classList.add("youtube-enhanced");

    // Only adjust the default placement (fresh inject). Respect persisted user position.
    const isDefaultTop = !btn.style.top || btn.style.top === "10px";
    const isDefaultLeft = !btn.style.left || btn.style.left === "10px";
    if (isDefaultTop && isDefaultLeft) {
      btn.style.top = "70px"; // Below the YouTube header
      btn.style.left = String(window.innerWidth - 100) + "px"; // Right side with margin
    }
  }
}
