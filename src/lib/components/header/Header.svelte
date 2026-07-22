<script lang="ts">
	import {
		aboutOverlayOpen,
		exportOverlayOpen,
		keyboardShortcutsOverlayOpen,
		lastSaveTime,
		previewPlaying,
		timelineTracks
	} from '../../../stores/store';
	import Button from '../shared/Button.svelte';
	import AppIcon from '$lib/assets/general/icon-white-50.png';
	import AboutIcon from '$lib/assets/header/about.png';
	import KeyboardIcon from '$lib/assets/header/keyboard.png';
	import ExportIcon from '$lib/assets/header/export.png';
	import UndoIcon from '$lib/assets/header/undo.svg';
	import RedoIcon from '$lib/assets/header/redo.svg';
	import IconButton from '../shared/IconButton.svelte';
	import { clearStorage, getState, updateState } from '$lib/utils/persistence/persistence.utils';
	import { isProduction } from '$lib/utils/utils';
	import { timelineHistory } from '$lib/utils/timeline-history.utils';
	import { redoTimelineEdit, undoTimelineEdit } from '$lib/utils/timeline-actions.utils';
	import { formatShortcutTooltip } from '$lib/utils/keyboard-shortcuts.utils';

	const { canUndo, canRedo, transactionActive } = timelineHistory;

	function openExportDialog() {
		exportOverlayOpen.set(true);
	}

	function openAboutDialog() {
		aboutOverlayOpen.set(true);
	}

	function openKeyboardShortcutsDialog() {
		keyboardShortcutsOverlayOpen.set(true);
	}

	// updates the current state in local storage, mainly used for testing
	async function saveCurrentState() {
		await updateState();
	}

	// get the current state from local storage, mainly used for testing
	async function getLastSavedState() {
		await getState();
	}

	// clear local storage, mainly used for testing
	function onClearStorage() {
		clearStorage();
	}
</script>

<div
	class="flex items-center justify-between px-4 py-3 header bg-background-highlight rounded-b-xl"
>
	<div class="flex items-center gap-1">
		<div class="bg-accent-color p-1 rounded">
			<img src={AppIcon} alt="logo" width="24" />
		</div>
	</div>

	<div class="flex justify-center items-center gap-4">
		{#if !isProduction()}
			<Button text={'Save'} onClickCallback={saveCurrentState}></Button>
			<Button text={'Get'} onClickCallback={getLastSavedState}></Button>
			<Button text={'Clear'} onClickCallback={onClearStorage}></Button>
		{/if}
		{#if $lastSaveTime}
			<div class="italic text-xs text-text-info">Last Save: {$lastSaveTime}</div>
		{/if}
		<div class="flex items-center gap-1">
			<IconButton
				icon={UndoIcon}
				alt="Undo"
				tooltipText={formatShortcutTooltip('Undo', 'undo')}
				tooltipPlacement="bottom"
				size={28}
				disabled={!$canUndo || $previewPlaying || $transactionActive}
				onClickCallback={undoTimelineEdit}
			></IconButton>
			<IconButton
				icon={RedoIcon}
				alt="Redo"
				tooltipText={formatShortcutTooltip('Redo', 'redo')}
				tooltipPlacement="bottom"
				size={28}
				disabled={!$canRedo || $previewPlaying || $transactionActive}
				onClickCallback={redoTimelineEdit}
			></IconButton>
		</div>
		<div class="h-6 w-px bg-text-info opacity-30" aria-hidden="true"></div>
		<IconButton
			icon={KeyboardIcon}
			alt="Keyboard shortcuts"
			tooltipText="Keyboard shortcuts"
			tooltipPlacement="bottom"
			size={28}
			onClickCallback={openKeyboardShortcutsDialog}
		></IconButton>
		<IconButton icon={AboutIcon} size={20} onClickCallback={openAboutDialog}></IconButton>
		<Button
			text={'Export'}
			onClickCallback={openExportDialog}
			icon={ExportIcon}
			disabled={$timelineTracks.length < 1}
		></Button>
	</div>
</div>
