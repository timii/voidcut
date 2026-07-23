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
	let transaction: { start: TSnapshot } | null = null;
	let restoring = false;
	const canUndoWritable = writable(false);
	const canRedoWritable = writable(false);
	const transactionActiveWritable = writable(false);

	function refreshAvailability() {
		// active edits must settle before history can move to another snapshot
		canUndoWritable.set(!transaction && past.length > 0);
		canRedoWritable.set(!transaction && future.length > 0);
		transactionActiveWritable.set(transaction !== null);
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

	function restoreSnapshot(snapshot: TSnapshot) {
		// reactive work triggered by restoration must not create nested history entries
		restoring = true;
		try {
			return adapter.restore(snapshot);
		} finally {
			restoring = false;
		}
	}

	function run<TResult>(change: () => TResult): TResult {
		if (restoring) {
			return change();
		}
		if (transaction) {
			throw new Error('Cannot run an atomic history edit during a transaction');
		}

		const before = adapter.capture();
		try {
			const result = change();
			record(before, adapter.capture());
			return result;
		} catch (error) {
			// failed edits restore their exact starting snapshot and never enter history
			restoreSnapshot(before);
			refreshAvailability();
			throw error;
		}
	}

	function begin() {
		if (restoring || transaction) {
			return false;
		}

		// wrap the snapshot so undefined remains a valid generic snapshot value
		transaction = { start: adapter.capture() };
		refreshAvailability();
		return true;
	}

	function update<TResult>(change: () => TResult): TResult {
		if (restoring) {
			return change();
		}
		if (!transaction) {
			throw new Error('Cannot update history without an active transaction');
		}

		const { start } = transaction;
		try {
			return change();
		} catch (error) {
			// gesture failures roll back the entire gesture instead of a partial update
			restoreSnapshot(start);
			transaction = null;
			refreshAvailability();
			throw error;
		}
	}

	function commit() {
		if (restoring || !transaction) {
			return false;
		}

		const before = transaction.start;
		transaction = null;
		return record(before, adapter.capture());
	}

	function cancel() {
		if (restoring || !transaction) {
			return false;
		}

		restoreSnapshot(transaction.start);
		transaction = null;
		refreshAvailability();
		return true;
	}

	function undo() {
		if (restoring || transaction || past.length === 0) {
			return false;
		}

		const current = adapter.capture();
		const previous = past[past.length - 1];
		// update stacks only after restore succeeds so a failing adapter cannot corrupt history
		restoreSnapshot(previous);
		past = past.slice(0, -1);
		future.push(current);
		refreshAvailability();
		return true;
	}

	function redo() {
		if (restoring || transaction || future.length === 0) {
			return false;
		}

		const current = adapter.capture();
		const next = future[future.length - 1];
		restoreSnapshot(next);
		future = future.slice(0, -1);
		past.push(current);
		refreshAvailability();
		return true;
	}

	function reset() {
		if (restoring) {
			return false;
		}
		// resets establish the current external state as a fresh session baseline
		past = [];
		future = [];
		transaction = null;
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
