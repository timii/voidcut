import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	aboutOverlayOpen,
	anyOverlayOpen,
	exportOverlayOpen,
	keyboardShortcutsOverlayOpen,
	restoreStateOverlayOpen
} from '../../../stores/store';

beforeEach(() => {
	aboutOverlayOpen.set(false);
	exportOverlayOpen.set(false);
	keyboardShortcutsOverlayOpen.set(false);
	restoreStateOverlayOpen.set(false);
});

describe('anyOverlayOpen', () => {
	it.each([
		['about', aboutOverlayOpen],
		['export', exportOverlayOpen],
		['keyboard shortcuts', keyboardShortcutsOverlayOpen],
		['restore state', restoreStateOverlayOpen]
	])('tracks the %s overlay', (_, overlayStore) => {
		overlayStore.set(true);
		expect(get(anyOverlayOpen)).toBe(true);

		overlayStore.set(false);
		expect(get(anyOverlayOpen)).toBe(false);
	});
});
