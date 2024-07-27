<script lang="ts">
	import Button from '../shared/Button.svelte';

	export let open = false;

	let progress = 20;

	function onClickBackdrop(e: Event) {
		e.stopPropagation();
		console.log('onClickBackdrop');
	}
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-background-color-darker export-dialog-bg"
		on:click={onClickBackdrop}
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 export-dialog bg-background-color-light top-1/2 left-1/2 h-[400px] w-[700px] rounded-2xl p-8 gap-3 flex flex-col items-center justify-center"
		>
			<div class="text-3xl">Exporting...</div>
			<div class="mb-10 text-lg text-l">Your video is being processed, please wait</div>
			<div class="flex items-center gap-4">
				<div
					class="progress-bar h-4 w-[450px] bg-background-color-darker rounded-sm relative block"
				>
					<span style="width: {progress}%;" class="block h-full rounded-sm bg-accent-color"></span>
				</div>
				<div class="color-accent-color">{progress}%</div>
			</div>
			<div>Estimated Time Left: TBD</div>
			<div class="mt-10">
				<Button text={'Cancel'}></Button>
			</div>
		</div>
	</div>
{/if}
