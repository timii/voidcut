<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import KeyboardIcon from '$lib/assets/header/keyboard.png';
	import CloseIcon from '$lib/assets/header/close.png';
	import { keyboardShortcutGroups } from '$lib/utils/keyboard-shortcuts.utils';
	import { keyboardShortcutsOverlayOpen } from '../../../stores/store';
	import IconButton from '../shared/IconButton.svelte';

	export let open = false;

	let dialogElement: HTMLDialogElement;
	let previouslyFocusedElement: HTMLElement | null = null;
	let wasOpen = false;
	let restoreTriggerFocus = true;

	// run focus setup and cleanup only when visibility changes
	$: if (open && !wasOpen) {
		wasOpen = true;
		activateDialog();
	} else if (!open && wasOpen) {
		wasOpen = false;
		deactivateDialog();
	}

	async function activateDialog() {
		if (typeof document === 'undefined') {
			return;
		}

		// remember the trigger so keyboard dismissal can return focus
		previouslyFocusedElement =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		await tick();

		if (open) {
			const firstFocusableElement = getFocusableElements()[0];
			if (firstFocusableElement) {
				firstFocusableElement.focus();
			} else {
				dialogElement?.focus();
			}
		}
	}

	async function deactivateDialog() {
		const elementToRestore = previouslyFocusedElement;
		const shouldRestoreFocus = restoreTriggerFocus;
		previouslyFocusedElement = null;
		restoreTriggerFocus = true;
		await tick();

		if (shouldRestoreFocus && elementToRestore?.isConnected) {
			elementToRestore.focus();
		}
	}

	function getFocusableElements(): HTMLElement[] {
		if (!dialogElement) {
			return [];
		}

		return Array.from(
			dialogElement.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	function closeDialog(event?: Event) {
		// keyboard-triggered clicks have detail 0 while pointer clicks use a positive click count
		const pointerEventDetail = event?.type === 'click' ? (event as MouseEvent).detail : undefined;
		// pointer dismissal releases focus so global shortcuts work immediately
		restoreTriggerFocus = pointerEventDetail === undefined || pointerEventDetail === 0;
		keyboardShortcutsOverlayOpen.set(false);
	}

	function onDialogKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeDialog();
			return;
		}

		if (event.key !== 'Tab') {
			return;
		}

		// keep keyboard navigation inside the modal
		const focusableElements = getFocusableElements();
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];
		const activeElement = document.activeElement;

		if (!firstElement || !lastElement) {
			event.preventDefault();
			dialogElement.focus();
			return;
		}

		if (event.shiftKey && (activeElement === firstElement || activeElement === dialogElement)) {
			event.preventDefault();
			lastElement.focus();
		} else if (!event.shiftKey && activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		} else if (!dialogElement.contains(activeElement)) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	onDestroy(() => {
		if (previouslyFocusedElement?.isConnected) {
			previouslyFocusedElement.focus();
		}
	});
</script>

{#if open}
	<div class="absolute left-0 top-0 z-10 h-full w-full">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default border-0 bg-backdrop-color bg-opacity-80 p-0"
			on:click={closeDialog}
			aria-label="Close keyboard shortcuts"
		></button>
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<dialog
			bind:this={dialogElement}
			open
			class="fixed left-1/2 top-1/2 m-0 flex w-[460px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-xl border-0 bg-background-highlight p-6 text-text-highlight"
			tabindex="-1"
			on:keydown={onDialogKeyDown}
			aria-modal="true"
			aria-labelledby="keyboard-shortcuts-title"
		>
			<div class="flex items-center gap-3 pr-10">
				<img src={KeyboardIcon} alt="" width="24" />
				<h2 id="keyboard-shortcuts-title" class="text-lg font-semibold">Keyboard shortcuts</h2>
			</div>

			<div class="absolute right-5 top-4">
				<IconButton onClickCallback={closeDialog} icon={CloseIcon} alt="Close"></IconButton>
			</div>

			{#each keyboardShortcutGroups as group, groupIndex}
				<section class="flex flex-col gap-1.5" aria-labelledby={`shortcut-group-${groupIndex}`}>
					<h3
						id={`shortcut-group-${groupIndex}`}
						class="border-b border-background-icon-button pb-1.5 text-sm font-semibold"
					>
						{group.label}
					</h3>
					{#each group.shortcuts as shortcut}
						<div class="flex min-h-[30px] items-center justify-between gap-4 text-sm">
							<span class="text-text-info">{shortcut.description}</span>
							<div class="flex shrink-0 items-center gap-1" aria-label={shortcut.description}>
								{#each shortcut.keys as keyGroup, groupIndex}
									{#if groupIndex > 0}<span class="text-xs text-text-info">+</span>{/if}
									{#each keyGroup as key, keyIndex}
										{#if keyIndex > 0}<span class="text-xs text-text-info">/</span>{/if}
										<kbd
											class="min-w-[26px] rounded border border-background-icon-button bg-background-progress px-1.5 py-0.5 text-center text-xs text-text-highlight"
										>
											{key}
										</kbd>
									{/each}
								{/each}
							</div>
						</div>
					{/each}
				</section>
			{/each}
		</dialog>
	</div>
{/if}
