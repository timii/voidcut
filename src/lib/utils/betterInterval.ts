// self-adjusting interval to account for drifting using setInterval normally
// source: https://stackoverflow.com/a/44337628
export const adjustingInterval = (intervalCallback: () => void, delay: number, errorCallback: () => void) => {
    let expected: number
    let timeout: number

    const start = () => {
        expected = Date.now() + delay;
        timeout = setTimeout(step, delay);
    }

    const stop = () => {
        clearTimeout(timeout);
    }

    function step() {
        var drift = Date.now() - expected;
        if (drift > delay) {
            // You could have some default stuff here too...
            if (errorCallback) errorCallback();
        }
        intervalCallback();
        expected += delay;
        timeout = setTimeout(step, Math.max(0, delay - drift));
    }

    return { start, stop }
}