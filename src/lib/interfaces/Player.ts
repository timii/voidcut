import type { ITimelineElement } from "./Timeline";

export interface IPlayerElement extends ITimelineElement {
    src?: string;
}

export interface IPlayerElementsMap { [x: string]: { el: HTMLElement; properties: IPlayerElement } }
