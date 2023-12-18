<script lang="ts">
	import { saveFilesToStore } from '$lib/utils/utils';

	function onMediaUpload(e: Event) {
		console.log('media added:', e);

		const inputTarget = e.target;
		if (inputTarget) {
			const files = (inputTarget as HTMLInputElement).files;

			if (files) {
				saveFilesToStore(files);
			}
		}
	}
</script>

<div class="media-upload flex flex-col justify-center items-center h-full gap-8">
	<span class="media-upload-image">image placeholder</span>
	<img src="$lib/assets/media-upload.png" alt="Media Upload" />
	<div class="media-upload-info flex flex-col w-1/3 text-center">
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
