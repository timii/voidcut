<script lang="ts">
	import PreviewControls from './PreviewControls.svelte';
	import PreviewPlayer from './PreviewPlayer.svelte';
</script>

<div class="preview-container h-full w-full flex flex-col gap-4">
	<div class="preview-player-container border flex-1">
		<PreviewPlayer></PreviewPlayer>
	</div>
	<div class="preview-controls-container h-8">
		<PreviewControls></PreviewControls>
	</div>
</div>
