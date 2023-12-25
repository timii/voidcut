export interface IMedia {
    name: string; // name of media
    mediaId: string; // unique id of media 
    type: MediaType; // enum type of media
    loaded: boolean; // is media finished uploading
    duration?: number; // duration in milliseconds (only relevant for video and audio)
}

export interface IFileMetadata {
    duration?: number;
}

export enum MediaType {
    Video = "VIDEO",
    Audio = "AUDIO",
    Image = "IMAGE"
}