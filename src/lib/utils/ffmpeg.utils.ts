import { FFmpeg } from "@ffmpeg/ffmpeg";
import { availableMedia, exportOverlayOpen, exportState, ffmpegLoaded, ffmpegProgress, ffmpegProgressElapsedTime, ffmpegProgressPrevValue, maxPlaybackTime, previewAspectRatio, processedFile, processedFileSize, timelineTracks } from "../../stores/store";
import { get } from "svelte/store";
import { convertDataUrlToUIntArray, convertFileToDataUrl, resizeFilePreview, msToS } from "./utils";
import { ExportState, type OutputMap, OutputMapKey, type IFfmpegElement } from "$lib/interfaces/Ffmpeg";
import { adjustingInterval } from "./betterInterval";
import { CONSTS } from "./consts";
import { MediaType } from "$lib/interfaces/Media";
import { aspectRatio1080pMap } from "$lib/interfaces/Player";

let ffmpeg: FFmpeg
let elapsedTimeInterval: {
    start: () => void;
    stop: () => void;
}

// TODO: dynamically set an output file type and name
const outputFileName = 'output.mp4';

// #region initliaze ffmpeg
// initialize FFmpeg, setup logging and load necessary packages
export async function initializeFfmpeg() {

    // create a new ffmpeg instance
    ffmpeg = new FFmpeg();

    // listen to log events and print them into the console
    ffmpeg.on('log', ({ type, message }) => {
        console.log('[LOG] type:', type, 'message:', message);
    });

    // listen to progress events and print them into the console
    ffmpeg.on('progress', ({ progress, time }) => {
        const progressPercent = progress * 100
        const progressRounded = Math.round(progressPercent)
        const timeInS = time / 1000000
        console.log('[PROGRESS] progress:', progressPercent, 'time:', timeInS);

        // handle weird progress values 
        const prevProgessValue = get(ffmpegProgressPrevValue)
        ffmpegProgressPrevValue.set(progressRounded)
        if (prevProgessValue < 0 || progressRounded > 100) {
            ffmpegProgress.update(prevValue => prevValue)
        }
        else {
            ffmpegProgress.set(Math.max(0, Math.min(100, progressRounded)))
        }
    });

    // load ffmpeg-core inside web worker
    // it is required to call this method first as it initializes WebAssembly and other essential variables
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`
    });

    ffmpegLoaded.set(true)
    console.log('[FFMPEG] Ffmpeg core packages loaded');
}

// #region entry point
// entry point when starting export 
export async function callFfmpeg() {
    // start timer for elapsed time calculation
    startTimer()

    exportState.set(ExportState.PROCESSING)

    // map timeline elements so they include all necessary information and can be used in ffmpeg
    const mediaData = mapTimelineElements()
    console.log('[FFMPEG] mapping of timeline elements successful');

    // create blank video with only black screen
    const blankVideoReturn = await createBlankVideo()
    console.log('[FFMPEG] creation of blank video successful');

    // handle error cases when executing ffmpeg and stop execution
    if (blankVideoReturn !== 0) {
        exportState.set(ExportState.FAILED)
        stopTimer()
        return;
    }

    // map elements into ffmpeg flags and parameters
    const flags = createFfmpegFlags(mediaData)
    console.log('[FFMPEG] creating ffmpeg flags successful');

    // write necessary elements into ffmpeg.wasm filesystem
    await writeFilesToFfmpeg(mediaData)
    console.log('[FFMPEG] writing into ffmpeg filesystem successful');

    // execute ffmpeg with the created flags
    const execReturn = await ffmpeg.exec(flags)
    console.log('[FFMPEG] executing ffmpeg commands successful');

    // handle error cases when executing ffmpeg and stop execution
    if (execReturn !== 0) {
        exportState.set(ExportState.FAILED)
        stopTimer()
        return;
    }

    // read output file from ffmpeg.wasm
    const outputData = await ffmpeg.readFile(outputFileName) as Uint8Array;
    console.log('[FFMPEG] reading created output file successful');

    // set export state to be successful if we reached this point
    exportState.set(ExportState.COMPLETE)
    stopTimer()


    // calculate file size from processed file
    const fileSize = +(outputData.length / 1_048_576).toFixed(2)
    processedFileSize.set(fileSize)

    // write processed file into store
    processedFile.set(outputData)
    console.log('[FFMPEG] writing processed into store successful');
}

// #region mapping timeline
// get and map timeline elements and prepare them so they can be used in ffmpeg
function mapTimelineElements(): IFfmpegElement[] {
    // get all timeline elements and their properties
    const timelineElements = get(timelineTracks).flatMap(track => track.elements)

    const mediaData = timelineElements.map((el) => {
        // map each timeline element to a media element in the pool to get the source dataUrl
        const mediaEl = get(availableMedia).find((media) => media.mediaId === el.mediaId)!;

        // map media element and convert their source data url into UInt8Array that 
        // can be used in ffmpeg
        const splitFilename = mediaEl.name.split('.')
        const fileType = splitFilename && splitFilename.length > 1 ? splitFilename.pop()! : ''
        return { uIntArr: convertDataUrlToUIntArray(mediaEl.src), fileType }
    });

    // map the media data and timeline element togehter so it can be used in ffmpeg
    const mappedElements: IFfmpegElement[] = mediaData.map((data, i) => {
        const timelineElement = timelineElements[i]
        return {
            mediaData: data.uIntArr,
            duration: timelineElement.duration,
            offset: timelineElement.playbackStartTime,
            mediaType: timelineElement.type,
            fileExtension: data.fileType,
            fileName: timelineElement.mediaName.replace(`.${data.fileType}`, ''),
            trimFromStart: timelineElement.trimFromStart,
            trimFromEnd: timelineElement.trimFromEnd
        }
    })

    return mappedElements
}

// #region blank
async function createBlankVideo() {
    // get the latest point of any element for the blank video length
    const maxLengthInS = get(maxPlaybackTime) / 1000

    // create a "video" with just a black screen and no audio
    // we will overlay every element on top of this "base" video 
    const flags: string[] = []

    // get the correct px values from the defined aspect ratio
    const aspectRatio = getAspectRatioInPx()
    flags.push(
        "-f", "lavfi", "-i", `color=size=${aspectRatio}:rate=60:color=black`, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-t", `${maxLengthInS}`, "blank.mp4"
    )

    // execute the blank video creation command and wait until its done
    const execReturn = await ffmpeg.exec(flags)

    return execReturn
}

// #region flags
// use the mapped timeline elements to dynamically create the necessary 
// ffmpeg flags and parameters 
function createFfmpegFlags(mediaData: IFfmpegElement[]): string[] {

    const flags: string[] = [];

    // include the blank video as the first input
    flags.push('-i', 'blank.mp4')

    // add each media element as an input for ffmpeg
    for (let i = 1; i <= mediaData.length; i++) {
        const fileName = createFileName(i, mediaData[i - 1]);

        // push the -i flag with the input name
        flags.push('-i', fileName);
    }

    flags.push('-filter_complex')

    // keep track of all the output variables so we can use them in the filter_complex string
    const outputMap: OutputMap = new Map<OutputMapKey, string[]>()

    // append strings created in the steps to this string
    let filterComplexString = ''

    // --------------------------------------
    // 1. video processing (except for audio elements)
    // --------------------------------------

    // TODO: skip/handle audio elements for trimming and find out how to handle them in the map
    // 1.1 trim element videos and shift their timeline forward accordingly so that they appear at the correct times
    const updateVideosString = updateElementVideos(mediaData, outputMap)
    filterComplexString += updateVideosString

    // 1.2 reset the blank video’s (background video) timestamp to the start
    const resetTimestampString = resetBackgroundVideoTimestamp(outputMap)
    filterComplexString += resetTimestampString

    // 1.3 overlay each element starting from the last timeline row
    const overlayString = overlayElements(mediaData, outputMap)
    filterComplexString += overlayString

    // --------------------------------------
    // 2. audio processing (except for images)
    // --------------------------------------

    // 2.1 trim the element audios, resets timestamps and delays them accodingly to their offset
    const updateAudiosString = updateElementAudios(mediaData, outputMap)
    filterComplexString += updateAudiosString

    // 2.2 mixes the background audio with all overlay audio tracks
    const mixingAudiosString = mixAudioStreams(outputMap)
    filterComplexString += mixingAudiosString

    // push final filter_complex into flags array
    flags.push(filterComplexString)

    // map the final video and audio stream to the output file
    const finalVideoStream = outputMap.get(OutputMapKey.OVERLAY)![0]
    // map final video stream to ouput file
    flags.push('-map', `[${finalVideoStream}]`)

    const finalAudioStream = outputMap.get(OutputMapKey.AUDIO_MIX)![0]
    // map final audio stream to ouput file
    flags.push('-map', `[${finalAudioStream}]`)

    flags.push(`${outputFileName}`)

    return flags
}

// #region flag helpers
// handle trimming, timestamps and delays for the video streams
function updateElementVideos(mediaData: IFfmpegElement[], outputMap: OutputMap): string {
    // create a "trim" key with an empty array that will keep track of the output variable names to be used later 
    outputMap.set(OutputMapKey.TRIM, [])

    let trimString = ''

    // loop through all elements beginning from the last and ending with the first element
    for (let i = mediaData.length - 1; i >= 0; i--) {
        // get current element
        const curEl = mediaData[i]

        // if current element is an audio, skip current iteration since there is no video stream to offset or trim
        if (curEl.mediaType === MediaType.Audio) {
            // get the previous array
            const prevMapValue = outputMap.get(OutputMapKey.TRIM) ?? ''
            // add 'null' into map value so the overlay later knows to skip it
            outputMap.set(OutputMapKey.TRIM, [...prevMapValue, 'null'])
            continue;
        }

        // get all necessary properties and convert them to seconds with two digits after the dot
        const offsetInS = +msToS(curEl.offset).toFixed(2)
        const durationInS = +msToS(curEl.duration).toFixed(2)
        const trimFromStart = +msToS(curEl.trimFromStart).toFixed(2)
        const trimFromEnd = +msToS(curEl.trimFromEnd).toFixed(2)

        // decrement indeces
        const inputIndex = i + 1
        const outputName = `trim${inputIndex}`

        // build the filter string for current element by appending it to the previous element(s)
        trimString += `[${inputIndex}:v]trim=start=${trimFromStart}:duration=${durationInS},setpts=PTS-STARTPTS+${offsetInS}/TB[${outputName}];`

        // get the previous array
        const prevMapValue = outputMap.get(OutputMapKey.TRIM) ?? ''
        // add the output name of created filter into map value
        outputMap.set(OutputMapKey.TRIM, [...prevMapValue, outputName])
    }

    return trimString
}

// reset the blank video’s (background video) timestamp to the start
function resetBackgroundVideoTimestamp(outputMap: OutputMap): string {
    const outputName = 'bg'
    // create the string to reset the background video timestamp to the start
    const resetString = `[0:v]setpts=PTS-STARTPTS[${outputName}];`

    // add the output name to the map with only one element as the value
    outputMap.set(OutputMapKey.RESET, [outputName])

    return resetString
}

// handle overlapping elements in the correct order
function overlayElements(mediaData: IFfmpegElement[], outputMap: OutputMap): string {
    let overlayString = ''

    // keep track of the output name from the last overlay
    let outputName = null

    // get all elements to overlay 
    const overlayElements = outputMap.get(OutputMapKey.TRIM)!

    // loop through all elements beginning from the last and ending with the first element to correctly overlay them
    for (let i = mediaData.length - 1; i >= 0; i--) {
        // get current element
        const curEl = mediaData[i]

        // determine what element is the background for the overlay (first iteration is the blank video)
        const outputToOverlayOn = outputName ?? outputMap.get(OutputMapKey.RESET)![0]

        // get the next element and remove it from the array
        const nextElement = overlayElements.shift()

        // if the next element should be skipped, continue to next iteration
        if (nextElement === 'null') {
            continue
        }

        // if there is no next element break out of loop
        if (!nextElement) {
            break;
        }

        // use the current i to create a "unique" output name
        outputName = `ovrl${i}`

        // get all necessary properties and convert them to seconds with two digits after the dot
        const startInS = +msToS(curEl.offset).toFixed(2)
        const endInS = +msToS(curEl.offset + curEl.duration).toFixed(2)

        // build string with times for when to show the overlay for each element and center element on the x and y axis
        overlayString += `[${outputToOverlayOn}][${nextElement}]overlay=(W-w)/2:(H-h)/2:enable='between(t,${startInS},${endInS})'[${outputName}];`
    }

    // add the output name of the last overlay to the map
    outputMap.set(OutputMapKey.OVERLAY, [outputName ?? ''])

    return overlayString
}

// handle trimming, timestamps and delays for the audio streams
function updateElementAudios(mediaData: IFfmpegElement[], outputMap: OutputMap): string {
    let atrimString = ''

    // add the background audio to the output map
    outputMap.set(OutputMapKey.ATRIM, ['0:a'])

    // loop through all elements beginning from the last and ending with the first element
    for (let i = mediaData.length - 1; i >= 0; i--) {
        // get current element
        const curEl = mediaData[i]

        // if current element is an image, skip current iteration since there is no audio stream to offset or trim
        if (curEl.mediaType === MediaType.Image) {
            continue
        }

        // get all necessary properties and convert them to seconds with two digits after the dot
        const offsetInS = +msToS(curEl.offset).toFixed(2)
        const durationInS = +msToS(curEl.duration).toFixed(2)
        const trimFromStart = +msToS(curEl.trimFromStart).toFixed(2)
        const trimFromEnd = +msToS(curEl.trimFromEnd).toFixed(2)

        // decrement indeces
        const inputIndex = i + 1
        const outputName = `atrim${inputIndex}`

        // build the filter string for current element by appending it to the previous element(s)
        atrimString += `[${inputIndex}:a]atrim=start=${trimFromStart}:duration=${durationInS},asetpts=PTS-STARTPTS,adelay=${curEl.offset}:all=1[${outputName}];`

        // get the previous array
        const prevMapValue = outputMap.get(OutputMapKey.ATRIM) ?? ''
        // add the output name of created filter into map value
        outputMap.set(OutputMapKey.ATRIM, [...prevMapValue, outputName])
    }

    return atrimString
}

// handle mixing all updated audio streams with the background audio stream
function mixAudioStreams(outputMap: OutputMap): string {
    const outputName = 'outa'

    // get all audio streams and their length from the map
    const allAudioStreams = outputMap.get(OutputMapKey.ATRIM)!
    const amountOfAudioStreams = allAudioStreams.length

    // join all audio streams into one string and each stream surrounded by "[]"
    let audioString = `[${allAudioStreams.join('][')}]`

    // build audio mixing string
    audioString += `amix=inputs=${amountOfAudioStreams}[${outputName}]`

    // add output name of filter into map
    outputMap.set(OutputMapKey.AUDIO_MIX, [outputName])

    return audioString
}

// #region write files
// write given video data into ffmpeg.wasm filesystem
async function writeFilesToFfmpeg(mediaData: IFfmpegElement[]) {
    for (const [i, el] of mediaData.entries()) {
        const fileName = createFileName(i + 1, el);

        await ffmpeg.writeFile(fileName, el.mediaData);
    }
}

// #region create file name
// create a ffmpeg input file name string using the given index, media name and file extension
function createFileName(index: number, mediaElement: IFfmpegElement) {
    return `${mediaElement.fileName}_${index}.${mediaElement.fileExtension}`;
}

// #region download output
// convert output data into blob and download it
export function downloadOutput() {
    const data = get(processedFile)
    const a = document.createElement('a');
    // TODO: dynamic output file type instead of hardcoding 'video/mp4' after we added logic for setting custom output name and file type
    a.href = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' }));
    a.download = outputFileName;

    setTimeout(() => {
        a.click();
    }, 1000);
}

// #region clean up
// clean up everything and reset store variables
export async function terminateFfmpegExecution() {
    // terminate all api calls and web worker
    ffmpeg.terminate()

    // reset store values
    exportState.set(ExportState.NOT_STARTED)
    exportOverlayOpen.set(false)

    // initialize ffmpeg again so its directly usable again
    await initializeFfmpeg()
}

// #region export timer
// set up the interval for updating the elapsed time
function startTimer(): void {
    //reset the previous store value
    ffmpegProgressElapsedTime.set(0)

    const intervalCallback = () => {
        ffmpegProgressElapsedTime.update(value => value + CONSTS.exportIntervalTimer)
    }

    const doError = () => {
        console.warn('The drift exceeded the interval.');
    };

    // set up and start self adjusting interval
    elapsedTimeInterval = adjustingInterval(intervalCallback, CONSTS.exportIntervalTimer, doError)
    elapsedTimeInterval.start()
}

// clear the interval
function stopTimer(): void {
    if (elapsedTimeInterval) {
        elapsedTimeInterval.stop()
    }
}

// get the height and width of the current aspect ratio defined in the store (in the format VALUExVALUE)
function getAspectRatioInPx(): string {
    const aspectRatio = get(previewAspectRatio)

    // return the mapped aspect ratio to the correct px values
    return aspectRatio1080pMap.get(aspectRatio)!
}

// #region waveform
// generates an image of the waveform from a given file using ffmpeg
export async function generateAudioWaveform(file: File, size?: string) {
    // convert audio file to DataUrl and then UIntArray first
    const audioDataUrl = await convertFileToDataUrl(file)
    const audioUIntArray = await convertDataUrlToUIntArray(audioDataUrl)

    // calculate the output image size
    const imageSize = size && size !== '' ? size : getMediaPoolImageSize()

    const inputName = 'audioInput.wav'
    const outputName = 'audioOutput.png'
    // write audio in ffmpeg.wasm filesystem
    await ffmpeg.writeFile(inputName, audioUIntArray);
    console.log('[FFMPEG] writing into ffmpeg filesystem successful');

    const flags = ['-i', inputName, '-filter_complex', `aformat=channel_layouts=mono,compand=gain=7:soft-knee=1,showwavespic=s=${imageSize}:colors=#ff981a`, '-frames:v', '1', outputName]
    // execute ffmpeg with the created flags
    const execReturn = await ffmpeg.exec(flags)
    console.log('[FFMPEG] executing ffmpeg commands successful');

    // handle error cases when executing ffmpeg and stop execution
    if (execReturn !== 0) {
        return undefined;
    }

    // read output file from ffmpeg.wasm
    const outputData = await ffmpeg.readFile(outputName) as Uint8Array;
    console.log('[FFMPEG] reading created output file successful');

    // turn outpout UIntArray into dataUrl
    const blob = new Blob([outputData.buffer as ArrayBuffer], { type: 'image/png' })
    const dataUrl = await convertFileToDataUrl(blob as File)

    return dataUrl
}

// gets the default image size for the waveform
function getMediaPoolImageSize(): string {
    // create the size string out of the const values for the media pool dimensions
    return `${CONSTS.mediaPoolElementWidth}x${CONSTS.mediaPoolElementHeight}`
}