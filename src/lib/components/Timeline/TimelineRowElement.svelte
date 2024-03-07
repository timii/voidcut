<script lang="ts">
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';
	import { getIndexOfElementInTracks, getTailwindVariables } from '$lib/utils/utils';
	import {
		currentTimelineScale,
		horizontalScroll,
		isThumbBeingDragged,
		isTimelineElementBeingDragged,
		selectedElement,
		thumbOffset,
		timelineTracks
	} from '../../../stores/store';

	export let element: ITimelineElement = {} as ITimelineElement;

	// check if selected element matches id of this element
	$: isSelected = $selectedElement === element.elementId;

	// dynamically calculate left offset of element
	$: leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;
	leftOffset = (element.playbackStartTime / CONSTS.secondsMultiplier) * $currentTimelineScale;

	$: elementWidth = (element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale;
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
		(element.duration / CONSTS.secondsMultiplier) * $currentTimelineScale,
		'leftOffset:',
		leftOffset
	);

	const tailwindVariables = getTailwindVariables();
	const tailwindColors = tailwindVariables.theme.colors;

	function onElementClick(e: MouseEvent) {
		// avoid timeline thumb being dragged when clicking on element
		e.stopPropagation();
		$selectedElement = element.elementId;
	}

	function onElementDrag(e: MouseEvent) {
		e.preventDefault();

		// only drag element if mouse is held down and the timeline thumb is currently not being dragged
		if (e.buttons === 1 && !$isThumbBeingDragged) {
			// avoid timeline thumb being dragged when dragging the mouse over it
			e.stopPropagation();

			// calculate new position using the mouse position on the x axis, the left thumb offset and the amount scrolled horizontally
			// TODO: we need to use a new calcualtion because we can't directly use the mouse position and instead calculate the difference the mouse moved to see where we need to move the element
			const newPos = e.clientX - $thumbOffset + $horizontalScroll;

			// avoid the element to be moved further left than the tracks
			if (newPos >= 0) {
				const scrolledPxInSeconds = Math.round(
					(newPos / $currentTimelineScale) * CONSTS.secondsMultiplier
				);
				console.log('onElementDrag -> newPos:', newPos, 'in seconds:', scrolledPxInSeconds);
				element.playbackStartTime = scrolledPxInSeconds;
				leftOffset = scrolledPxInSeconds;

				// TODO: calculate horizontal position when dragging
				// TODO: update timeline tracks with correct offset

				const indeces = getIndexOfElementInTracks();
				if (!indeces) {
					return;
				}
				const firstIndex = indeces[0];
				const secondIndex = indeces[1];
				timelineTracks.update(
					(tracks) => {
						const track = tracks[firstIndex];
						const newEl = track.elements[secondIndex];
						const obj: ITimelineElement = {
							...newEl,
							playbackStartTime: newPos
						};
						track.elements[secondIndex] = obj;
						tracks[firstIndex] = track;
						console.log('onElementDrag -> tracks after mapping:', tracks);
						return tracks;
					}
					// tracks.map(
					// (track) => track.elements.map((el) => el)
					// track.elements.map((el) => {
					// 	if (el.elementId === element.elementId) {
					// 		return {
					// 			...el,
					// 			playbackStartTime: newPos
					// 		};
					// 	}
					// 	return el;
					// })
					// )
				);

				if (!$isTimelineElementBeingDragged) {
					$isTimelineElementBeingDragged = true;
					console.log('isTimelineElementBeingDragged?:', $isTimelineElementBeingDragged);
				}
			}
		}
	}
</script>

<div
	class=" h-[50px] mr-5 rounded"
	style="width: {elementWidth}px; background-color: {isSelected
		? tailwindColors.orange[500]
		: tailwindColors.red[500]}; transform: translateX({leftOffset}px)"
	on:mousedown={onElementClick}
	on:mousemove={onElementDrag}
></div>
