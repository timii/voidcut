<script lang="ts">
	import type { ITooltipCoords } from '$lib/interfaces/Tooltip';
	import { getTooltipPosition } from '$lib/utils/tooltip.utils';

	export let text = '';

	let isVisible = false;
	let coords: ITooltipCoords = {
		bottom: 0,
		top: 0,
		right: 0,
		left: 0,
		widthCutoff: 0
	};
	let containerRef: HTMLSpanElement | null = null;
	let tooltipRef: HTMLDivElement | null = null;
	let timer: number | null = null;

	function mouseOver() {
		coords = getTooltipPosition(containerRef, tooltipRef, coords);

		// only show tooltip after a delay
		timer = setTimeout(() => (isVisible = true), 500);
	}

	function mouseLeave() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		isVisible = false;
	}
</script>

<!-- wrapper element that handles the hover -->
<span
	bind:this={containerRef}
	on:mouseenter={mouseOver}
	on:mouseleave={mouseLeave}
	class="tooltip-container"
>
	<slot />
</span>
<div
	bind:this={tooltipRef}
	class="tooltip"
	class:show={isVisible}
	style="
		--widthCutoff: {coords.widthCutoff}px; 
		bottom: auto; 
		right: auto; 
		left: {coords.left}px; 
		top: {coords.top}px;
	"
>
	{text}
</div>

<style lang="postcss">
	.tooltip {
		background-color: theme(colors.background-tooltip);
		border-radius: 12px;
		color: theme(colors.text-color-lighter);
		opacity: 0;
		font-family: 'Noto Sans';
		font-size: 11px;
		font-weight: 600;
		line-height: 0.9rem;
		padding: 4px 12px;
		pointer-events: none;
		position: absolute;
		text-align: left;
		visibility: hidden;
		white-space: nowrap;
		z-index: 100;
		left: 50%;
		top: 0;
		/* the hardcoded "6px" is the y distance between container and tooltip */
		transform: translate(-50%, calc(-100% - 6px));
	}

	.tooltip.show {
		opacity: 1;
		visibility: visible;
		white-space: nowrap;
	}

	.tooltip:after {
		border: 6px solid theme(colors.background-tooltip);
		content: ' ';
		position: absolute;
		border-color: theme(colors.background-tooltip) transparent transparent transparent;
		bottom: 0;
		/* add the pixel amount the tooltip is cut off at the window edge to reposition the arrow accordingly */
		left: calc(50% + var(--widthCutoff));
		transform: translate(-50%, 99%);
	}
</style>
