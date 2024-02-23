<script lang="ts">
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import { getTailwindVariables } from '$lib/utils/utils';
	import {
		currentTimelineScale,
		isThumbBeingDragged,
		selectedElement
	} from '../../../stores/store';

	export let element: ITimelineElement;

	// check if selected element matches id of this element
	$: isSelected = $selectedElement === element.elementId;

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

	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;

	function onElementClick(e: MouseEvent) {
		// avoid timeline thumb being dragged when clicking on element
		e.stopPropagation();
		$selectedElement = element.elementId;
	}

	function onElementDrag(e: MouseEvent) {
		// avoid timeline tuhumb being dragged when dragging the mouse over it
		if (!$isThumbBeingDragged) {
			e.stopPropagation();
		}
	}
</script>

<div
	class=" h-[50px] mr-5 rounded"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}"
	on:mousedown={onElementClick}
	on:mousemove={onElementDrag}
></div>
