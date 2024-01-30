// export const accurateInterval = function (time, fn) {
//     var cancel, nextAt, timeout, wrapper, _ref;
//     nextAt = new Date().getTime() + time;
//     timeout = null;
//     if (typeof time === 'function') _ref = [time, fn], fn = _ref[0], time = _ref[1];
//     wrapper = function () {
//         nextAt += time;
//         timeout = setTimeout(wrapper, nextAt - new Date().getTime());
//         return fn();
//     };
//     cancel = function () {
//         return clearTimeout(timeout);
//     };
//     timeout = setTimeout(wrapper, nextAt - new Date().getTime());
//     return {
//         cancel: cancel
//     };
// };


// self-adjusting interval to account for drifting using setInterval normally
// source: https://stackoverflow.com/a/44337628
export const AdjustingInterval = (/** @type {{ (): void; (): void; }} */ workFunc, /** @type {number} */ interval, /** @type {{ (): void; (): void; }} */ errorFunc) => {
    // var that = this;
    /**
     * @type {number}
     */
    let expected
    /**
     * @type {number | undefined}
     */
    let timeout

    const start = function () {
        expected = Date.now() + interval;
        timeout = setTimeout(step, interval);
    }

    const stop = function () {
        clearTimeout(timeout);
    }

    function step() {
        var drift = Date.now() - expected;
        if (drift > interval) {
            // You could have some default stuff here too...
            if (errorFunc) errorFunc();
        }
        workFunc();
        expected += interval;
        timeout = setTimeout(step, Math.max(0, interval - drift));
    }

    return { start, stop }
}