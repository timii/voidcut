<script lang="ts">
	import LoadingIndicator from '../shared/LoadingIndicator.svelte';

	export let open = false;
</script>

{#if open}
	<div
		class="absolute top-0 left-0 z-10 w-full h-full bg-opacity-80 bg-backdrop-color about-dialog-bg"
	>
		<div
			class="fixed -translate-x-1/2 -translate-y-1/2 about-dialog bg-background-highlight text-text-highlight top-1/2 left-1/2 h-[300px] w-[400px] rounded-2xl p-8 gap-4 flex flex-col items-center justify-center"
			on:click={(e) => e.stopPropagation()}
		>
			<LoadingIndicator></LoadingIndicator>

			<div>Restoring last state...</div>
		</div>
	</div>
{/if}
