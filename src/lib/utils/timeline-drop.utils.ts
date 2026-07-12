import type { ITimelineElement, ITimelineElementBounds } from '$lib/interfaces/Timeline';

function getElementEnd(element: ITimelineElement): number {
	return element.playbackStartTime + element.duration;
}

function compareByStartTime(first: ITimelineElement, second: ITimelineElement): number {
	return first.playbackStartTime - second.playbackStartTime;
}

function isOverlapping(bounds: ITimelineElementBounds, element: ITimelineElement): boolean {
	return bounds.start < getElementEnd(element) && bounds.end > element.playbackStartTime;
}

function canMoveLeft(
	target: ITimelineElement,
	previousElement: ITimelineElement | undefined,
	dropStart: number
): boolean {
	const candidateStart = dropStart - target.duration;
	const previousEnd = previousElement ? getElementEnd(previousElement) : 0;

	return candidateStart >= 0 && candidateStart >= previousEnd;
}

function cascadeAfterAnchor(
	anchoredElements: ITimelineElement[],
	followingElements: ITimelineElement[]
): ITimelineElement[] {
	const resolvedElements = [...anchoredElements];
	let previousEnd = getElementEnd(resolvedElements[resolvedElements.length - 1]);

	followingElements.forEach((element) => {
		const startTime = Math.max(element.playbackStartTime, previousEnd);
		const resolvedElement =
			startTime === element.playbackStartTime
				? element
				: { ...element, playbackStartTime: startTime };

		resolvedElements.push(resolvedElement);
		previousEnd = getElementEnd(resolvedElement);
	});

	return resolvedElements;
}

/**
 * resolve a timeline element drop without mutating the source elements
 */
export function resolveTimelineElementDrop(
	trackElements: ITimelineElement[],
	draggedElement: ITimelineElement,
	newBounds: ITimelineElementBounds
): ITimelineElement[] {
	// exclude the dragged element before resolving collisions
	const existingElements = trackElements
		.filter((element) => element.elementId !== draggedElement.elementId)
		.map((element) => ({ ...element }))
		.sort(compareByStartTime);
	const resolvedDraggedElement = {
		...draggedElement,
		playbackStartTime: newBounds.start
	};

	const firstOverlapIndex = existingElements.findIndex((element) =>
		isOverlapping(newBounds, element)
	);

	if (firstOverlapIndex === -1) {
		return [...existingElements, resolvedDraggedElement].sort(compareByStartTime);
	}

	const target = existingElements[firstOverlapIndex];
	const previousElement = existingElements[firstOverlapIndex - 1];
	const targetMidpoint = target.playbackStartTime + target.duration / 2;
	const dropStartsInRightHalf = newBounds.start >= targetMidpoint;
	// only the first overlap can move left when dropped on its right half
	const targetCanMoveLeft =
		dropStartsInRightHalf && canMoveLeft(target, previousElement, newBounds.start);
	const resolvedTarget = {
		...target,
		playbackStartTime: targetCanMoveLeft ? newBounds.start - target.duration : newBounds.end
	};
	const elementsBeforeTarget = existingElements.slice(0, firstOverlapIndex);
	const elementsAfterTarget = existingElements.slice(firstOverlapIndex + 1);

	if (targetCanMoveLeft) {
		return cascadeAfterAnchor(
			[...elementsBeforeTarget, resolvedTarget, resolvedDraggedElement],
			elementsAfterTarget
		);
	}

	return cascadeAfterAnchor(
		[...elementsBeforeTarget, resolvedDraggedElement, resolvedTarget],
		elementsAfterTarget
	);
}
