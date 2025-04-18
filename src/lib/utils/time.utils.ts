import type { Time } from "$lib/interfaces/Time";
import { CONSTS } from "./consts";

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