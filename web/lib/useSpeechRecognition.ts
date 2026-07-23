"use client";

import { useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

/**
 * Feature-detects the Web Speech API once and wires up a single-utterance
 * recognizer — Safari desktop and Firefox don't support it, so `supported`
 * simply comes back false there rather than pretending a mic button works.
 * Shared by the Coach and Wren voice inputs instead of duplicating this.
 */
export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onResultRef.current(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
  }, []);

  function start() {
    if (listening) return;
    setListening(true);
    recognitionRef.current?.start();
  }

  function stop() {
    setListening(false);
    recognitionRef.current?.stop();
  }

  function toggle() {
    if (listening) stop();
    else start();
  }

  return { supported, listening, start, stop, toggle };
}
