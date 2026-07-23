export type AmbientSoundType = "white" | "rain" | "ocean";

export interface AmbientSoundHandle {
  stop: () => void;
}

/**
 * Real synthesized ambient audio — no sound files to ship, so each type
 * is built from filtered noise instead:
 *  - white: raw broadband noise, flat and steady.
 *  - rain: noise band-passed around the mid-highs (where droplet patter
 *    actually sits) with two non-harmonic fast LFOs flickering the gain —
 *    that irregular flutter is what reads as "countless droplets" instead
 *    of a steady hiss, which is what made it sound like white noise before.
 *  - ocean: noise low-passed into a rumble with one slow LFO shaping the
 *    swell of a wave.
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
    const lfos: OscillatorNode[] = [];
    let targetGain = 0.18;

    if (type === "white") {
      noise.connect(gain);
    } else if (type === "rain") {
      filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2600;
      filter.Q.value = 0.7;
      noise.connect(filter);
      filter.connect(gain);
      targetGain = 0.16;

      // Two fast, non-harmonically-related flutters beating against each
      // other — an irregular patter rather than a smooth tremolo, which
      // is what separates rain from a steady band of hiss.
      [5.3, 8.7].forEach((freq, i) => {
        const flutter = ctx.createOscillator();
        flutter.type = "sine";
        flutter.frequency.value = freq;
        const flutterGain = ctx.createGain();
        flutterGain.gain.value = i === 0 ? 0.05 : 0.035;
        flutter.connect(flutterGain);
        flutterGain.connect(gain.gain);
        flutter.start();
        lfos.push(flutter);
      });
    } else {
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 500;
      noise.connect(filter);
      filter.connect(gain);
      targetGain = 0.22;

      const swell = ctx.createOscillator();
      swell.frequency.value = 0.12;
      const swellGain = ctx.createGain();
      swellGain.gain.value = 0.09;
      swell.connect(swellGain);
      swellGain.connect(gain.gain);
      swell.start();
      lfos.push(swell);
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
            lfos.forEach((o) => o.stop());
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
