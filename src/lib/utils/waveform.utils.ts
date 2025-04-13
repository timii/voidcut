import { CONSTS } from "./consts";

let audioCtx: AudioContext | undefined = undefined

// generates an svg of the waveform from a given file
export async function generateAudioWaveformTimelineImage(file: File, width?: number): Promise<string> {
    // converts the file into a binary buffer
    const arrayBuffer = await file.arrayBuffer();

    // create new audio context to use the web audio api, if undefined
    if (!audioCtx) {
        audioCtx = new window.AudioContext();
    }

    // turn binary audio into usable waveform samples
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // get only the left channel (mono) waveform data points (array of numbers from -1 to +1)
    const samples = audioBuffer.getChannelData(0);

    const imageWidth = width ?? 200

    // downsample to have less data points
    const waveform = downsample(samples, imageWidth);

    // generate svg string
    const svg = generateSVG(waveform, imageWidth, CONSTS.timelineRowElementHeight);

    console.log("generateAudioWaveformNew -> svg:", svg);

    return svg
}

// reduce given amount samples to given amount to decrease the amount of data points in the waveform
function downsample(samples: Float32Array, amount: number): number[] {
    // define block size in which the samples should be split into
    const blockSize = Math.floor(samples.length / amount);
    const downsampled = [];

    // split the samples into blockSize chunks
    for (let i = 0; i < amount; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            const idx = i * blockSize + j;
            sum += Math.abs(samples[idx] || 0);
        }
        // average the absolute values
        downsampled.push(sum / blockSize);
    }

    const max = Math.max(...downsampled);
    // normalize everything to range from 0 to 1.
    return downsampled.map(v => v / max);
}

// generate the svg paths from a given array of samples and fit the svg into given dimensions
function generateSVG(samples: number[], width: number, height = CONSTS.timelineRowElementHeight, color = '#ff981a') {
    const halfHeight = height / 2;
    const roundedAmount = 1

    // calculate the bar width so each bar takes up the same amount of space along the x axis
    const barWidth = width / samples.length;

    const bars = samples.map((v, i) => {
        // calculate the position along the x and y axis
        const x = i * barWidth;
        const y = (1 - v) * halfHeight;

        // calculate the rectangle height by using the amplitude of each sample 
        const barHeight = v * height;

        // for each data point in the samples draw a rectangle at that position to represent the classic "bar" waveform
        return `<rect 
            x="${x.toFixed(2)}" 
            y="${y.toFixed(2)}" 
            width="${barWidth.toFixed(2)}" 
            height="${barHeight.toFixed(2)}"
            fill="${color}" 
            rx="${roundedAmount}" />`;
    }).join('\n'); // join every mapped rectangle into one big string 

    // add the created rectangles into one svg
    return `
        <svg 
            class="element-waveform" 
            preserveAspectRatio="none" 
            width="${width}" 
            height="${height}" 
            viewBox="0 0 ${width} ${height}" 
            xmlns="http://www.w3.org/2000/svg"
        >
            ${bars}
        </svg>
    `;
}
