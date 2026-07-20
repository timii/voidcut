import { describe, expect, it, vi } from 'vitest';
import type { ITooltipCoords } from '$lib/interfaces/Tooltip';
import { getTooltipPosition } from '../tooltip.utils';

function rect(top: number, left: number, width: number, height: number): DOMRect {
	return {
		top,
		left,
		width,
		height,
		bottom: top + height,
		right: left + width
	} as DOMRect;
}

function element<T extends HTMLElement>(bounds: DOMRect): T {
	return { getBoundingClientRect: () => bounds } as T;
}

const initialCoords: ITooltipCoords = {
	bottom: 0,
	top: 0,
	right: 0,
	left: 0,
	widthCutoff: 0
};

describe('getTooltipPosition', () => {
	it('anchors a bottom tooltip to the bottom of its trigger', () => {
		vi.stubGlobal('window', { innerWidth: 500 });
		const trigger = element<HTMLSpanElement>(rect(10, 20, 30, 24));
		const tooltip = element<HTMLDivElement>(rect(0, 0, 100, 20));

		const result = getTooltipPosition(trigger, tooltip, { ...initialCoords }, 'bottom', 500);

		expect(result.top).toBe(34);
		expect(result.left).toBe(50);
	});
});
