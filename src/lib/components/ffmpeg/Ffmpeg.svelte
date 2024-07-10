<script lang="ts">
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	// @ts-ignore
	import type { LogEvent } from '@ffmpeg/ffmpeg/dist/esm/types';

	let videoEl: HTMLVideoElement;
	const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
	const videoURL = 'https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi';
	let message = 'Click Start to Transcode';

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

	async function transcode() {
		const ffmpeg = new FFmpeg();
		message = 'Loading ffmpeg-core.js';
		ffmpeg.on('log', ({ message: msg }: LogEvent) => {
			message = msg;
			console.log(message);
		});
		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`,
			workerURL: `${baseURL}/ffmpeg-core.worker.js`
		});
		message = 'Start transcoding';
		await ffmpeg.writeFile('test.avi', await fetchFile(videoURL));
		await ffmpeg.exec(['-i', 'test.avi', 'test.mp4']);
		message = 'Complete transcoding';
		const data = await ffmpeg.readFile('test.mp4');
		console.log('done');
		videoEl.src = URL.createObjectURL(
			new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' })
		);
	}
</script>

<div>
	<!-- svelte-ignore a11y-media-has-caption -->
	<video bind:this={videoEl} controls />
	<br />
	<button on:click={transcode}>Start</button>
	<p>{message}</p>
</div>
