<script lang="ts">
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import { currentTimelineScale } from '../../../stores/store';

	export let element: ITimelineElement;

	$: elementWidth = (element.duration / 1000) * $currentTimelineScale;
	console.log(
		'TimelineRowElement -> element:',
		element,
		'width:',
		elementWidth,
		'duration:',
		element.duration,
		'scale:',
		$currentTimelineScale,
		'calc:',
		(element.duration / 1000) * $currentTimelineScale
	);
</script>

<div class="bg-red-500 h-[50px] mr-5 rounded" style="width: {elementWidth}px;"></div>
