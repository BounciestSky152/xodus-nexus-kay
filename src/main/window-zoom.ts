import type { BrowserWindow, Input } from 'electron';

// The renderer is laid out in CSS pixels for a 1080p-class window. A larger
// window (a 4K TV in Steam Game Mode, or a desktop where Chromium receives no
// scale factor) would otherwise show that layout at the same physical size in
// a wide empty margin, so page zoom grows it to fill the window instead.
const designWidth = 1920;
const designHeight = 1080;
const maxAutoZoom = 3;
// Chromium zoom levels are powers of 1.2; Electron's zoom menu roles step by half a level.
const levelStep = 0.5;
const maxUserLevel = 5;

export function autoZoomFactor(width: number, height: number): number {
  const fit = Math.min(width / designWidth, height / designHeight);
  // Never shrink: smaller windows already have responsive layouts.
  if (!(fit > 1)) return 1;
  return Math.min(maxAutoZoom, Math.floor(fit * 100) / 100);
}

export function zoomShortcut(input: Pick<Input, 'type' | 'key' | 'control' | 'meta' | 'alt'>): 'in' | 'out' | 'reset' | undefined {
  if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return;
  if (input.key === '+' || input.key === '=') return 'in';
  if (input.key === '-') return 'out';
  if (input.key === '0') return 'reset';
}

export class WindowZoom {
  private userLevel = 0;

  constructor(private readonly window: Pick<BrowserWindow, 'getContentSize' | 'webContents'>) {}

  apply(): void {
    const [width, height] = this.window.getContentSize();
    const factor = autoZoomFactor(width, height) * 1.2 ** this.userLevel;
    if (Math.abs(this.window.webContents.getZoomFactor() - factor) > 0.001) this.window.webContents.setZoomFactor(factor);
  }

  /** Keeps Ctrl +/−/0 relative to the automatic scale. The default menu roles
   * set absolute levels, which the next resize would silently discard. */
  handleInput(input: Pick<Input, 'type' | 'key' | 'control' | 'meta' | 'alt'>): boolean {
    const shortcut = zoomShortcut(input);
    if (!shortcut) return false;
    this.userLevel = shortcut === 'reset' ? 0
      : Math.max(-maxUserLevel, Math.min(maxUserLevel, this.userLevel + (shortcut === 'in' ? levelStep : -levelStep)));
    this.apply();
    return true;
  }
}
