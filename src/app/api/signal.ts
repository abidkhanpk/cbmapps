import type { NextApiRequest, NextApiResponse } from 'next';
import { fft, windowFunc, averageFunc, generateSignal } from './signalUtils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const params = req.body;
  // Generate signal
  const signal = generateSignal(params);
  // Apply window
  const windowed = windowFunc(signal, params.window);
  // FFT
  const spectrum = fft(windowed, params.sampling);
  // Averaging
  const averaged = averageFunc(signal, params.averaging);
  // Prepare plot data
  res.json({
    timePlot: {
      data: [{ x: signal.x, y: signal.y, type: 'scatter', mode: 'lines', name: 'Signal' }],
      layout: { title: 'Time Domain', xaxis: { title: 'Time (s)' }, yaxis: { title: 'Amplitude' } },
    },
    fftPlot: {
      data: [{ x: spectrum.freq, y: spectrum.mag, type: 'scatter', mode: 'lines', name: 'FFT' }],
      layout: { title: 'Frequency Spectrum', xaxis: { title: 'Frequency (Hz)' }, yaxis: { title: 'Magnitude' } },
    },
    comparisonPlot: averaged ? {
      data: [{ x: signal.x, y: averaged, type: 'scatter', mode: 'lines', name: 'Averaged' }],
      layout: { title: 'Averaging', xaxis: { title: 'Time (s)' }, yaxis: { title: 'Amplitude' } },
    } : undefined,
  });
}
