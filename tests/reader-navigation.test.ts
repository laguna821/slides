import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReaderNavigation } from '../scripts/release-gate';
test('reader navigation evidence covers every scroll position and rejects missing or displaced controls', () => {
  const route = '/talks/fixture/read/';
  const rows = [375, 768, 1440].flatMap((width) =>
    ['light', 'dark'].map((theme) => ({
      route,
      width,
      actualWidth: width,
      theme,
      themeSwitch: true,
      themeSync: true,
      themePersisted: true,
      tocReachable: true,
      keyboard: true,
      scrollShift: 0,
      positions: ['start', 'middle', 'end'].map((position) => ({
        position,
        controlsVisible: true,
        sameRow: true,
        noOverlap: true,
        minTarget: 44,
        toolbarTop: 0,
      })),
    })),
  );
  validateReaderNavigation(rows, route);
  assert.throws(() => validateReaderNavigation(rows.slice(1), route));
  assert.throws(() =>
    validateReaderNavigation(
      rows.map((r) => ({ ...r, scrollShift: 80 })),
      route,
    ),
  );
  assert.throws(() =>
    validateReaderNavigation(
      rows.map((r) => ({ ...r, positions: r.positions.slice(0, 2) })),
      route,
    ),
  );
  assert.throws(() =>
    validateReaderNavigation(
      rows.map((r) => ({
        ...r,
        positions: r.positions.map((p) => ({ ...p, toolbarTop: -61 })),
      })),
      route,
    ),
  );
  assert.throws(() =>
    validateReaderNavigation(
      rows.map((r) => ({ ...r, themeSync: false })),
      route,
    ),
  );
});
