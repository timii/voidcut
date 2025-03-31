export interface IMedia {
    name: string; // name of media
    mediaId: string; // unique id of media 
    type: MediaType; // enum type of media
    src: string; // dataUrl of media
    loaded: boolean; // is media finished uploading
    previewImage: string; // dataUrl string of preview image shown in the media pool
    timelineImage?: string, // dataUrl string of image used in the timeline element
    duration?: number; // duration in milliseconds (only relevant for video and audio)
}

export interface IFileMetadata {
    src: string; // dataUrl string containing the source of the file
    duration?: number; // duration metadata of file, if present
}

export enum MediaType {
    Video = "VIDEO",
    Audio = "AUDIO",
    Image = "IMAGE"
}