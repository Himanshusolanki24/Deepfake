"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaType } from "@/types/media";
import { formatBytes } from "@/lib/utils";

export function useMediaPlayer(mediaType: MediaType) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const updateTime = () => setCurrentTime(el.currentTime);
    const updateMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", updateTime);
    el.addEventListener("loadedmetadata", updateMeta);
    return () => {
      el.removeEventListener("timeupdate", updateTime);
      el.removeEventListener("loadedmetadata", updateMeta);
    };
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, time);
    setCurrentTime(time);
  }, []);

  const changeVolume = useCallback((v: number) => {
    const el = ref.current;
    if (!el) return;
    el.volume = v;
    setVolume(v);
  }, []);

  return {
    ref,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    volume,
    toggle,
    seek,
    changeVolume,
    srcLabel: mediaType === "audio" ? "waveform" : "frame",
  };
}

export function formatFileMeta(size: number, type?: string) {
  return `${formatBytes(size)}${type ? ` · ${type}` : ""}`;
}
