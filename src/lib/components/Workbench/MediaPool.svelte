<script lang="ts">
	import { availableMedia } from '../../../stores/store';
	import MediaPoolElement from './MediaPoolElement.svelte';
</script>

<div class="mediapool flex flex-row flex-wrap overflow-y-auto h-full content-start gap-2">
	{#each $availableMedia as media}
		<MediaPoolElement file={media}></MediaPoolElement>
	{/each}
</div>
