<script lang="ts">
	import type { ITimelineElement } from '$lib/interfaces/Timeline';
	import { CONSTS } from '$lib/utils/consts';

	export let element: ITimelineElement;
	export let fullWidth: number;
	export let leftTrim: number;

	interface IFilmstripTile {
		frame: string;
	}

	// remember the last tile list so trim changes can reuse it
	let cachedFrames: string[] | undefined;
	let cachedSourceWidth = -1;
	let cachedTileWidth = -1;
	let cachedTiles: IFilmstripTile[] = [];

	$: frames = element.timelineFrames ?? [];
	$: tileWidth = getTileWidth();
	$: tiles = getFilmstripTiles(frames, fullWidth, tileWidth);
	$: stripWidth = tiles.length * tileWidth;

	function getTileWidth(): number {
		// keep each tile the same shape as the saved frame
		const frameAspectRatio =
			CONSTS.timelineFilmstripFrameWidth / CONSTS.timelineFilmstripFrameHeight;
		return Math.round(CONSTS.timelineRowElementHeight * frameAspectRatio);
	}

	function getFilmstripTiles(
		frames: string[],
		sourceWidth: number,
		tileWidth: number
	): IFilmstripTile[] {
		if (frames.length === 0 || sourceWidth <= 0 || tileWidth <= 0) {
			return [];
		}

		if (
			cachedFrames === frames &&
			cachedSourceWidth === sourceWidth &&
			cachedTileWidth === tileWidth
		) {
			// the strip shape did not change, so reuse the old tiles
			return cachedTiles;
		}

		// use the full video width so trimming only moves and clips the strip
		const tileCount = Math.max(1, Math.ceil(sourceWidth / tileWidth) + 1);

		const newTiles = Array.from({ length: tileCount }, (_, index) => {
			const tileMidpoint = (index + 0.5) * tileWidth;
			const frameIndex = getFrameIndex(tileMidpoint, sourceWidth, frames.length);

			return {
				frame: frames[frameIndex]
			};
		});

		// save the new tile list for the next reactive update
		cachedFrames = frames;
		cachedSourceWidth = sourceWidth;
		cachedTileWidth = tileWidth;
		cachedTiles = newTiles;

		return newTiles;
	}

	function getFrameIndex(tileMidpoint: number, sourceWidth: number, frameCount: number): number {
		if (frameCount <= 1 || sourceWidth <= 0) {
			return 0;
		}

		const progress = Math.max(0, Math.min(1, tileMidpoint / sourceWidth));
		return Math.max(0, Math.min(frameCount - 1, Math.round(progress * (frameCount - 1))));
	}
</script>

<div class="timeline-filmstrip absolute left-0 top-0 h-full w-full overflow-hidden rounded">
	<!-- the outer box cuts the strip when the clip is trimmed -->
	<div
		class="flex h-full"
		style="
			width: {stripWidth}px;
			transform: translateX(-{leftTrim}px);
		"
	>
		{#each tiles as tile}
			<img
				src={tile.frame}
				alt=""
				class="h-full shrink-0 object-cover"
				style="width: {tileWidth}px;"
				draggable="false"
			/>
		{/each}
	</div>
</div>
