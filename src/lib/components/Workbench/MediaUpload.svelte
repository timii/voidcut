<script lang="ts">
	import { handleMediaUpload, saveFilesToStore } from '$lib/utils/utils';
	import MediaUploadImage from '$lib/assets/media-upload.png';

	// handle file(s) when media is uploaded
	async function onMediaUpload(e: Event) {
		console.log('media added:', e);

		const inputTarget = e.target;
		if (inputTarget) {
			const files = (inputTarget as HTMLInputElement).files;

			if (files) {
				await handleMediaUpload(files);
			}
		}
	}
</script>

<div class="media-upload flex flex-col justify-center items-center h-full gap-8">
	<img src={MediaUploadImage} class="media-upload-image" alt="Media Upload" />
	<div class="media-upload-info flex flex-col w-1/2 text-center">
		<span>You have no media files added to this project. Upload media files to get started.</span>
		<span class="text-gray-500 text-sm italic"
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
		class="media-upload-button p-3 rounded-lg bg-[#212127] hover:bg-[#2c2c35] hover:cursor-pointer"
		>Upload Media</label
	>
</div>
