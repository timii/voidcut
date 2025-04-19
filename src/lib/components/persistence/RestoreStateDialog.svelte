<script lang="ts">
	import { clearStorage } from '$lib/utils/persistence/persistence.utils';
	import { stopPropagation } from '$lib/utils/utils';
	import Button from '../shared/Button.svelte';
	import LoadingIndicator from '../shared/LoadingIndicator.svelte';

	export let open = false;

	// clear local storage, mainly used for testing
	async function onClearStorage() {
		clearStorage();

		// reload page after clearing storage
		location.reload();
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-backdrop-color about-dialog-bg"
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 about-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 h-[300px] w-[400px] rounded-2xl p-8 gap-4 flex flex-col items-center justify-center"
			on:click={stopPropagation}
			aria-hidden="true"
		>
			<LoadingIndicator></LoadingIndicator>

			<div>Restoring last state...</div>

			<div class="mt-4">
				<Button text={'Delete last save and reload'} onClickCallback={onClearStorage}></Button>
			</div>
		</div>
	</div>
{/if}
