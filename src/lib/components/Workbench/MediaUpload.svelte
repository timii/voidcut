<script lang="ts">
	import MediaUploadImage from '$lib/assets/workbench/media-upload.png';
	import Button from '../shared/Button.svelte';
	import UploadIcon from '$lib/assets/workbench/upload.png';
	import { handleFileUpload } from '$lib/utils/file.utils';

	let inputElementRef: HTMLInputElement;

	// handle file(s) when media is uploaded
	async function onMediaUpload(e: Event) {
		const inputTarget = e.target;
		if (inputTarget) {
			const files = (inputTarget as HTMLInputElement).files;

			if (files) {
				await handleFileUpload(files);
			}
		}
	}

	// open media upload on click
	function onButtonClick() {
		inputElementRef.click();
	}
</script>

<div class="flex flex-col items-center justify-center h-full gap-8 media-upload z-10 relative">
	<img src={MediaUploadImage} class="media-upload-image" alt="Media Upload" />
	<div class="flex flex-col w-1/2 text-center media-upload-info">
		<span>You have no media files added to this project. Upload media files to get started.</span>
		<span class="text-sm italic text-text-info"
			>(Hint: You can also just drag the files into this window)</span
		>
	</div>
	<input
		class="hidden"
		id="media-upload"
		type="file"
		multiple
		accept="image/*,video/*,audio/*"
		on:change={onMediaUpload}
		bind:this={inputElementRef}
	/>
	<Button text="Upload Media" onClickCallback={onButtonClick} icon={UploadIcon}></Button>
</div>
