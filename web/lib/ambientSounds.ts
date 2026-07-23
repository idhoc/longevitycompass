export type AmbientSoundType = "white" | "rain" | "ocean";

export interface AmbientSoundHandle {
  stop: () => void;
}

/**
 * Real synthesized ambient audio — no sound files to ship, so each type
 * is built from filtered noise instead: white noise plain, rain as
 * heavily-filtered noise with light shimmer, ocean as slow-filtered
 * noise with a gain LFO shaping the swell of a wave.
 */
export function playAmbientSound(type: AmbientSoundType): AmbientSoundHandle | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    let filter: BiquadFilterNode | null = null;
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    let targetGain = 0.18;

    if (type === "white") {
      noise.connect(gain);
    } else if (type === "rain") {
      filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1200;
      noise.connect(filter);
      filter.connect(gain);
      targetGain = 0.14;
    } else {
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 500;
      noise.connect(filter);
      filter.connect(gain);
      targetGain = 0.22;

      lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.09;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
    }

    gain.connect(ctx.destination);
    noise.start();
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 2);

    return {
      stop: () => {
        try {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
          setTimeout(() => {
            noise.stop();
            lfo?.stop();
            ctx.close();
          }, 700);
        } catch {
          // already stopped
        }
      },
    };
  } catch {
    return null;
  }
}
