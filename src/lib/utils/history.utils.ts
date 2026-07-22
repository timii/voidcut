import { readonly, writable, type Readable } from 'svelte/store';

export interface HistoryAdapter<TSnapshot> {
	capture: () => TSnapshot;
	restore: (snapshot: TSnapshot) => unknown;
	equals: (left: TSnapshot, right: TSnapshot) => boolean;
}

export interface HistoryOptions {
	limit?: number;
}

export interface HistoryController<TSnapshot> {
	canUndo: Readable<boolean>;
	canRedo: Readable<boolean>;
	transactionActive: Readable<boolean>;
	getSnapshot: () => TSnapshot;
	run: <TResult>(change: () => TResult) => TResult;
	begin: () => boolean;
	update: <TResult>(change: () => TResult) => TResult;
	commit: () => boolean;
	cancel: () => boolean;
	undo: () => boolean;
	redo: () => boolean;
	reset: () => boolean;
}

const DEFAULT_HISTORY_LIMIT = 100;

export function createHistory<TSnapshot>(
	adapter: HistoryAdapter<TSnapshot>,
	options: HistoryOptions = {}
): HistoryController<TSnapshot> {
	const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('History limit must be a positive integer');
	}

	let past: TSnapshot[] = [];
	let future: TSnapshot[] = [];
	let active = false;
	let transactionStart: TSnapshot | undefined;
	const canUndoWritable = writable(false);
	const canRedoWritable = writable(false);
	const transactionActiveWritable = writable(false);

	function refreshAvailability() {
		// active edits must settle before history can move to another snapshot
		canUndoWritable.set(!active && past.length > 0);
		canRedoWritable.set(!active && future.length > 0);
		transactionActiveWritable.set(active);
		return true;
	}

	function record(before: TSnapshot, after: TSnapshot) {
		if (adapter.equals(before, after)) {
			refreshAvailability();
			return false;
		}

		past.push(before);
		if (past.length > limit) {
			past = past.slice(-limit);
		}
		// a new branch makes every previously redoable snapshot invalid
		future = [];
		refreshAvailability();
		return true;
	}

	function run<TResult>(change: () => TResult): TResult {
		if (active) {
			throw new Error('Cannot run an atomic history edit during a transaction');
		}

		const before = adapter.capture();
		try {
			const result = change();
			record(before, adapter.capture());
			return result;
		} catch (error) {
			// failed edits restore their exact starting snapshot and never enter history
			adapter.restore(before);
			refreshAvailability();
			throw error;
		}
	}

	function begin() {
		if (active) {
			return false;
		}

		transactionStart = adapter.capture();
		active = true;
		refreshAvailability();
		return true;
	}

	function update<TResult>(change: () => TResult): TResult {
		if (!active || transactionStart === undefined) {
			throw new Error('Cannot update history without an active transaction');
		}

		try {
			return change();
		} catch (error) {
			// gesture failures roll back the entire gesture instead of a partial update
			adapter.restore(transactionStart);
			transactionStart = undefined;
			active = false;
			refreshAvailability();
			throw error;
		}
	}

	function commit() {
		if (!active || transactionStart === undefined) {
			return false;
		}

		const before = transactionStart;
		transactionStart = undefined;
		active = false;
		return record(before, adapter.capture());
	}

	function cancel() {
		if (!active || transactionStart === undefined) {
			return false;
		}

		adapter.restore(transactionStart);
		transactionStart = undefined;
		active = false;
		refreshAvailability();
		return true;
	}

	function undo() {
		if (active || past.length === 0) {
			return false;
		}

		const current = adapter.capture();
		const previous = past[past.length - 1];
		// update stacks only after restore succeeds so a failing adapter cannot corrupt history
		adapter.restore(previous);
		past = past.slice(0, -1);
		future.push(current);
		refreshAvailability();
		return true;
	}

	function redo() {
		if (active || future.length === 0) {
			return false;
		}

		const current = adapter.capture();
		const next = future[future.length - 1];
		adapter.restore(next);
		future = future.slice(0, -1);
		past.push(current);
		refreshAvailability();
		return true;
	}

	function reset() {
		// resets establish the current external state as a fresh session baseline
		past = [];
		future = [];
		active = false;
		transactionStart = undefined;
		refreshAvailability();
		return true;
	}

	return {
		canUndo: readonly(canUndoWritable),
		canRedo: readonly(canRedoWritable),
		transactionActive: readonly(transactionActiveWritable),
		getSnapshot: adapter.capture,
		run,
		begin,
		update,
		commit,
		cancel,
		undo,
		redo,
		reset
	};
}
