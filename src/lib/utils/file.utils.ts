import { type IMedia, MediaType, type IFileMetadata } from "$lib/interfaces/Media";
import { TimelineDropArea, type ITimelineElement, type ITimelineElementBounds } from "$lib/interfaces/Timeline";
import { availableMedia, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { generateAudioWaveform } from "./ffmpeg.utils";
import { createTrackWithElement, handleOverlapping, handleElementIndeces } from "./timeline.utils";
import { generateId, convertMsToPx } from "./utils";
import { generateAudioWaveformTimelineImage } from "./waveform.utils";

// save a given array of media objects into the store 
export function saveFilesToStore(files: IMedia[]) {
    // add given array of file(s) into store
    availableMedia.update((arr) => [...arr, ...files]);
}

// handle given files when media is manually uploaded or drag and dropped
export async function handleFileUpload(files: FileList) {

    // convert FileList type to an array of files
    const filesArr = [...files];

    // add the files directly to the store but set "loaded" to false so they show up in the media pool as loading
    const mappedFiles: IMedia[] = filesArr.map(file => {
        // get the file type prefix
        const fileTypeString = file.type.split('/')[0].toUpperCase()

        // convert the string into an enum value
        const fileType = fileTypeString as MediaType

        return {
            name: file.name,
            mediaId: generateId(),
            type: fileType,
            // initially set loaded to false and update it later when preview image and metadata have been loaded
            loaded: false,
            previewImage: '',
            src: ''
        }
    })

    saveFilesToStore(mappedFiles);

    // update each media element that was just created with the loaded metadata and preview image
    for (const [i, file] of mappedFiles.entries()) {

        // get file metadata and create preview image
        const { fileMetadata, filePreviewImage } = await getFileMetadataAndPreviewImage(file.type, filesArr[i])

        // set the timeline image to be the preview image for image and video media files
        let fileTimelineElementImage = filePreviewImage

        // generate a separate image for the timeline element of the audio file  
        if (file.type === MediaType.Audio) {
            fileTimelineElementImage = await getTimelineElementImage(filesArr[i], fileMetadata.duration ?? 0)
        }

        availableMedia.update(media => {
            // find correct media element using its mediaId
            let index = media.findIndex(el => el.mediaId === file.mediaId)

            // check if an element was found
            if (index === -1) {
                console.error(`Media element with id ${file.mediaId} wasn't found in store`);
                return media;
            }

            // update element in store with file metadata, preview image and update loaded to true
            media[index] = {
                ...media[index],
                previewImage: filePreviewImage,
                timelineImage: fileTimelineElementImage,
                loaded: true,
                ...fileMetadata
            }

            return media;
        })
    }
}

// get the file metadata and create preview image from a given file and file type
async function getFileMetadataAndPreviewImage(fileType: MediaType, file: File) {
    let fileMetadata: IFileMetadata = {} as IFileMetadata
    let filePreviewImage: string = '';
    switch (fileType) {
        case MediaType.Audio:

            // get metadata for the audio file
            fileMetadata = await getFileMetadata(file, MediaType.Audio)

            // generate waveform image for the preview image
            const generatedImage = await generateAudioWaveform(file)
            if (generatedImage) {
                filePreviewImage = generatedImage
            }
            break;
        case MediaType.Image:

            // convert uploaded file into dataUrl and save it as the source of the image
            const fileAsDataUrl = await convertFileToDataUrl(file)
            fileMetadata = { src: fileAsDataUrl }

            // also create a resized version for the preview image for when dragging the media pool element
            const resizedFile = await resizeFilePreview(file)

            filePreviewImage = resizedFile

            break;
        case MediaType.Video:

            // get metadata of current file
            fileMetadata = await getFileMetadata(file, MediaType.Video)

            // create image of uploaded media to show as preview
            filePreviewImage = await getVideoPreviewImage(file)
            break;
        default:
            console.error("No fitting media type found")
    }
    return { fileMetadata, filePreviewImage }
}

// create timeline element image from a given file and duration
async function getTimelineElementImage(file: File, duration: number): Promise<string> {
    let fileTimelineElementImage: string = '';

    // calulate the starting size of the image shown in the timeline element
    const widthInPx = convertMsToPx(duration)

    // generate waveform image for the timeline element
    const generatedImage = await generateAudioWaveformTimelineImage(file, widthInPx)
    if (generatedImage) {
        fileTimelineElementImage = generatedImage
    }

    return fileTimelineElementImage
}

// handle given media when it's dropped into the timeline
export function handleTimelineMediaDrop(media: IMedia, dropArea: TimelineDropArea, rowIndex?: number, startTime?: number) {
    let maxDuration: number | undefined

    // for images we need to handle a few properties differently
    if (media.type === MediaType.Image) {
        maxDuration = undefined
    } else {
        maxDuration = media.duration || 3000
    }

    // TODO: handle cases for media thats very short (such as half a second or less or so) 

    // convert media type to timeline element type
    const timelineEl: ITimelineElement = {
        duration: media.duration ? media.duration : 3000, // starting duration will be the same as the maxDuration
        maxDuration: maxDuration,
        playbackStartTime: startTime ? startTime : 0,
        trimFromStart: 0,
        trimFromEnd: 0,
        mediaId: media.mediaId,
        mediaName: media.name,
        mediaImage: media.previewImage,
        timelineImage: media.timelineImage,
        type: media.type,
        elementId: generateId(),
        videoOptions: {}
    }

    // create an empty track with the newly created element
    const timelineTrack = createTrackWithElement(timelineEl)

    // handle the element drop differently depending on where the element was dropped (timeline, divider or track)
    switch (dropArea) {
        // element dropped on the timeline but not a track or divider
        case TimelineDropArea.TIMELINE:

            // add the newly created track to the end of the timeline track array
            timelineTracks.update(arr => [...arr, timelineTrack])

            break;

        // element dropped on a timeline divider
        case TimelineDropArea.DIVIDER:

            // check if rowIndex is undefind, if thats the case we can't add the new track at the correct position so we break out of the switch case
            if (rowIndex === undefined) {
                break;
            }

            // add the newly created track at the given index into timeline track array 
            timelineTracks.update(arr => arr.toSpliced(rowIndex, 0, timelineTrack))
            break;

        // element dropped on a timeline track
        case TimelineDropArea.TRACK:

            // check if rowIndex or startTime is undefind, if thats the case we can't add the new element at the correct position and time so we break out of the switch cases
            if (rowIndex === undefined || startTime === undefined) {
                break;
            }

            // add new timeline element into given row index
            timelineTracks.update(tracks => {

                // convert the dragged element bounds from px into ms
                const elBounds: ITimelineElementBounds = {
                    start: timelineEl.playbackStartTime,
                    end: timelineEl.playbackStartTime + timelineEl.duration
                };

                // check and handle if any elements overlap after adding the element and update the track elements if necessary
                tracks[rowIndex].elements = handleOverlapping(
                    elBounds,
                    tracks[rowIndex].elements,
                    undefined // we also set this to be undefined since the element was was just created, so it doesn't ahve a previous index
                );

                // check and handle if the element with the updated start time is still at the correct index and if not update the track elements
                tracks[rowIndex].elements = handleElementIndeces(
                    timelineEl,
                    elBounds.start,
                    tracks[rowIndex].elements,
                    tracks[rowIndex].elements.length, // we use the current length here and not length - 1 since we will add the element inside the function and then the length will be increased by one and we want the index of the last element
                    true
                );

                return tracks
            })

            break;

        default:
            // shouldn't be reachable
            console.error(`No correct drop area was provided: drop area ${dropArea} not defined`)
            break;
    }
}

// creates a preview image using a given file
function getVideoPreviewImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const video = document.createElement("video");

        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            let ctx = canvas.getContext("2d");

            // resize the canvas to be the same size as the media pool element to resize it
            canvas.width = CONSTS.mediaPoolElementWidth;
            canvas.height = CONSTS.mediaPoolElementHeight;

            if (!ctx) {
                reject()
                return;
            }

            ctx.drawImage(video, 0, 0, CONSTS.mediaPoolElementWidth, CONSTS.mediaPoolElementHeight);
            video.pause();
            URL.revokeObjectURL(video.src)
            return resolve(canvas.toDataURL('image/png'));
        };
    })
}

// get metadata from a given file 
function getFileMetadata(file: File, type: MediaType.Video | MediaType.Audio): Promise<IFileMetadata> {
    return new Promise(async (resolve, reject) => {
        // create html element to "hold" each file and only preload its metadata
        let placeholderEl: HTMLVideoElement | HTMLAudioElement
        if (type === MediaType.Video) {
            placeholderEl = document.createElement('video') as HTMLVideoElement;
        } else {
            placeholderEl = document.createElement('audio') as HTMLAudioElement
        }
        placeholderEl.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        placeholderEl.src = await convertFileToDataUrl(file)

        // add event listener to when metadata has loaded
        placeholderEl.onloadedmetadata = () => {
            const duration = placeholderEl.duration;

            // calculate the duration in milliseconds and round it to the nearest integer  
            const durationInMs = Math.round(duration * CONSTS.secondsMultiplier)

            window.URL.revokeObjectURL(placeholderEl.src);

            resolve({
                src: placeholderEl.src,
                duration: durationInMs
            });
        };

        // add event listener to when loading video throws an error
        placeholderEl.onerror = (err) => {
            reject(err)
        }
    });
}

// resizes a given file to given width and height (defaults are the dimensions of the media pool element)
export function resizeFilePreview(file: File, width = CONSTS.mediaPoolElementWidth, height = CONSTS.mediaPoolElementHeight): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!FileReader) {
            console.error('Error getting FileReader')
            reject('Error getting FileReader')
        }

        let fr = new FileReader();

        // read file content as a dataUrl
        fr.readAsDataURL(file);

        // add eventlistener to when the FileReader finished loading
        fr.onload = () => {
            const img = new Image();
            img.src = fr.result as string;

            img.onload = () => {
                // create a new canvas element where the image will be loaded into
                const canvas = document.createElement('canvas');

                // set the canvas to be the same height as the media pool element
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('Error getting canvas context')
                    reject('Error getting canvas context')

                }

                // get ratios between both height and width
                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;

                // use smaller ratio for scaling image into canvas
                const ratio = Math.min(hRatio, vRatio);

                // x and y positions to center scaled image
                const centerX = (canvas.width - img.width * ratio) / 2;
                const centerY = (canvas.height - img.height * ratio) / 2;

                // draw the image at correct image and with correct size
                ctx!.drawImage(img, 0, 0, img.width, img.height,
                    centerX, centerY, img.width * ratio, img.height * ratio);


                // return the dataUrl string of the resized image
                const resizedImage = ctx!.canvas.toDataURL();
                resolve(resizedImage as string)
            }
        };

        // add eventlistener to when the FileReader throws an error
        fr.onerror = (err) => {
            console.error("Error while converting File to DataUrl", err)
            reject(err)
        }
    })
}

// convert a given file into a data url string
export function convertFileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!FileReader) {
            console.error('Error getting FileReader')
            reject('Error getting FileReader')
        }

        let fr = new FileReader();

        // read file content as a dataUrl
        fr.readAsDataURL(file);

        // add eventlistener to when the FileReader finished loading
        fr.onload = () => {
            // return result of the reader as a dataUrl
            resolve(fr.result as string)
        };

        // add eventlistener to when the FileReader throws an error
        fr.onerror = (err) => {
            console.error("Error while converting File to DataUrl", err)
            reject(err)
        }
    })
}

// source: https://gist.github.com/borismus/1032746
// convert a base64 string into a binary UInt8Array
export function convertDataUrlToUIntArray(dataUrl: string) {
    const BASE64_MARKER = ';base64,';
    const base64Index = dataUrl.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const base64 = dataUrl.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}