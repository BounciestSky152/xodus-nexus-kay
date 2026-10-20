import { describe, expect, it } from 'vitest';
import { autoZoomFactor, WindowZoom, zoomShortcut } from './window-zoom.js';

const key = (key: string, modifiers: Partial<{ control: boolean; meta: boolean; alt: boolean }> = { control: true }) =>
  ({ type: 'keyDown', key, control: false, meta: false, alt: false, ...modifiers });

function fakeWindow(width: number, height: number) {
  const state = { size: [width, height], factor: 1, sets: 0 };
  const window = {
    getContentSize: () => state.size,
    webContents: { getZoomFactor: () => state.factor, setZoomFactor: (factor: number) => { state.factor = factor; state.sets++; } },
  } as unknown as ConstructorParameters<typeof WindowZoom>[0];
  return { state, window };
}

describe('automatic window zoom', () => {
  it.each([
    [1280, 800, 1], [1440, 900, 1], [800, 600, 1], [1920, 1080, 1],
    [2560, 1440, 1.33], [3840, 2160, 2], [2560, 1080, 1], [3440, 1440, 1.33], [7680, 4320, 3],
  ])('scales %ix%i by %f', (width, height, factor) => {
    expect(autoZoomFactor(width, height)).toBe(factor);
  });

  it('never shrinks or produces an invalid factor for an unmeasured window', () => {
    expect(autoZoomFactor(0, 0)).toBe(1);
    expect(autoZoomFactor(Number.NaN, 2160)).toBe(1);
  });

  it('follows the window size and skips redundant updates', () => {
    const { state, window } = fakeWindow(1920, 1080);
    const zoom = new WindowZoom(window);
    zoom.apply();
    expect(state.sets).toBe(0);
    state.size = [3840, 2160];
    zoom.apply();
    zoom.apply();
    expect(state.factor).toBe(2);
    expect(state.sets).toBe(1);
  });

  it('keeps keyboard zoom relative to the automatic scale across resizes', () => {
    const { state, window } = fakeWindow(3840, 2160);
    const zoom = new WindowZoom(window);
    expect(zoom.handleInput(key('='))).toBe(true);
    expect(state.factor).toBeCloseTo(2 * 1.2 ** 0.5);
    state.size = [1920, 1080];
    zoom.apply();
    expect(state.factor).toBeCloseTo(1.2 ** 0.5);
    zoom.handleInput(key('-'));
    zoom.handleInput(key('-'));
    expect(state.factor).toBeCloseTo(1.2 ** -0.5);
    zoom.handleInput(key('0'));
    expect(state.factor).toBe(1);
  });

  it('bounds repeated keyboard zoom', () => {
    const { state, window } = fakeWindow(1920, 1080);
    const zoom = new WindowZoom(window);
    for (let i = 0; i < 40; i++) zoom.handleInput(key('+'));
    expect(state.factor).toBeCloseTo(1.2 ** 5);
  });

  it('only claims zoom shortcuts', () => {
    expect(zoomShortcut(key('+', { meta: true }))).toBe('in');
    expect(zoomShortcut(key('='))).toBe('in');
    expect(zoomShortcut(key('-'))).toBe('out');
    expect(zoomShortcut(key('0'))).toBe('reset');
    expect(zoomShortcut(key('0', {}))).toBeUndefined();
    expect(zoomShortcut(key('-', { control: true, alt: true }))).toBeUndefined();
    expect(zoomShortcut(key('r'))).toBeUndefined();
    expect(zoomShortcut({ ...key('='), type: 'keyUp' })).toBeUndefined();
    const { state, window } = fakeWindow(1920, 1080);
    expect(new WindowZoom(window).handleInput(key('c'))).toBe(false);
    expect(state.sets).toBe(0);
  });
});
