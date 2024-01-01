<script lang="ts">
	import type { ITimelineTrack } from '$lib/interfaces/Timeline';

	export let track: ITimelineTrack;
	console.log('TimelineRow -> track:', track);
</script>

<div class="bg-ruler-color h-[50px] w-[1200px] mr-5"></div>
