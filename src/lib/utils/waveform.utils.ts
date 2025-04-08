// generates an svg of the waveform from a given file
export async function generateAudioWaveform(file: File, size?: string) {
    // converts the file into a binary buffer
    const arrayBuffer = await file.arrayBuffer();

    // create new audio context to use the web audio api
    const audioCtx = new window.AudioContext();

    // turn binary audio into usable waveform samples
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // get only the left channel (mono) waveform data points (array of numbers from -1 to +1)
    const samples = audioBuffer.getChannelData(0);

    // downsample to 1000 points
    const waveform = downsample(samples, 1000);
    const svg = generateSVG(waveform, 1000, 200);
}

// reduce given amount samples to given amount to decrease the amount of data points in the waveform
function downsample(samples: Float32Array, amount: number) {
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

// generate the svg paths from a gievn array of samples and fit the svg into given dimensions
function generateSVG(waveform: number[], width: number, height: number) {

    // for each point in the waveform draw a vertical line at that position — from the middle to the top & bottom to represent the classic "bar" waveform
    const halfHeight = height / 2;
    const pathData = waveform.map((v, i) => {
        const x = i;
        const y = v * halfHeight;
        return `M${x},${halfHeight - y} L${x},${halfHeight + y}`;
    }).join(' ');

    // stitch all "bars" together into one <path> in svg
    return `
      <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <path d="${pathData}" stroke="black" stroke-width="1" fill="none" />
      </svg>
    `;
}