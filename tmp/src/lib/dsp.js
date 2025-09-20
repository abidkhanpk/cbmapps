"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWindow = getWindow;
exports.applyWindow = applyWindow;
exports.detrendMean = detrendMean;
exports.segmentSignal = segmentSignal;
exports.isPowerOfTwo = isPowerOfTwo;
exports.nearestPowerOfTwo = nearestPowerOfTwo;
function getWindow(type, N) {
    const w = new Float64Array(N);
    if (N <= 1) {
        w.fill(1);
        return w;
    }
    switch (type) {
        case 'rectangular':
            w.fill(1);
            break;
        case 'hanning':
            for (let n = 0; n < N; n++) {
                w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
            }
            break;
        case 'hamming':
            for (let n = 0; n < N; n++) {
                w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
            }
            break;
        case 'blackman':
            for (let n = 0; n < N; n++) {
                w[n] = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1));
            }
            break;
        default:
            w.fill(1);
    }
    return w;
}
function applyWindow(x, w) {
    const N = Math.min(x.length, w.length);
    const y = new Float64Array(N);
    for (let i = 0; i < N; i++)
        y[i] = x[i] * w[i];
    return y;
}
function detrendMean(x) {
    const N = x.length;
    let sum = 0;
    for (let i = 0; i < N; i++)
        sum += x[i];
    const mean = sum / N;
    const y = new Float64Array(N);
    for (let i = 0; i < N; i++)
        y[i] = x[i] - mean;
    return y;
}
function segmentSignal(x, segmentLength, step) {
    const segments = [];
    if (segmentLength <= 0 || step <= 0)
        return segments;
    for (let start = 0; start + segmentLength <= x.length; start += step) {
        const seg = new Float64Array(segmentLength);
        for (let i = 0; i < segmentLength; i++)
            seg[i] = x[start + i];
        segments.push(seg);
    }
    return segments;
}
function isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
}
function nearestPowerOfTwo(n) {
    // returns the nearest power of two less than or equal to n
    let p = 1;
    while (p * 2 <= n)
        p *= 2;
    return p;
}
