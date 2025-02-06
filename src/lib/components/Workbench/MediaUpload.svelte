<script lang="ts">
	import { handleFileUpload, saveFilesToStore } from '$lib/utils/utils';
	import MediaUploadImage from '$lib/assets/workbench/media-upload.png';

	// handle file(s) when media is uploaded
	async function onMediaUpload(e: Event) {
		console.log('media added:', e);

		const inputTarget = e.target;
		if (inputTarget) {
			const files = (inputTarget as HTMLInputElement).files;

			if (files) {
				await handleFileUpload(files);
			}
		}
	}
</script>

<div class="flex flex-col items-center justify-center h-full gap-8 media-upload">
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
	/>
	<label
		for="media-upload"
		class="media-upload-button p-3 rounded-lg bg-button-background hover:bg-button-background-hover hover:cursor-pointer"
		>Upload Media</label
	>
</div>
