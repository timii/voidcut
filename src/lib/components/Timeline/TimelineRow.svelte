<script lang="ts">
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';
	import TimelineRowElement from './TimelineRowElement.svelte';

	export let track: ITimelineTrack;
	console.log('TimelineRow -> track:', track);
</script>

<div class="bg-ruler-color h-[50px] opacity-50 w-full mr-5 rounded">
	{#each track.elements as element}
		<TimelineRowElement {element}></TimelineRowElement>
	{/each}
</div>
