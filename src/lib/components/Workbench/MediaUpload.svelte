<script lang="ts">
	import { saveFilesToStore } from '$lib/utils/utils';
	import MediaUploadImage from '$lib/assets/media-upload.png';

	// handle file(s) when media is uploaded
	async function onMediaUpload(e: Event) {
		console.log('media added:', e);

		const inputTarget = e.target;
		if (inputTarget) {
			const files = (inputTarget as HTMLInputElement).files;

			if (files) {
				const videoMetadata = await getFileMetadata(files);
				console.log('onMediaUpload -> videoMetadata:', videoMetadata);
				saveFilesToStore(files);
			}
		}
	}

	// get metadata from given FileList
	function getFileMetadata(files: FileList) {
		return new Promise((resolve, reject) => {
			// convert FileList type to an array
			let filesArr = [...files];

			// create video element to "hold" each file and only preload its metadata
			var video = document.createElement('video');
			video.preload = 'metadata';

			// console.log('getFileInfo before onleadedmetadata -> video:', video);
			video.src = URL.createObjectURL(filesArr[0]);
			// add event listener to when metadata has loaded
			video.onloadedmetadata = () => {
				window.URL.revokeObjectURL(video.src);
				var duration = video.duration;
				console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video);
				resolve(duration);
			};

			// console.log('getFileInfo after onleadedmetadata -> video:', video);
		});
	}
</script>

<div class="media-upload flex flex-col justify-center items-center h-full gap-8">
	<img src={MediaUploadImage} class="media-upload-image" alt="Media Upload" />
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
