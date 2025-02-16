import { MediaType, type IMedia, type IFileMetadata } from "$lib/interfaces/Media";
import {
    TimelineDropArea,
    TimelineElementResizeSide,
    type ITimelineElement,
    type ITimelineElementBounds,
    type ITimelineTrack,
    type ITimelineElementIndeces
} from "$lib/interfaces/Timeline";
import {
    availableMedia,
    isTimelineElementBeingDragged,
    isThumbBeingDragged,
    timelineTracks,
    currentPlaybackTime,
    currentTimelineScale,
    currentThumbPosition,
    horizontalScroll,
    selectedElement,
    draggedElement,
    previewPlaying,
    isTimelineElementBeingResized,
    elementResizeData,
    maxPlaybackTime,
    maxTimelineScale,
    minTimelineScale,
    possibleScaleValues,
    draggedOverFirstDivider,
    draggedUnderLastDivider,
    previewAspectRatio,
} from "../../stores/store";
import { CONSTS } from "./consts";
import { adjustingInterval } from "./betterInterval";
import { get } from "svelte/store";
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../../../tailwind.config.js'
import { generateAudioWaveform } from "./ffmpeg.utils";
import { type IPlayerElement } from "$lib/interfaces/Player";
import type { Time } from "$lib/interfaces/Time";

let interval: {
    start: () => void;
    stop: () => void;
}
let timelineScrollContainer: Element | null

// #region save file in store
// save a given array of media objects into the store 
export function saveFilesToStore(files: IMedia[]) {
    // add given array of file(s) into store
    availableMedia.update((arr) => [...arr, ...files]);

    console.log('saveFilesToStore -> files', files);
    // availableMedia.subscribe(value => console.log("saveFilesToStore -> availableMedia:", value))
}

// #region file upload
// handle given files when media is manually uploaded or drag and dropped
export async function handleFileUpload(files: FileList) {

    // convert FileList type to an array of files
    const filesArr = [...files];

    // add metadata to each file
    const mediaArr: IMedia[] = await Promise.all(filesArr.map(async (file) => {
        console.log("utils -> in filesArr map file type:", file, file.type)

        // get the file type prefix
        const fileTypeString = file.type.split('/')[0].toUpperCase()

        // convert the string into an enum value
        // const fileType: MediaType = MediaType[fileTypeString as keyof typeof MediaType]
        const fileType = fileTypeString as MediaType
        console.log("utils -> in filesArr map file type after convert:", fileType, fileTypeString)

        let fileMetadata: IFileMetadata = {} as IFileMetadata
        let filePreviewImage: string = '';
        switch (fileType) {
            case MediaType.Audio:

                // get metadata for the audio file
                fileMetadata = await getFileMetadata(file, MediaType.Audio)

                // generate wave form image for the preview image
                const generatedImage = await generateAudioWaveform(file)
                if (generatedImage) {
                    filePreviewImage = generatedImage
                }
                break;
            case MediaType.Image:

                // convert uploaded file into dataUrl and save it as the source of the image
                const fileAsDataUrl = await convertFileToDataUrl(file)
                fileMetadata = { src: fileAsDataUrl }

                // also create a resized version for the preview image when dragging the media pool element
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



        console.log("utils -> in filesArr map file:", file, "previewImage:", filePreviewImage, "metadata:", fileMetadata)
        return {
            name: file.name,
            mediaId: generateId(),
            type: fileType,
            // TODO: implement loading so that the element gets directly added into store but with loaded false only and then we update it here so we can show a loading media element in the media pool already
            loaded: true,
            previewImage: filePreviewImage,
            ...fileMetadata
        }
    }))

    console.log('handleFileUpload -> mediaArr after map:', mediaArr);
    saveFilesToStore(mediaArr);
}

// handle given media when it's dropped into the timeline
export function handleTimelineMediaDrop(media: IMedia, dropArea: TimelineDropArea, rowIndex?: number, startTime?: number) {
    console.log("timeline -> handleTimelineMediaDrop -> rowIndex:", rowIndex, "startTime:", startTime)

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

//#endregion

// #region file helpers
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

// resizes a given file to be the same size as a media pool element
export function resizeFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!FileReader) {
            console.error('Error getting FileReader')
            reject('Error getting FileReader')
        }

        let fr = new FileReader();

        // read file content as a dataUrl
        fr.readAsDataURL(file);

        // add eventlistener to when the FileReader finished loading
        fr.onload = (event) => {
            // resize created preview image to be the same size as the media pool element by loading a temporary image into the canvas and resizing the canvas
            const img = new Image();
            // img.src = event.target?.result?.toString()!;
            img.src = fr.result as string;

            img.onload = () => {
                const elem = document.createElement('canvas');

                // set the canvas to be the same height as the media pool element
                elem.width = CONSTS.mediaPoolElementWidth;
                elem.height = CONSTS.mediaPoolElementHeight;

                const ctx = elem.getContext('2d');
                if (!ctx) {
                    console.error('Error getting canvas context')
                    reject('Error getting canvas context')

                }

                ctx!.drawImage(img, 0, 0, CONSTS.mediaPoolElementWidth, CONSTS.mediaPoolElementHeight);

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

//#endregion


// #region playback
// remove interval that handles the current playback time
export function pausePlayback() {
    console.log("pausePlayback")
    previewPlaying.set(false)
    interval.stop()
    // playbackIntervalId.update((id) => {
    //     // use current interval id to clear the interval
    //     clearInterval(id)
    //     // test.cancel()
    //     interval.stop()
    //     // set the store value back to zero
    //     return 0;
    // })
}

// create interval that increases current playback time
export function resumePlayback() {
    previewPlaying.set(true)
    // const startTime = new Date().valueOf();
    // TODO: remove old testing stuff
    const startTime = new Date().getTime();;
    // console.time('Execution time');
    // currentPlaybackTime.subscribe(el => console.log("playback interval -> currentPlaybackTime:", el))

    // TODO: only update current playback time if current playback time is less or equal to max playback time
    const intervallCallback = () => {
        // var diff = new Date().getTime() - startTime;
        // var drift = diff % 1000;

        const previousValue = get(currentPlaybackTime)
        const nextValue = previousValue + CONSTS.playbackIntervalTimer

        // pause playback if its after the max playback time
        if (nextValue > get(maxPlaybackTime)) {
            pausePlayback()
        } else {
            // increase the current playback time in store by timeout amount
            currentPlaybackTime.update(value => value + CONSTS.playbackIntervalTimer)
        }

        // console.log("interval drift:", (new Date().valueOf() - startTime) % 1000);
        // console.log("interval drift:", drift, "%");
        // console.timeEnd('Execution time');
        // console.time('Execution time');
        // console.log("interval drift:", (new Date().getTime() - startTime) % 1000);
    }

    const doError = () => {
        console.warn('The drift exceeded the interval.');
    };

    // ticker = AdjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);
    interval = adjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);
    interval.start()

    // const intervalId = setInterval(intervallCallback, CONSTS.playbackIntervalTimer)
    // test = accurateInterval(() => intervallCallback, CONSTS.playbackIntervalTimer)

    // write the interval id into store
    // playbackIntervalId.set(intervalId)
}

// check if the current playback time is inside given element bounds  
export function isPlaybackInElement(el: IPlayerElement): boolean {
    // calculate element bounds using the playback start time and the duration
    const elBounds: ITimelineElementBounds = { start: el.playbackStartTime, end: el.playbackStartTime + el.duration }

    const playbackTime = get(currentPlaybackTime)

    // return if the current playback time is between the start and end time of the element 
    return playbackTime >= elBounds.start && playbackTime < elBounds.end
}

// get the current element time for a given media element 
export function getCurrentMediaTime(el: IPlayerElement): number {
    // get the start time of the element considering the playback start time and the left trim
    const elStartTime = el.playbackStartTime - el.trimFromStart;

    // calculate the time where from where the media element should be played
    return (get(currentPlaybackTime) - elStartTime) / CONSTS.secondsMultiplier;
}

//#endregion

// #region general utils
// convert a given pixel value into a milliseconds value using the current timeline scale
export function convertPxToMs(value: number) {
    return Math.round((value / get(currentTimelineScale)) * CONSTS.secondsMultiplier) || 0
}

// convert a given milliseconds value into a pixel value using the current timeline scale
export function convertMsToPx(value: number) {
    return Math.round((value / CONSTS.secondsMultiplier) * get(currentTimelineScale))
}


// generate a unique id
export function generateId() {
    return crypto.randomUUID() as string
}

// set all "beingDragged" values in store to false 
export function resetAllBeingDragged() {
    isThumbBeingDragged.set(false)
    isTimelineElementBeingDragged.set(false)
    isTimelineElementBeingResized.set(false)
    draggedElement.set(null)
}

// reset all over/under dividers helper store values
export function resetOverUnderDividers() {
    if (get(draggedOverFirstDivider)) {
        draggedOverFirstDivider.set(false)
    }

    if (get(draggedUnderLastDivider)) {
        draggedUnderLastDivider.set(false)
    }
}

// get all tailwind variables to use in components
export function getTailwindVariables() {
    return resolveConfig(tailwindConfig)
}

// get relative mouse coordinates to the given element DOMRect
export function getRelativeMousePosition(e: MouseEvent, el: DOMRect) {
    return {
        x: e.clientX - el.left,
        y: e.clientY - el.top
    };
}

// check if only the primary button is clicked for a given MouseEvent
export function onlyPrimaryButtonClicked(e: MouseEvent) { return e.buttons === 1 }

// check if a given element is of type image
export function elementIsAnImage(el: ITimelineElement | IMedia) {
    return el.type === MediaType.Image
}

// check if dragged element is a media pool element
export function isDraggedElementFromMediaPool(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) {
        return false
    }

    // if the dataTransfer object contains an item with the media pool transfer key we know the dragged element is a media pool element
    return dataTransfer.getData(CONSTS.mediaPoolTransferKey) === '' ? false : true
}

// check if dragged element is a media pool element
export function isDraggedElementAFile(list: DataTransferItemList | undefined): boolean {
    if (!list || list.length === 0) {
        return false
    }

    // if the data transfer items list contains an item with the kind "file" we know the dragged element is a file
    let containsFile = false
    for (const item of list) {
        if (item.kind === 'file') {
            containsFile = true;
            break;
        }
    }

    return containsFile
}

// checks if a given bounding rect has only 0s as values
export function allBoundingRectValuesZero(element: Element): boolean {
    const boundingRect = element.getBoundingClientRect()
    const values = Object.values(boundingRect)
    return values.every(value => !value || value === 0)
}

// check if a given width and height have the same ratio as the aspect ratio defined in the store
export function isSameAspectRatio(width: number, height: number): boolean {
    // get aspect ratio from store as a string
    const aspectRatioString = get(previewAspectRatio)
    // convert string to array of 2 numbers for the aspect ratio (first element: width, second: height)
    const aspectRatios = aspectRatioString.split('/')
    // calculate the ratio between both values
    const storeRatio = +(+aspectRatios[0] / +aspectRatios[1]).toFixed(2)

    // calculate ratio between given width and height (only include first two digits after dot)
    const givenRatio = +(width / height).toFixed(2)

    return storeRatio === givenRatio
}

//#endregion

// #region scrolling utils
// calculate if a given html element has a horizontal scrollbar
export function hasHorizontalScrollbar(el: HTMLElement) {
    return el.scrollWidth > el.clientWidth;
}

// calculate if a given html element has a vertical scrollbar
export function hasVerticalScrollbar(el: HTMLElement) {
    return el.scrollHeight > el.clientHeight;
}

// check if a given element is fully scrolled
export function isElementFullyScrolled(el: HTMLElement): boolean {
    return el.scrollWidth - el.scrollLeft === el.clientWidth
}

//#endregion

// #region time formatters
// for a given time in ms, calculate and return hours, minutes, seconds and milliseconds
export function getTimes(time: number): Time {
    const milliseconds = Math.floor((time % 1000) / 10)
    const seconds = Math.floor((time / 1000) % 60)
    const minutes = Math.floor((time / (1000 * 60)) % 60)
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    return {
        hours,
        minutes,
        seconds,
        milliseconds
    }
}

// format a given time (in ms) to a string in the format HH:MM:SS.ms
export function formatPlaybackTime(time: number) {
    const { hours, minutes, seconds, milliseconds } = getTimes(time)

    const hoursString = (hours < 10) ? "0" + hours : hours;
    const minutesString = (minutes < 10) ? "0" + minutes : minutes;
    const secondsString = (seconds < 10) ? "0" + seconds : seconds;
    const millisecondsString = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

    // if its less than an hour don't show the hours
    if (hours === 0) {
        return minutesString + ":" + secondsString + "." + millisecondsString
    }
    return hoursString + ":" + minutesString + ":" + secondsString + "." + millisecondsString;
}

// format a given time (in ms) to a string in the format HH:MM:SS
export function formatTime(value: number, showLeadingZero = true) {
    const { hours, minutes, seconds, milliseconds } = getTimes(value)

    const s = seconds < 10 ? '0' + seconds : seconds;
    const m = minutes < 10 && showLeadingZero ? '0' + minutes : minutes;
    const h = hours < 10 && showLeadingZero ? '0' + hours : hours;

    // if its less than an hour don't show the hours
    if (hours === 0) {
        return m + ':' + s;
    }
    return h + ':' + m + ':' + s;
}

// convert a given value in milliseconds to seconds
export function msToS(value: number) {
    return value / CONSTS.secondsMultiplier
}

// convert a given value in seconds to milliseconds
export function sToMS(value: number) {
    return value * CONSTS.secondsMultiplier
}
//#endregion

// #region resizing utils
// checks whether to resize on the left or right side of the element  
export function handleElementResizing(e: MouseEvent) {
    // avoid the thumb being also moved to where the handle is
    e.stopPropagation();
    e.stopImmediatePropagation();

    // if another element or thumg being dragged don't resize
    if (get(isTimelineElementBeingDragged) || get(isThumbBeingDragged)) {
        return;
    }

    // don't resize if not only primary button is clicked
    if (!onlyPrimaryButtonClicked(e)) {
        return;
    }

    const elResizeData = get(elementResizeData)

    // if no resize side is given we can't decide what side to handle
    if (!elResizeData) {
        return
    }

    const eventDetail = { detail: { event: e, elementId: elResizeData.timelineElementId } }

    // handle left side resizing
    if (elResizeData.side === TimelineElementResizeSide.LEFT) {
        // create and dispatch custom event with the mouse event in the detail. The TimelineRowElement component listens to the event and handles the resizing
        const event = new CustomEvent(CONSTS.customEventNameElementResizeLeft, eventDetail);
        window.dispatchEvent(event);
    }

    // handle right side resizing
    if (elResizeData.side === TimelineElementResizeSide.RIGHT) {
        // create and dispatch custom event with the mouse event in the detail. The TimelineRowElement component listens to the event and handles the resizing
        const event = new CustomEvent(CONSTS.customEventNameElementResizeRight, eventDetail);
        window.dispatchEvent(event);

    }
}

// check if given element id matches resized element id
export function isCurrentElementBeingResized(el: ITimelineElement): boolean {
    const elResizeData = get(elementResizeData)

    // if no resize data is given there is no element being resized right now so we return false
    if (!elResizeData) {
        return false
    }

    // return if the id in the store matches the given id
    return elResizeData.timelineElementId === el.elementId
}
//#endregion

// #region timeline utils
// move the timeline thumb using a given mouse event
export function moveTimelineThumb(e: MouseEvent, keepSelectedElement = false) {
    e.preventDefault();

    // check if the original click is over a timeline element
    const clickOriginOverElement = (e.target as HTMLElement).classList.contains('timeline-row-element') || (e.target as HTMLElement).classList.contains('timeline-row-element-handle')

    const originNotOverElOrThumbAlreadyMoving = !clickOriginOverElement || get(isThumbBeingDragged)

    // only move thumb if only the primary button is clicked, nothing else is being dragged/resized and the click origin is not over an element
    const moveThumb = onlyPrimaryButtonClicked(e) && !get(isTimelineElementBeingDragged) && !get(isTimelineElementBeingResized) && originNotOverElOrThumbAlreadyMoving

    // check if we should move the thumb or if something else is already being dragged/resized/etc.
    if (!moveThumb) {
        return
    }

    // if an element is selected reset it if the thumb is moved and we don't want to keep the selected element
    if (isAnElementSelected() && !keepSelectedElement) {
        selectedElement.set({ elementId: '', mediaType: undefined })
    }

    const thumbBoundingRect = document.getElementById('timeline-thumb')?.getBoundingClientRect()
    if (!thumbBoundingRect) {
        return
    }

    if (!timelineScrollContainer) {
        timelineScrollContainer = document.getElementById('timeline-scroll-container')
    }

    const hs = get(horizontalScroll)

    // calculate new position using the mouse position on the x axis and subtracting the left offset from it
    const newPos = e.clientX - CONSTS.timelineRowOffset;

    // convert the new position into ms, but include the horizontal scroll (in ms)
    const playbackTime = convertPxToMs(newPos + hs);

    console.log("moveThumb -> e:", e);
    console.log("moveThumb -> newPos:", newPos, "offset:", CONSTS.timelineRowOffset, "horizontalScroll:", hs, "playbackTime:", playbackTime)

    // avoid the thumb to be moved further left than the tracks and further to the right than the max playback time 
    if ((newPos < 0 && hs <= CONSTS.timelineRowOffset) || playbackTime > get(maxPlaybackTime)) {
        return
    }

    currentPlaybackTime.set(playbackTime);
    currentThumbPosition.set(newPos);

    if (!get(isThumbBeingDragged)) {
        // console.log('isThumbBeingDragged?:', JSON.parse(JSON.stringify(get(isThumbBeingDragged))));
        isThumbBeingDragged.set(true);
    }
}

// get index of selected timeline element that matches in all tracks
// if no element selected or no element found return undefined 
export function getIndexOfSelectedElementInTracks(): ITimelineElementIndeces | undefined {
    const tracks = get(timelineTracks)
    const selectedElementId = get(selectedElement).elementId

    // if there is no element selected return undefined
    if (!selectedElementId) {
        return;
    }

    for (let rowIndex = 0; rowIndex < tracks.length; rowIndex++) {
        // search for and get the index of the element inside current track
        let elementIndex = tracks[rowIndex].elements.findIndex(el => el.elementId === selectedElementId);

        // if an element has been found in the current track we return both the row and element index
        if (elementIndex > -1) {
            return { rowIndex, elementIndex };
        }
    }

    return;
}

// check if we are currently at the maximum timeline scale
export function isAtMaxTimelineScale() {
    return get(currentTimelineScale) >= get(maxTimelineScale)
}

// check if we are currently at the minimum timeline scale
export function isAtMinTimelineScale() {
    return get(currentTimelineScale) <= get(minTimelineScale)
}

// check if an element is currently selected on the timeline
export function isAnElementSelected(): boolean {
    const selectedElementRef = get(selectedElement)
    return !!selectedElementRef.elementId
}

// checks if at least one element exists in the timeline
export function doesElementExistInTimeline(): boolean {
    return get(timelineTracks).length > 0
}

// get the next lower scale value compared to the current one
export function getNextLowerScale() {
    const possibleScales = get(possibleScaleValues)
    const currentScale = get(currentTimelineScale)

    // get the next lower value by going through all possible values in the reverse order and returning the first value that is lower than the current scale
    // we can do it this way since we know that the possible values are sorted in ascending order
    for (let i = possibleScales.length - 1; i > 0; i--) {
        if (possibleScales[i] < currentScale) {
            return possibleScales[i]
        }
    }

    // if we weren't able to find a value we return the lowest scale value
    return possibleScales[0]
}

// get the next higher scale value compared to the current one
export function getNextHigherScale() {
    const possibleScales = get(possibleScaleValues)
    const currentScale = get(currentTimelineScale)

    // get the next higher value by going through all possible values and returning the first value that is higher than the current scale
    // we can do it this way since we know that the possible values are sorted in ascending order
    for (let i = 0; i < possibleScales.length; i++) {
        if (possibleScales[i] > currentScale) {
            return possibleScales[i]
        }
    }

    // if we weren't able to find a value we return the highest scale value
    return possibleScales[possibleScales.length - 1]
}

// add a given element to a given timeline and update its playback start time
export function addElementToTimeline(trackEls: ITimelineElement[], newIndex: number, newElement: ITimelineElement, newStartTime: number): ITimelineElement[] {
    // add the new element directly after current element
    trackEls.splice(newIndex, 0, newElement);

    // update the playback start time of new element
    trackEls[newIndex] = {
        ...newElement,
        playbackStartTime: newStartTime // new playback start time is at the end of the previous element to put it directly after it
    };

    // automatically select duplicated element
    selectedElement.set({ elementId: newElement.elementId, mediaType: newElement.type });

    return trackEls;
}

// check if the thumb is currently over the selected element and if yes, return the ms where it is over the element
// return -1 otherwise
export function thumbOverSelectedElement(): number {
    // check if an element is even selected, if not the thumb can't be over the selected element
    if (!isAnElementSelected()) {
        return -1
    }

    // get indeces of selected element in timeline
    const indeces = getIndexOfSelectedElementInTracks()

    if (!indeces) {
        return -1
    }

    const tracks = get(timelineTracks)
    const element = tracks[indeces.rowIndex].elements[indeces.elementIndex]

    // get bounds of selected element
    const elementBounds: ITimelineElementBounds =
    {
        start: element.playbackStartTime,
        end: element.playbackStartTime + element.duration
    }

    // get current position of timeline thumb in ms
    const thumbPosition = get(currentPlaybackTime)

    // check if the thumb is between start and end bounds of selected element including the mind width offset on both ends to not be able to split element to be less than the minimum width
    const thumbAfterStart = thumbPosition > elementBounds.start + CONSTS.timelineElementMinWidthMs
    const thumbBeforeEnd = thumbPosition < elementBounds.end - CONSTS.timelineElementMinWidthMs
    const thumbOverEl = thumbAfterStart && thumbBeforeEnd

    // return the thumb position over the element or -1 if thats not the case
    return thumbOverEl ? thumbPosition - elementBounds.start : -1
}

// check if a given element overlaps with any element on a given track
export function isElementOverlapping(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[], ignoreElIndex?: number): boolean {
    return trackEls.some((trackEl, i) => {
        const trackElStart = trackEl.playbackStartTime
        const trackElEnd = trackEl.playbackStartTime + trackEl.duration

        // ignore this element when checking for overlapping
        if (ignoreElIndex !== undefined && i === ignoreElIndex) {
            return false
        }

        if ((elBounds.start >= trackElStart && elBounds.start < trackElEnd) || (elBounds.end > trackElStart && elBounds.end <= trackElEnd)) {
            return true
        }
    })
}

// wrapper function that handles all the overlapping logic when moving an element, returns the updated track elements
export function handleOverlapping(newElBounds: ITimelineElementBounds, trackEls: ITimelineElement[], index?: number): ITimelineElement[] {
    // check if the new position of the element overlaps with any other element on the track
    const isOverlapping = isElementOverlapping(
        newElBounds,
        trackEls,
        index
    );

    console.log('Timeline -> handleOverlapping -> isOverlapping:', isOverlapping);

    // if the element overlaps with any other element we move the elements accordingly so the element can fit on the track
    if (isOverlapping) {
        trackEls = moveElementsOnTrack(
            newElBounds,
            trackEls,
            index
        );
        console.error(
            'Timeline -> handleOverlapping -> elements overlaps after track:',
            [...trackEls]
        );
    }

    return trackEls
}

// get the element end time for the next element on the left side of a given element on a given track
export function getNextLeftElementEndTime(trackIndex: number, elementIndex: number): number | undefined {
    // if the given element is the first in the track we can directly return undefined
    if (elementIndex === 0) {
        undefined
    }

    const tracks = get(timelineTracks)

    // handle the case where we pass a track or element index that is out of bounds 
    if (trackIndex > tracks.length || elementIndex > tracks[trackIndex].elements.length) {
        return undefined
    }

    // get the element in the track just before the given element index
    const elementBefore = tracks[trackIndex].elements[elementIndex - 1]

    if (!elementBefore) {
        return undefined
    }

    // return the end time of the element in milliseconds
    return elementBefore.playbackStartTime + elementBefore.duration
}

// get the element start time for the next element on the right side of a given element on a given track
export function getNextRightElementStartTime(trackIndex: number, elementIndex: number): number | undefined {
    console.error("getNextRightElementStartTime -> trackIndex:", trackIndex, "elementIndex:", elementIndex)

    const tracks = get(timelineTracks)

    // handle the case where we pass a track or element index that is out of bounds 
    if (trackIndex > tracks.length || elementIndex > tracks[trackIndex].elements.length) {
        return undefined

    }

    // if the given element is the last element in the track we can directly return undefined
    if (elementIndex === tracks[trackIndex].elements.length - 1) {
        undefined
    }

    // get the element in the track just after the given element index
    const elementAfter = tracks[trackIndex].elements[elementIndex + 1]

    if (!elementAfter) {
        return undefined
    }

    // return the start time of the element in milliseconds
    return elementAfter.playbackStartTime
}

// go through a given array of tracks and remove tracks that don't have any elements
export function cleanUpEmptyTracks(tracks: ITimelineTrack[]) {
    // check if there is an empty track in the array. If yes get the index
    const index = tracks.findIndex(track => !track.elements || track.elements.length === 0)

    if (index === -1) {
        return tracks
    }

    tracks.splice(index, 1)
}

// create an empty track with a given element
export function createTrackWithElement(element: ITimelineElement) {
    return {
        trackId: generateId(),
        elements: [element]
    } as ITimelineTrack
}

// check if a given element is at the correct index inside a given track 
export function isElementAtCorrectIndex(el: ITimelineElement, index: number, trackEls: ITimelineElement[]): boolean {
    // if the track only has one element and the index is 0 we can directly return true since its the only element on the track
    if (trackEls.length === 1 && index === 0) {
        return true
    }

    // handle the case where the index is bigger than the track length
    if (index > trackEls.length - 1) {
        console.error(`Error checking if the element is at the correct index: index ${index} is bigger than the track length`)
        return true
    }

    // keep track of the element before and after the index
    let elementBefore: ITimelineElement | undefined
    let elementAfter: ITimelineElement | undefined

    // if the element is not the first element we get the element before 
    if (index > 0) {
        elementBefore = trackEls[index - 1]
    }

    // if the element is not the last element we get the element after 
    if (index < trackEls.length - 1) {
        elementAfter = trackEls[index + 1]
    }

    // check if the playback start time of the element before is after the start of the given element
    const isElementBeforeStartTimeSmallerThanElStartTime = elementBefore !== undefined && elementBefore.playbackStartTime < el.playbackStartTime

    // check if the playback start time of the element after is before the start of the given element
    const isElementAfterStartTimeBiggerThanElStartTime = elementAfter !== undefined && elementAfter.playbackStartTime > el.playbackStartTime

    // console.error(
    //     'Timeline -> isElementAtCorrectIndex -> elementBefore:', elementBefore, "elementAfter:", elementAfter, "el:", el, "at correct index:", (isElementBeforeStartTimeSmallerThanElStartTime || elementBefore === undefined) && (isElementAfterStartTimeBiggerThanElStartTime || elementAfter === undefined)
    // );

    // return if both the element before and after have a correct playback start time relative to the given element
    return (isElementBeforeStartTimeSmallerThanElStartTime || elementBefore === undefined) && (isElementAfterStartTimeBiggerThanElStartTime || elementAfter === undefined)
}

// sort a given track by playbackStartTime
export function moveElementToCorrectIndex(el: ITimelineElement, index: number, trackEls: ITimelineElement[]): ITimelineElement[] {
    // naive solution of just sorting the array by the playbackStartTime, could be performing worse with more elements
    // trackEls.sort((a, b) => a.playbackStartTime - b.playbackStartTime)

    // handle the case where the index is bigger than the track length
    if (index > trackEls.length - 1) {
        console.error(`Error checking if the element is at the correct index: index ${index} is bigger than the track length`)
        return trackEls
    }

    const startingTrackLength = [...trackEls].length

    // remove element from array using its previous index
    trackEls.splice(index, 1)
    console.error('Timeline -> moveElementToCorrectIndex -> after remove:', [...trackEls]);

    for (let i = 0; i < trackEls.length; i++) {
        // keep track if the current element start time is after the element start time
        const curStartTimeAfterElement = trackEls[i].playbackStartTime > el.playbackStartTime
        console.error('Timeline -> moveElementToCorrectIndex -> in for loop i:', i, "curStartTimeAfterElement:", curStartTimeAfterElement);

        // if the start time of the current element is before the element we can directly jump to the next iteration in the loop
        if (!curStartTimeAfterElement) {
            continue
        }

        // // remove element from array using its previous index
        // trackEls.splice(index, 1)


        // add the element at the current index since the current element will be pushed after the element has been added
        trackEls.splice(i, 0, el)

        console.error('Timeline -> moveElementToCorrectIndex -> after add in loop:', [...trackEls]);

        // we moved the element so we can break out of the loop
        break;
    }

    // if no element had a start time after the given element we just push it to the back
    if (trackEls.length < startingTrackLength) {
        trackEls.push(el)
        console.error('Timeline -> moveElementToCorrectIndex -> after push after loop:', [...trackEls]);
    }

    console.error('Timeline -> moveElementToCorrectIndex -> trackEls end:', [...trackEls]);
    return trackEls
}

// wrapper function that handles all the logic for checking and updating if a given element is at the correct index after moving, returns the updated track elements
export function handleElementIndeces(newEl: ITimelineElement, newElStartTime: number, trackEls: ITimelineElement[], index: number, pushElFirst?: boolean): ITimelineElement[] {
    // update the playback start time for the moved element
    newEl.playbackStartTime = newElStartTime;

    // for moving an element from a different track we first add the element to the end of the track and then check if the index is correct or if we need to update it
    if (pushElFirst) {
        trackEls.push(newEl)
    }

    // check if the index of the element inside the track is still correct after changing the playbackStartTime, if not we need to update it
    if (!isElementAtCorrectIndex(newEl, index, trackEls)) {
        console.error(
            'Timeline -> row drop-timeline-element -> element is not at the correct index anymore -> track:',
            [...trackEls],
            'foundEl',
            Object.assign({}, newEl),
            'prevElementIndex:',
            index
        );
        //  update the element index inside the track
        trackEls = moveElementToCorrectIndex(
            newEl,
            index,
            trackEls
        );
    }
    return trackEls;
}

// move a given list of timeline elements according to given element bounds so they don't overlap
export function moveElementsOnTrack(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[], sameTrackElIndex?: number) {
    let moveAmount: number | undefined = undefined
    console.log(
        'element dropped on track [moveElementsOnTrack] -> in start:',
        JSON.parse(JSON.stringify(trackEls)), "elBounds:", elBounds
    );

    // keep track if we already moved the first overlapping element
    let firstElementAdjusted = false

    // TODO: What we should also try out now is if the element was dropped on the right half of an element we try and move the elements to the left if possible
    // we can try this checking if the element was dropped either on the left or right side of the element
    // if it was the right side we can check if there are gaps between elements to the left 
    // we can keep our current solution for now which should be enough

    const tracks = trackEls.map((trackEl, i) => {
        // calculate the bounds of current element 
        const trackElBounds: ITimelineElementBounds = { start: trackEl.playbackStartTime, end: trackEl.playbackStartTime + trackEl.duration }

        const sameTrackAndSameIndex = sameTrackElIndex !== undefined && i === sameTrackElIndex
        console.log(
            'element dropped on track [moveElementsOnTrack] -> in map 1 trackElBounds:',
            JSON.parse(JSON.stringify(trackElBounds)), "sameTrackAndSameIndex:", sameTrackAndSameIndex,
        );

        // check for the first element the dropped element overlaps and get the amount the overlapped element needs to be moved to the right
        if (isElementOverlapping(elBounds, [trackEl]) && moveAmount === undefined && !sameTrackAndSameIndex) {
            moveAmount = elBounds.end - trackElBounds.start;
            console.log(
                'element dropped on track [moveElementsOnTrack] -> in if moveAmount:', moveAmount, "first element adjusted:", firstElementAdjusted
            );
        }

        // now that the first element has been adjusted we also want to check if and, if yes, by how much we need to move the following elements
        if (moveAmount !== undefined && firstElementAdjusted) {
            // get the previous element with its updated end time
            const prevEl = trackEls[i - 1]
            const newPrevElEndTime = prevEl.playbackStartTime + prevEl.duration

            // check if we need to move this element as well by checking if it now overlaps with the previous element that was updated
            const elementOverlapping = newPrevElEndTime > trackElBounds.start

            // if the current element now overlaps with the previous one we update the current playback start time to be the end time of the previous element to move it directly behind the previous element 
            if (elementOverlapping) {
                trackEl.playbackStartTime = newPrevElEndTime
            }

            console.log(
                'element dropped on track [moveElementsOnTrack] -> in if element has been adjusted trackEls:',
                JSON.parse(JSON.stringify(trackEls)), "previous element overlapping:", elementOverlapping
            );
        }

        // if moveAmount is defined and no element has been adjusted yet, move the current element by that amount
        if (moveAmount !== undefined && !firstElementAdjusted) {
            trackEl.playbackStartTime += moveAmount

            // we now adjusted the first overlapping element so we keep track of that
            firstElementAdjusted = true
            console.log(
                'element dropped on track [moveElementsOnTrack] -> in if no element adjusted trackEls:',
                JSON.parse(JSON.stringify(trackEls)),
            );
        }



        console.log(
            'element dropped on track [moveElementsOnTrack] -> in map 2 trackEl:',
            JSON.parse(JSON.stringify(trackEls))
        );
        return trackEl
    })

    console.log(
        'element dropped on track [moveElementsOnTrack] -> end:',
        JSON.parse(JSON.stringify(tracks))
    );
    return tracks
}
//#endregion