import { FFmpeg } from "@ffmpeg/ffmpeg";
import { ffmpegLoaded } from "../../stores/store";

let ffmpeg: FFmpeg

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
        console.log('[PROGRESS] progress:', progress * 100, 'time:', time / 1000000);
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

// entry point when starting export 
export async function callFfmpeg() {
    console.log('callFfmpeg called');

    // get all timeline elements and their properties

    // map elements into ffmpeg flags and parameters

    // write necessary elements into ffmpeg.wasm filysystem

    // execute ffmpeg 

    // handle error cases when executing

    // read output file from ffmpeg.wasm

    // download read file
}