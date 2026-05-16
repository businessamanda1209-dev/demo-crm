"use client";

import { useEffect, useRef } from "react";

export function GradientBackground() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the Craft gradient script after the div is in the DOM
    const existing = document.getElementById("craft-gradient-script");
    if (existing) {
      // Script already loaded — dispatch a re-scan if the library supports it
      (window as Window & { CraftGradient?: { init?: () => void } }).CraftGradient?.init?.();
      return;
    }
    const script = document.createElement("script");
    script.id = "craft-gradient-script";
    script.src = "https://craft-gradients.artcreativecode.com/embedded.js";
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  return (
    <div
      ref={divRef}
      data-craft-gradient="G4ZgdAhgzgIgomA7gMxgayRGEmxmAcywCswATARlh0oEsZ8yAma8kWAYzftKggBd4YfgFMAtgAd0YDgAUADMiVMA7ABoALBREA2CgA41FDk3na18gJzyIVoA"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
    />
  );
}
