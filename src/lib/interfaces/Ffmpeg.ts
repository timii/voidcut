import { MediaType } from "./Media";

export interface IFfmpegElement {
    mediaData: Uint8Array; // media data as an UInt8Array 
    duration: number; // duration in ms
    offset: number; // offset in ms
    mediaType: MediaType; // type of media
    fileExtension: string; // file extension
    trimFromStart: number, // how much is trimmed from the start in milliseconds
    trimFromEnd: number, // how much is trimmed from the end in milliseconds
}
}

export enum ExportState {
    NOT_STARTED = 'not_started',
    PROCESSING = 'processing',
    COMPLETE = 'complete',
    FAILED = 'failed',
}