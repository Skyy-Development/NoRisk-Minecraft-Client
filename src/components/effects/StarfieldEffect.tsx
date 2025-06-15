"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface StarfieldEffectProps {
  opacity?: number;
  speed?: number;
  className?: string;
  forceEnable?: boolean;
  starCount?: number;
}

export function StarfieldEffect({
  opacity = 0.3,
  speed = 1,
  className,
  forceEnable = false,
  starCount = 200,
}: StarfieldEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const staticBackground = useThemeStore((state) => state.staticBackground);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const { qualityLevel } = useQualitySettingsStore();
  const [isVisible, setIsVisible] = useState(true);
  const isWindowFocused = useWindowFocus();
  const isAnimating = forceEnable || !staticBackground;
  
  // Animation timing state management
  const pausedTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);
  const lastPauseStartRef = useRef<number>(0);
  const animationStartTimeRef = useRef<number>(0);
  const staticFrameRenderedRef = useRef<boolean>(false);
  const pausedStarsStateRef = useRef<Star[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  // Animation should only run if both window is focused AND background animations are enabled (or forced)
  const shouldAnimate = isWindowFocused && (forceEnable || isBackgroundAnimationEnabled);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(canvas);

    const qualityMultiplier =
      qualityLevel === "low" ? 0.3 : qualityLevel === "high" ? 0.8 : 0.5;
    const adjustedSpeed = speed * qualityMultiplier;
    const adjustedStarCount = Math.floor(starCount * qualityMultiplier);
    const targetFps =
      qualityLevel === "low" ? 20 : qualityLevel === "high" ? 30 : 24;
    const frameInterval = 1000 / targetFps;

    let effectiveTime = 0; // This will be our continuous animation time
    let lastFrameTime = 0;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const initStars = () => {
      const stars: Star[] = [];
      for (let i = 0; i < adjustedStarCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2 + 0.5,
          brightness: Math.random() * 0.5 + 0.5,
          speed: (Math.random() * 0.5 + 0.5) * adjustedSpeed,
          twinkleSpeed: Math.random() * 0.01 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.scale(dpr, dpr);

      // Only initialize stars if they don't exist yet
      if (starsRef.current.length === 0) {
        initStars();
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let animationFrameId: number;

    const draw = (timestamp: number) => {
      // Initialize animation start time on first run
      if (animationStartTimeRef.current === 0) {
        animationStartTimeRef.current = timestamp;
      }

      // Don't render if element is not visible
      if (!isVisible) {
        if (shouldAnimate) {
          animationFrameId = window.requestAnimationFrame(draw);
        }
        return;
      }
      
      // If animations are disabled, pause timing and render static frame
      if (!shouldAnimate) {
        // Record pause start time if not already paused
        if (lastPauseStartRef.current === 0) {
          lastPauseStartRef.current = timestamp;
          // Store current animation time when pausing
          const currentAnimationTime = timestamp - animationStartTimeRef.current - totalPausedDurationRef.current;
          pausedTimeRef.current = currentAnimationTime;
          // Save current stars state
          pausedStarsStateRef.current = JSON.parse(JSON.stringify(starsRef.current));
        }
        
        if (!staticFrameRenderedRef.current) {
          const rgb = hexToRgb(accentColor.value);
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Use paused time for consistent static frame
          const pausedEffectiveTime = pausedTimeRef.current;
          
          // Render static starfield
          const renderStars = pausedStarsStateRef.current.length > 0 ? pausedStarsStateRef.current : starsRef.current;
          for (const star of renderStars) {
            const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase + pausedEffectiveTime * 0.001);
            const starOpacity = star.brightness * opacity * twinkle;
            
            context.beginPath();
            context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${starOpacity})`;
            context.fill();
          }
          
          staticFrameRenderedRef.current = true;
        }
        return;
      }

      // Reset static frame flag and handle resume when animations are enabled again
      if (staticFrameRenderedRef.current) {
        staticFrameRenderedRef.current = false;
        
        // Calculate total paused duration and reset pause tracking
        if (lastPauseStartRef.current > 0) {
          const pauseDuration = timestamp - lastPauseStartRef.current;
          totalPausedDurationRef.current += pauseDuration;
          lastPauseStartRef.current = 0;
        }
        
        // Restore stars state if we have a saved state
        if (pausedStarsStateRef.current.length > 0) {
          starsRef.current = JSON.parse(JSON.stringify(pausedStarsStateRef.current));
          // Clear the paused state since we've restored it
          pausedStarsStateRef.current = [];
        }
      }

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationFrameId = window.requestAnimationFrame(draw);
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);

      // Calculate effective animation time (excluding paused periods)
      effectiveTime = timestamp - animationStartTimeRef.current - totalPausedDurationRef.current;

      const rgb = hexToRgb(accentColor.value);

      context.clearRect(0, 0, canvas.width, canvas.height);

      // Update and render stars
      for (const star of starsRef.current) {
        // Move stars
        star.z -= star.speed * adjustedSpeed;
        
        // Reset stars that move out of view
        if (star.z <= 0) {
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
          star.z = 1000;
          star.size = Math.random() * 2 + 0.5;
          star.brightness = Math.random() * 0.5 + 0.5;
          star.speed = (Math.random() * 0.5 + 0.5) * adjustedSpeed;
        }
        
        // Calculate star size based on z-position (perspective effect)
        const scale = 1000 / star.z;
        const projectedSize = star.size * scale;
        
        // Calculate twinkle effect
        star.twinklePhase += star.twinkleSpeed * adjustedSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        
        // Calculate star opacity
        const starOpacity = star.brightness * opacity * twinkle;
        
        // Draw star
        context.beginPath();
        context.arc(star.x, star.y, projectedSize, 0, Math.PI * 2);
        context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${starOpacity})`;
        context.fill();
        
        // Add glow effect for brighter stars
        if (projectedSize > 1) {
          context.beginPath();
          context.arc(star.x, star.y, projectedSize * 2, 0, Math.PI * 2);
          context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${starOpacity * 0.3})`;
          context.fill();
        }
      }

      // Only continue animation if should animate
      if (shouldAnimate) {
        animationFrameId = window.requestAnimationFrame(draw);
      }
    };

    // Initial draw call
    animationFrameId = window.requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    opacity,
    speed,
    accentColor.value,
    qualityLevel,
    isAnimating,
    staticBackground,
    shouldAnimate,
    isVisible,
    starCount,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full rounded-xl", className)}
    />
  );
}