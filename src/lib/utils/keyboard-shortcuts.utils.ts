import {
	deleteSelectedTimelineElement,
	duplicateSelectedTimelineElement,
	nudgeSelectedTimelineElement,
	redoTimelineEdit,
	skipPlayhead,
	splitSelectedTimelineElement,
	stepPlayhead,
	togglePlayback,
	undoTimelineEdit
} from './timeline-actions.utils';

export type KeyboardShortcutAction =
	| 'delete'
	| 'toggle-playback'
	| 'skip-start'
	| 'skip-end'
	| 'step-backward'
	| 'step-forward'
	| 'split'
	| 'duplicate'
	| 'nudge-left'
	| 'nudge-right'
	| 'undo'
	| 'redo';

type ShortcutModifier = 'none' | 'primary' | 'primary-shift' | 'alt';

export interface KeyboardShortcutTarget {
	tagName?: string;
	isContentEditable?: boolean;
	role?: string | null;
}

export interface KeyboardShortcutEvent {
	key: string;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	repeat: boolean;
	target: EventTarget | KeyboardShortcutTarget | null;
	preventDefault: () => unknown;
}

export interface KeyboardShortcutDefinition {
	action: KeyboardShortcutAction;
	description: string;
	eventKeys: string[];
	keys: string[][];
	modifier: ShortcutModifier;
	repeatable: boolean;
}

export interface KeyboardShortcutGroup {
	label: string;
	shortcuts: KeyboardShortcutDefinition[];
}

export type KeyboardShortcutActions = Partial<Record<KeyboardShortcutAction, () => unknown>>;

export const keyboardShortcutGroups: KeyboardShortcutGroup[] = [
	{
		label: 'History',
		shortcuts: [
			{
				action: 'undo',
				description: 'Undo timeline edit',
				eventKeys: ['z'],
				keys: [['Ctrl', 'Cmd'], ['Z']],
				modifier: 'primary',
				repeatable: false
			},
			{
				action: 'redo',
				description: 'Redo timeline edit',
				eventKeys: ['z'],
				keys: [['Ctrl', 'Cmd'], ['Shift'], ['Z']],
				modifier: 'primary-shift',
				repeatable: false
			}
		]
	},
	{
		label: 'Playback',
		shortcuts: [
			{
				action: 'toggle-playback',
				description: 'Play or pause playback',
				eventKeys: [' '],
				keys: [['Space']],
				modifier: 'none',
				repeatable: false
			},
			{
				action: 'skip-start',
				description: 'Skip to timeline start',
				eventKeys: ['Home'],
				keys: [['Home']],
				modifier: 'none',
				repeatable: false
			},
			{
				action: 'skip-end',
				description: 'Skip to timeline end',
				eventKeys: ['End'],
				keys: [['End']],
				modifier: 'none',
				repeatable: false
			},
			{
				action: 'step-backward',
				description: 'Step one frame backward',
				eventKeys: ['ArrowLeft'],
				keys: [['←']],
				modifier: 'none',
				repeatable: true
			},

			{
				action: 'step-forward',
				description: 'Step one frame forward',
				eventKeys: ['ArrowRight'],
				keys: [['→']],
				modifier: 'none',
				repeatable: true
			}
		]
	},
	{
		label: 'Timeline editing',
		shortcuts: [
			{
				action: 'delete',
				description: 'Delete selected clip',
				eventKeys: ['Delete', 'Backspace'],
				keys: [['Delete', 'Backspace']],
				modifier: 'none',
				repeatable: false
			},
			{
				action: 'split',
				description: 'Split selected clip',
				eventKeys: ['k'],
				keys: [['Ctrl', 'Cmd'], ['K']],
				modifier: 'primary',
				repeatable: false
			},
			{
				action: 'duplicate',
				description: 'Duplicate selected clip',
				eventKeys: ['d'],
				keys: [['Ctrl', 'Cmd'], ['D']],
				modifier: 'primary',
				repeatable: false
			},
			{
				action: 'nudge-left',
				description: 'Nudge selected clip left',
				eventKeys: ['ArrowLeft'],
				keys: [['Alt', 'Option'], ['←']],
				modifier: 'alt',
				repeatable: true
			},
			{
				action: 'nudge-right',
				description: 'Nudge selected clip right',
				eventKeys: ['ArrowRight'],
				keys: [['Alt', 'Option'], ['→']],
				modifier: 'alt',
				repeatable: true
			}
		]
	}
];

const shortcutDefinitions = keyboardShortcutGroups.flatMap((group) => group.shortcuts);

const defaultActions: KeyboardShortcutActions = {
	delete: deleteSelectedTimelineElement,
	'toggle-playback': togglePlayback,
	'skip-start': () => skipPlayhead('start'),
	'skip-end': () => skipPlayhead('end'),
	'step-backward': () => stepPlayhead('backward'),
	'step-forward': () => stepPlayhead('forward'),
	split: splitSelectedTimelineElement,
	duplicate: duplicateSelectedTimelineElement,
	'nudge-left': () => nudgeSelectedTimelineElement('left'),
	'nudge-right': () => nudgeSelectedTimelineElement('right'),
	undo: undoTimelineEdit,
	redo: redoTimelineEdit
};

export function formatShortcutTooltip(label: string, action: KeyboardShortcutAction): string {
	const shortcut = shortcutDefinitions.find((definition) => definition.action === action);
	if (!shortcut) {
		return label;
	}

	// derive button hints from the same bindings rendered in the help dialog
	const binding = shortcut.keys.map((keyGroup) => keyGroup.join(' / ')).join(' + ');
	return `${label} (${binding})`;
}

function hasMatchingModifiers(event: KeyboardShortcutEvent, modifier: ShortcutModifier): boolean {
	if (modifier === 'primary') {
		return !event.altKey && !event.shiftKey && event.ctrlKey !== event.metaKey;
	}

	if (modifier === 'primary-shift') {
		return !event.altKey && event.shiftKey && event.ctrlKey !== event.metaKey;
	}

	if (modifier === 'alt') {
		return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
	}

	return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

const interactiveRoles = new Set([
	'button',
	'checkbox',
	'combobox',
	'link',
	'menuitem',
	'option',
	'radio',
	'slider',
	'spinbutton',
	'switch',
	'tab',
	'textbox'
]);

const arrowNavigationRoles = new Set([
	'combobox',
	'menuitem',
	'option',
	'radio',
	'slider',
	'spinbutton',
	'tab'
]);

function isShortcutBlockedForTarget(event: KeyboardShortcutEvent): boolean {
	if (!event.target) {
		return false;
	}

	const interactiveTarget = event.target as KeyboardShortcutTarget;
	const tagName = interactiveTarget.tagName?.toLowerCase();
	const role = interactiveTarget.role?.toLowerCase() ?? '';
	const isEditable =
		interactiveTarget.isContentEditable === true ||
		tagName === 'input' ||
		tagName === 'textarea' ||
		tagName === 'select';

	// editable controls keep every key for text entry and native interaction
	if (isEditable) {
		return true;
	}

	// focused controls keep only the keys used for native activation or navigation
	if (event.key === ' ') {
		return tagName === 'a' || tagName === 'button' || interactiveRoles.has(role);
	}

	return event.key.startsWith('Arrow') && arrowNavigationRoles.has(role);
}

export function resolveKeyboardShortcut(
	event: KeyboardShortcutEvent,
	overlayOpen: boolean
): { action: KeyboardShortcutAction; execute: boolean } | null {
	if (overlayOpen || isShortcutBlockedForTarget(event)) {
		return null;
	}

	const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	const shortcut = shortcutDefinitions.find(
		(definition) =>
			definition.eventKeys.includes(normalizedKey) &&
			hasMatchingModifiers(event, definition.modifier)
	);

	if (!shortcut) {
		return null;
	}

	return {
		action: shortcut.action,
		execute: !event.repeat || shortcut.repeatable
	};
}

export function handleKeyboardShortcut(
	event: KeyboardShortcutEvent,
	overlayOpen: boolean,
	actions: KeyboardShortcutActions = defaultActions
): boolean {
	const resolution = resolveKeyboardShortcut(event, overlayOpen);
	if (!resolution) {
		return false;
	}

	// prevent browser actions even when a held non-repeatable shortcut is ignored
	event.preventDefault();
	if (resolution.execute) {
		actions[resolution.action]?.();
	}

	return true;
}
