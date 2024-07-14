<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { onMount } from 'svelte';
	import { availableMedia, timelineTracks } from '../../../stores/store';
	import { convertDataUrlToUIntArray } from '$lib/utils/utils';

	type State = 'loading' | 'loaded' | 'convert.start' | 'convert.error' | 'convert.done';

	let state: State = 'loading';
	let error = '';
	let ffmpeg: FFmpeg;
	let progress = tweened(0);
	let files: File[] = [];

	const readFromBlobOrFile = (blob: Blob | File): Promise<Uint8Array> =>
		new Promise((resolve, reject) => {
			const fileReader = new FileReader();
			fileReader.onload = () => {
				const { result } = fileReader;
				if (result instanceof ArrayBuffer) {
					resolve(new Uint8Array(result));
				} else {
					resolve(new Uint8Array());
				}
			};
			fileReader.onerror = (event) => {
				reject(Error(`File could not be read! Code=${event?.target?.error?.code || -1}`));
			};
			fileReader.readAsArrayBuffer(blob);
		});

	async function fetchFile(file?: string | File | Blob): Promise<Uint8Array> {
		let data: ArrayBuffer | number[];

		if (typeof file === 'string') {
			/* From base64 format */
			if (/data:_data\/([a-zA-Z]*);base64,([^"]*)/.test(file)) {
				data = atob(file.split(',')[1])
					.split('')
					.map((c) => c.charCodeAt(0));
				/* From remote server/URL */
			} else {
				data = await (await fetch(file)).arrayBuffer();
			}
		} else if (file instanceof URL) {
			data = await (await fetch(file)).arrayBuffer();
		} else if (file instanceof File || file instanceof Blob) {
			data = await readFromBlobOrFile(file);
		} else {
			return new Uint8Array();
		}

		return new Uint8Array(data);
	}

	// initialize FFmpeg, setup logging and load necessary packages
	async function loadFFmpeg() {
		// create a new ffmpeg instance
		ffmpeg = new FFmpeg();

		// listen to log events and print them into the console
		ffmpeg.on('log', ({ type, message }) => {
			console.log('[LOG] type:', type, 'message:', message);
		});

		// listen to progress events and print them into the console
		ffmpeg.on('progress', ({ progress, time }) => {
			console.log('[PROGRESS] progress:', progress * 100, 'time:', time / 1000000);
		});

		// load ffmpeg-core inside web worker
		// it is required to call this method first as it initializes WebAssembly and other essential variables
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`
		});

		state = 'loaded';
	}

	async function callFFmpeg() {
		state = 'convert.start';
		// console.log('callFFmpeg -> files:', files);
		const timelineElements = $timelineTracks[0].elements;
		const mediaElements = timelineElements.map((el) => {
			return $availableMedia.find((media) => media.mediaId === el.mediaId);
		});
		const mediaUrls = mediaElements.map((el) => el?.src);
		const videoData = mediaUrls.map((el) => convertDataUrlToUIntArray(el as string));
		console.log(
			'callFFmpeg -> tracks:',
			$timelineTracks,
			'media:',
			$availableMedia,
			'mediaElements:',
			mediaElements,
			'mediaUrls:',
			mediaUrls
		);
		// const videoData = await fetchFile(
		// 	'https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi'
		// );
		// const videoData: Uint8Array[] = await Promise.all(
		// 	files.map(async (file) => {
		// 		const data = await fetchFile(file);
		// 		console.log('in map -> data', data);
		// 		return data;
		// 	})
		// );
		console.log('videoData:', videoData);

		const inputFileNames: string[] = [];

		for (const [i, data] of videoData.entries()) {
			const fileName = `test${i + 1}.mp4`;
			await ffmpeg.writeFile(fileName, data);
			inputFileNames.push('-i', fileName);
			console.log('in for of -> data', data, 'i:', i + 1, 'filename:', fileName);
		}

		console.log('inputFileNames:', inputFileNames);

		const outputFileName = 'input.mp4';

		await ffmpeg.exec([
			// '-i',
			// 'test1.mp4',
			// '-i',
			// 'test2.mp4',
			...inputFileNames,
			'-filter_complex',
			`concat=n=${videoData.length}:v=1:a=1`,
			'-y',
			'-fps_mode',
			'vfr',
			outputFileName
		]);
		const data = await ffmpeg.readFile(outputFileName);
		console.log('convert done');
		state = 'convert.done';
		return data as Uint8Array;
	}

	// download the ouput from FFmpeg
	function downloadVideo(data: Uint8Array) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
		a.download = 'test.mp4';

		setTimeout(() => {
			a.click();
		}, 1000);
	}

	async function handleClick() {
		console.log('handleClick');
		const ret = await callFFmpeg();
		downloadVideo(ret);
	}

	onMount(() => {
		// setup everything for FFmpeg in the background on load
		loadFFmpeg();
	});

	function handleDrop(e: DragEvent) {
		// only handle files when actually dropped
		if (e.dataTransfer?.files && e.dataTransfer?.files.length > 0 && e.type !== 'dragleave') {
			console.log(
				'media dropped in if:',
				e,
				'dataTransfer:',
				e.dataTransfer,
				'files:',
				e.dataTransfer?.files
			);

			const temp = [...e.dataTransfer?.files];
			files.push(...temp);

			console.log('files:', files);
		}
	}

	$: console.log('ffmpeg state:', state);
</script>

<div>
	<h1>Converter</h1>
	<div
		on:drop|preventDefault={handleDrop}
		on:dragover|preventDefault={() => {}}
		data-state={state}
		class="w-10 h-10 border border-red-500"
	></div>
	<button on:click={handleClick}>convert</button>
</div>
