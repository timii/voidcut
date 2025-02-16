import type { ITimelineElement } from "./Timeline";

export interface IPlayerElement extends ITimelineElement {
    src?: string;
}

export interface IPlayerElementsMap { [x: string]: { el: HTMLElement; properties: IPlayerElement } }

export enum PreviewAspectRatio {
    E16_9 = '16/9'
}
