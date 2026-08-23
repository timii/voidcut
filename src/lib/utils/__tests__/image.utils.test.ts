import { describe, expect, it, vi } from 'vitest';
import { preloadImages } from '../image.utils';

describe('preloadImages', () => {
	it('starts loading every image immediately', () => {
		const loadedSources: string[] = [];
		const createImage = vi.fn(() => ({
			set src(source: string) {
				loadedSources.push(source);
			}
		}));

		preloadImages(['play.png', 'pause.png'], createImage);

		expect(createImage).toHaveBeenCalledTimes(2);
		expect(loadedSources).toEqual(['play.png', 'pause.png']);
	});
});
