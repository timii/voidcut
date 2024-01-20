export const accurateInterval = function (time, fn) {
    var cancel, nextAt, timeout, wrapper, _ref;
    nextAt = new Date().getTime() + time;
    timeout = null;
    if (typeof time === 'function') _ref = [time, fn], fn = _ref[0], time = _ref[1];
    wrapper = function () {
        nextAt += time;
        timeout = setTimeout(wrapper, nextAt - new Date().getTime());
        return fn();
    };
    cancel = function () {
        return clearTimeout(timeout);
    };
    timeout = setTimeout(wrapper, nextAt - new Date().getTime());
    return {
        cancel: cancel
    };
};

export const AdjustingInterval = (workFunc, interval, errorFunc) => {
    // var that = this;
    var expected, timeout;

    const start = function () {
        expected = Date.now() + this.interval;
        timeout = setTimeout(step, this.interval);
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