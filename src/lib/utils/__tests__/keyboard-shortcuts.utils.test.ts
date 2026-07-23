import { describe, expect, it, vi } from 'vitest';
import {
	formatShortcutTooltip,
	handleKeyboardShortcut,
	resolveKeyboardShortcut,
	type KeyboardShortcutEvent
} from '../keyboard-shortcuts.utils';

function event(key: string, overrides: Partial<KeyboardShortcutEvent> = {}): KeyboardShortcutEvent {
	return {
		key,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		repeat: false,
		target: null,
		preventDefault: vi.fn(),
		...overrides
	};
}

describe('resolveKeyboardShortcut', () => {
	it.each([
		[event('Delete'), 'delete'],
		[event('Backspace'), 'delete'],
		[event(' '), 'toggle-playback'],
		[event('ArrowLeft'), 'step-backward'],
		[event('ArrowRight'), 'step-forward'],
		[event('Home'), 'skip-start'],
		[event('End'), 'skip-end'],
		[event('k', { ctrlKey: true }), 'split'],
		[event('K', { metaKey: true }), 'split'],
		[event('d', { ctrlKey: true }), 'duplicate'],
		[event('D', { metaKey: true }), 'duplicate'],
		[event('ArrowLeft', { altKey: true }), 'nudge-left'],
		[event('ArrowRight', { altKey: true }), 'nudge-right'],
		[event('z', { ctrlKey: true }), 'undo'],
		[event('Z', { metaKey: true }), 'undo'],
		[event('z', { ctrlKey: true, shiftKey: true }), 'redo'],
		[event('Z', { metaKey: true, shiftKey: true }), 'redo']
	] as const)('resolves %s to %s', (keyboardEvent, action) => {
		expect(resolveKeyboardShortcut(keyboardEvent, false)).toEqual({ action, execute: true });
	});

	it.each([
		event('Delete', { ctrlKey: true }),
		event(' ', { shiftKey: true }),
		event('k'),
		event('d', { altKey: true, ctrlKey: true }),
		event('Home', { ctrlKey: true }),
		event('End', { altKey: true }),
		event('ArrowRight', { metaKey: true }),
		event('y', { ctrlKey: true })
	])('requires the binding modifiers exactly', (keyboardEvent) => {
		expect(resolveKeyboardShortcut(keyboardEvent, false)).toBeNull();
	});

	it.each([
		['delete', event('Delete', { repeat: true })],
		['toggle-playback', event(' ', { repeat: true })],
		['skip-start', event('Home', { repeat: true })],
		['skip-end', event('End', { repeat: true })],
		['split', event('k', { ctrlKey: true, repeat: true })],
		['duplicate', event('d', { metaKey: true, repeat: true })],
		['undo', event('z', { ctrlKey: true, repeat: true })],
		['redo', event('z', { metaKey: true, shiftKey: true, repeat: true })]
	] as const)('recognizes but does not execute repeated %s', (action, keyboardEvent) => {
		expect(resolveKeyboardShortcut(keyboardEvent, false)).toEqual({ action, execute: false });
	});

	it.each([
		event('ArrowLeft', { repeat: true }),
		event('ArrowRight', { repeat: true }),
		event('ArrowLeft', { altKey: true, repeat: true }),
		event('ArrowRight', { altKey: true, repeat: true })
	])('allows repeated stepping and nudging', (keyboardEvent) => {
		expect(resolveKeyboardShortcut(keyboardEvent, false)?.execute).toBe(true);
	});

	it.each([
		{ tagName: 'INPUT' },
		{ tagName: 'textarea' },
		{ tagName: 'Select' },
		{ tagName: 'DIV', isContentEditable: true }
	])('ignores editable target %o', (target) => {
		expect(resolveKeyboardShortcut(event('Delete', { target }), false)).toBeNull();
	});

	it.each([
		{ tagName: 'BUTTON' },
		{ tagName: 'a' },
		{ tagName: 'DIV', role: 'button' },
		{ tagName: 'SPAN', role: 'link' }
	])('preserves Space activation for interactive target %o', (target) => {
		expect(resolveKeyboardShortcut(event(' ', { target }), false)).toBeNull();
	});

	it.each([
		[event('Delete', { target: { tagName: 'BUTTON' } }), 'delete'],
		[event('Backspace', { target: { tagName: 'a' } }), 'delete'],
		[event('d', { ctrlKey: true, target: { tagName: 'BUTTON' } }), 'duplicate'],
		[event('D', { metaKey: true, target: { tagName: 'DIV', role: 'button' } }), 'duplicate']
	] as const)('resolves editing shortcuts when focus remains on a control', (keyboardEvent, action) => {
		expect(resolveKeyboardShortcut(keyboardEvent, false)).toEqual({ action, execute: true });
	});

	it('ignores shortcuts while an overlay is open', () => {
		expect(resolveKeyboardShortcut(event('Delete'), true)).toBeNull();
	});
});

describe('formatShortcutTooltip', () => {
	it.each([
		['Play', 'toggle-playback', 'Play (Space)'],
		['Delete', 'delete', 'Delete (Delete / Backspace)'],
		['Split', 'split', 'Split (Ctrl / Cmd + K)'],
		['Skip To Start', 'skip-start', 'Skip To Start (Home)'],
		['Undo', 'undo', 'Undo (Ctrl / Cmd + Z)'],
		['Redo', 'redo', 'Redo (Ctrl / Cmd + Shift + Z)']
	] as const)('formats %s from shared shortcut metadata', (label, action, expected) => {
		expect(formatShortcutTooltip(label, action)).toBe(expected);
	});
});

describe('handleKeyboardShortcut', () => {
	it('prevents browser defaults and invokes a recognized action', () => {
		const keyboardEvent = event('Delete');
		const run = vi.fn();

		handleKeyboardShortcut(keyboardEvent, false, { delete: run });

		expect(keyboardEvent.preventDefault).toHaveBeenCalledOnce();
		expect(run).toHaveBeenCalledOnce();
	});

	it('prevents browser defaults for recognized repeated actions that do not execute', () => {
		const keyboardEvent = event('Delete', { repeat: true });
		const run = vi.fn();

		handleKeyboardShortcut(keyboardEvent, false, { delete: run });

		expect(keyboardEvent.preventDefault).toHaveBeenCalledOnce();
		expect(run).not.toHaveBeenCalled();
	});

	it('does not prevent defaults for ignored editable targets or overlays', () => {
		const editableEvent = event('Delete', { target: { tagName: 'INPUT' } });
		const overlayEvent = event('Delete');

		handleKeyboardShortcut(editableEvent, false, {});
		handleKeyboardShortcut(overlayEvent, true, {});

		expect(editableEvent.preventDefault).not.toHaveBeenCalled();
		expect(overlayEvent.preventDefault).not.toHaveBeenCalled();
	});
});
