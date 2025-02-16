<script lang="ts">
	import PreviewControls from './PreviewControls.svelte';
	import PreviewPlayer from './PreviewPlayer.svelte';
</script>

<div class="preview-container h-full w-full flex flex-col gap-4 p-4">
	<div
		class="preview-player-container min-h-full max-h-full border flex-1 flex flex-col justify-center items-center"
	>
		<PreviewPlayer></PreviewPlayer>
	</div>
	<div class="preview-controls-container h-8">
		<PreviewControls></PreviewControls>
	</div>
</div>
