import { describe, expect, it } from 'vitest';
import { syncMediaElementPlayback } from '../playback.utils';

function makeMediaElement() {
	let pauseCalls = 0;
	let playCalls = 0;
	const element = {
		currentTime: 5,
		pause: () => {
			pauseCalls += 1;
		},
		play: () => {
			playCalls += 1;
			return Promise.resolve();
		}
	};

	return {
		element,
		getPauseCalls: () => pauseCalls,
		getPlayCalls: () => playCalls
	};
}

describe('syncMediaElementPlayback', () => {
	it('pauses media even when the new playhead position is outside its bounds', () => {
		const media = makeMediaElement();

		syncMediaElementPlayback(media.element, false, -2, false);

		expect(media.getPauseCalls()).toBe(1);
		expect(media.getPlayCalls()).toBe(0);
	});

	it('seeks and plays active media when playback starts', () => {
		const media = makeMediaElement();

		syncMediaElementPlayback(media.element, true, 1.5, true);

		expect(media.element.currentTime).toBe(1.5);
		expect(media.getPauseCalls()).toBe(0);
		expect(media.getPlayCalls()).toBe(1);
	});
});
