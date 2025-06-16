"use client";

import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface Firefly {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  angleChange: number;
  brightness: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface FirefliesEffectProps {
  opacity?: number;
  speed?: number;
  className?: string;
  forceEnable?: boolean;
  fireflyCount?: number;
}

export function FirefliesEffect({
  opacity = 0.3,
  speed = 1,
  className,
  forceEnable = false,
  fireflyCount = 100,
}: FirefliesEffectProps) {
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
  const pausedFirefliesStateRef = useRef<Firefly[]>([]);
  const firefliesRef = useRef<Firefly[]>([]);
  
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
    const adjustedFireflyCount = Math.floor(fireflyCount * qualityMultiplier);
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

    const initFireflies = () => {
      const fireflies: Firefly[] = [];
      for (let i = 0; i < adjustedFireflyCount; i++) {
        fireflies.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speed: (Math.random() * 0.5 + 0.5) * adjustedSpeed,
          angle: Math.random() * Math.PI * 2,
          angleChange: (Math.random() * 0.1 - 0.05) * adjustedSpeed,
          brightness: Math.random() * 0.5 + 0.5,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
      firefliesRef.current = fireflies;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.scale(dpr, dpr);

      // Only initialize fireflies if they don't exist yet
      if (firefliesRef.current.length === 0) {
        initFireflies();
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
          // Save current fireflies state
          pausedFirefliesStateRef.current = JSON.parse(JSON.stringify(firefliesRef.current));
        }
        
        if (!staticFrameRenderedRef.current) {
          const rgb = hexToRgb(accentColor.value);
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Use paused time for consistent static frame
          const pausedEffectiveTime = pausedTimeRef.current;
          
          // Render static fireflies
          const renderFireflies = pausedFirefliesStateRef.current.length > 0 
            ? pausedFirefliesStateRef.current 
            : firefliesRef.current;
            
          for (const firefly of renderFireflies) {
            const pulse = 0.5 + 0.5 * Math.sin(firefly.pulsePhase + pausedEffectiveTime * 0.001);
            const fireflyOpacity = firefly.brightness * opacity * pulse;
            
            // Draw glow
            const gradient = context.createRadialGradient(
              firefly.x, firefly.y, 0,
              firefly.x, firefly.y, firefly.size * 4
            );
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fireflyOpacity})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            
            context.beginPath();
            context.arc(firefly.x, firefly.y, firefly.size * 4, 0, Math.PI * 2);
            context.fillStyle = gradient;
            context.fill();
            
            // Draw core
            context.beginPath();
            context.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
            context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fireflyOpacity * 1.5})`;
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
        
        // Restore fireflies state if we have a saved state
        if (pausedFirefliesStateRef.current.length > 0) {
          firefliesRef.current = JSON.parse(JSON.stringify(pausedFirefliesStateRef.current));
          // Clear the paused state since we've restored it
          pausedFirefliesStateRef.current = [];
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

      // Update and render fireflies
      for (const firefly of firefliesRef.current) {
        // Update firefly position
        firefly.angle += firefly.angleChange;
        firefly.x += Math.cos(firefly.angle) * firefly.speed;
        firefly.y += Math.sin(firefly.angle) * firefly.speed;
        
        // Update pulse phase
        firefly.pulsePhase += firefly.pulseSpeed;
        
        // Bounce off edges
        const margin = firefly.size * 4;
        if (firefly.x < margin) {
          firefly.x = margin;
          firefly.angle = Math.PI - firefly.angle;
        } else if (firefly.x > canvas.width - margin) {
          firefly.x = canvas.width - margin;
          firefly.angle = Math.PI - firefly.angle;
        }
        
        if (firefly.y < margin) {
          firefly.y = margin;
          firefly.angle = -firefly.angle;
        } else if (firefly.y > canvas.height - margin) {
          firefly.y = canvas.height - margin;
          firefly.angle = -firefly.angle;
        }
        
        // Calculate pulse effect
        const pulse = 0.5 + 0.5 * Math.sin(firefly.pulsePhase);
        const fireflyOpacity = firefly.brightness * opacity * pulse;
        
        // Draw glow
        const gradient = context.createRadialGradient(
          firefly.x, firefly.y, 0,
          firefly.x, firefly.y, firefly.size * 4
        );
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fireflyOpacity})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        context.beginPath();
        context.arc(firefly.x, firefly.y, firefly.size * 4, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.fill();
        
        // Draw core
        context.beginPath();
        context.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fireflyOpacity * 1.5})`;
        context.fill();
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
    fireflyCount,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full rounded-xl", className)}
    />
  );
}