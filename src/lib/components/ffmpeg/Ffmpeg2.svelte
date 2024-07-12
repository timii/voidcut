<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { onMount } from 'svelte';

	type State = 'loading' | 'loaded' | 'convert.start' | 'convert.error' | 'convert.done';

	let state: State = 'loading';
	let error = '';
	let ffmpeg: FFmpeg;
	let progress = tweened(0);
	let files: File[] = [];
	async function loadFFmpeg() {
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

		ffmpeg = new FFmpeg();

		ffmpeg.on('log', ({ message }) => {
			console.log(message);
		});

		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`
		});

		state = 'loaded';
	}

	async function callFFmpeg() {
		state = 'convert.start';
		console.log('callFFmpeg -> files:', files);
		// const videoData = await fetchFile(
		// 	'https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi'
		// );
		const videoData: Uint8Array[] = await Promise.all(
			files.map(async (file) => {
				const data = await fetchFile(file);
				console.log('in map -> data', data);
				return data;
			})
		);
		console.log('videoData:', videoData);

		// let i = 1;
		// for (const data of videoData) {
		// 	await ffmpeg.writeFile(`test${i}.avi`, data);
		// 	console.log('in for of -> data', data, 'i:', i);
		// 	i++;
		// }

		await ffmpeg.writeFile('test1.mp4', videoData[0]);
		await ffmpeg.writeFile('test2.mp4', videoData[1]);
		await ffmpeg.exec([
			'-i',
			'test1.mp4',
			'-i',
			'test2.mp4',
			'-filter_complex',
			'concat=n=2:v=1:a=0',
			'-vn',
			'-y',
			'-vsync',
			'vfr',
			'input.m4a'
		]);
		const data = await ffmpeg.readFile('input.m4a');
		console.log('convert done');
		state = 'convert.done';
		return data as Uint8Array;
	}

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
