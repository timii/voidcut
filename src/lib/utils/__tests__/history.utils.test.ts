import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { createHistory, type HistoryAdapter } from '../history.utils';

function setupHistory(limit = 100) {
	let value = 0;
	const adapter: HistoryAdapter<number> = {
		capture: () => value,
		restore: (snapshot) => {
			value = snapshot;
			return true;
		},
		equals: Object.is
	};
	const history = createHistory(adapter, { limit });

	return {
		history,
		getValue: () => value,
		setValue: (nextValue: number) => {
			value = nextValue;
			return nextValue;
		}
	};
}

describe('createHistory', () => {
	it('records atomic changes and moves through undo and redo stacks', () => {
		const { history, getValue, setValue } = setupHistory();

		history.run(() => setValue(1));
		history.run(() => setValue(2));

		expect(history.undo()).toBe(true);
		expect(getValue()).toBe(1);
		expect(history.undo()).toBe(true);
		expect(getValue()).toBe(0);
		expect(history.redo()).toBe(true);
		expect(getValue()).toBe(1);
	});

	it('does not record no-op changes', () => {
		const { history, setValue } = setupHistory();

		history.run(() => setValue(0));

		expect(get(history.canUndo)).toBe(false);
		expect(history.undo()).toBe(false);
	});

	it('clears redo after a divergent change', () => {
		const { history, setValue } = setupHistory();

		history.run(() => setValue(1));
		history.run(() => setValue(2));
		history.undo();
		history.run(() => setValue(3));

		expect(get(history.canRedo)).toBe(false);
		expect(history.redo()).toBe(false);
	});

	it('groups transaction updates into one history entry', () => {
		const { history, getValue, setValue } = setupHistory();

		expect(history.begin()).toBe(true);
		history.update(() => setValue(1));
		history.update(() => setValue(2));
		expect(get(history.transactionActive)).toBe(true);
		expect(history.commit()).toBe(true);

		expect(history.undo()).toBe(true);
		expect(getValue()).toBe(0);
		expect(history.undo()).toBe(false);
	});

	it('restores the transaction start when cancelled', () => {
		const { history, getValue, setValue } = setupHistory();

		history.begin();
		history.update(() => setValue(4));

		expect(history.cancel()).toBe(true);
		expect(getValue()).toBe(0);
		expect(get(history.canUndo)).toBe(false);
	});

	it('rolls back an atomic edit that throws', () => {
		const { history, getValue, setValue } = setupHistory();

		expect(() =>
			history.run(() => {
				setValue(9);
				throw new Error('edit failed');
			})
		).toThrow('edit failed');
		expect(getValue()).toBe(0);
		expect(get(history.canUndo)).toBe(false);
	});

	it('evicts the oldest entry when the limit is exceeded', () => {
		const { history, getValue, setValue } = setupHistory(2);

		history.run(() => setValue(1));
		history.run(() => setValue(2));
		history.run(() => setValue(3));

		expect(history.undo()).toBe(true);
		expect(history.undo()).toBe(true);
		expect(history.undo()).toBe(false);
		expect(getValue()).toBe(1);
	});

	it('reset clears both stacks without changing the current value', () => {
		const { history, getValue, setValue } = setupHistory();

		history.run(() => setValue(1));
		history.undo();
		history.reset();

		expect(getValue()).toBe(0);
		expect(get(history.canUndo)).toBe(false);
		expect(get(history.canRedo)).toBe(false);
	});

	it('exposes the current typed snapshot without recording it', () => {
		const { history, setValue } = setupHistory();
		setValue(7);

		expect(history.getSnapshot()).toBe(7);
		expect(get(history.canUndo)).toBe(false);
	});
});
