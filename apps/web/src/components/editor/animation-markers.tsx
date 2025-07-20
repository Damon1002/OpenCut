"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { TIMELINE_CONSTANTS, getTrackHeight, getCumulativeHeightBefore } from "@/constants/timeline-constants";
import { TextElement } from "@/types/timeline";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useDebounce } from "@/hooks/use-debounce";

interface AnimationMarkersProps {
  zoomLevel: number;
  dynamicTimelineWidth: number;
  tracks: any[];
}

// Helper functions (defined outside components for reuse)
const isInAnimation = (animationType: string): boolean => {
  return ['fadeIn', 'slideIn', 'bounce', 'zoomIn', 'rotateIn', 'typewriter', 'glow'].includes(animationType);
};

const isOutAnimation = (animationType: string): boolean => {
  return ['fadeOut', 'slideOut', 'bounceOut', 'zoomOut', 'rotateOut'].includes(animationType);
};

const isLoopAnimation = (animationType: string): boolean => {
  return ['pulse', 'wobble', 'float', 'shake'].includes(animationType);
};

function AnimationMarker({
  track,
  element,
  zoomLevel,
  markerLeft,
  markerWidth,
  trackTop,
  trackHeight,
  animationStartTime,
}: {
  track: any;
  element: TextElement;
  zoomLevel: number;
  markerLeft: number;
  markerWidth: number;
  trackTop: number;
  trackHeight: number;
  animationStartTime: number;
}) {
  const { updateTextElement } = useTimelineStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  
  // Local state for smooth slider interaction
  const [localSpeed, setLocalSpeed] = useState(() => {
    if (!element.animation) return 1.0;
    const baseDuration = 0.8;
    const currentDuration = element.animation.duration || baseDuration;
    return baseDuration / currentDuration;
  });
  
  // Debounced value for actual updates
  const debouncedSpeed = useDebounce(localSpeed, 100); // 100ms debounce
  
  // Update local state when element animation duration changes externally
  useEffect(() => {
    if (element.animation) {
      const baseDuration = 0.8;
      const currentDuration = element.animation.duration || baseDuration;
      const actualSpeed = baseDuration / currentDuration;
      
      // Only update local state if it's significantly different (avoid feedback loops)
      if (Math.abs(actualSpeed - localSpeed) > 0.05) {
        setLocalSpeed(actualSpeed);
      }
    }
  }, [element.animation?.duration]);
  
  // Apply debounced speed changes to the actual animation
  useEffect(() => {
    if (debouncedSpeed && element.animation && Math.abs(debouncedSpeed - getCurrentSpeed()) > 0.05) {
      adjustAnimationSpeed(debouncedSpeed);
    }
  }, [debouncedSpeed]);

  const deleteAnimation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateTextElement(track.id, element.id, {
      animation: undefined
    });
    toast.success(`Removed ${element.animation?.type} animation`);
  };

  const handleMarkerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSpeedControls(!showSpeedControls);
  };

  const adjustAnimationSpeed = (speedMultiplier: number) => {
    if (!element.animation) return;
    
    const newDuration = (element.animation.duration || 0.8) / speedMultiplier;
    updateTextElement(track.id, element.id, {
      animation: {
        ...element.animation,
        duration: Math.max(0.1, Math.min(5.0, newDuration)) // Clamp between 0.1s and 5s
      }
    });
    toast.success(`Animation speed adjusted (${speedMultiplier.toFixed(1)}x)`);
  };

  // Get current speed multiplier from duration
  const getCurrentSpeed = () => {
    if (!element.animation) return 1.0;
    const baseDuration = 0.8; // Default duration
    const currentDuration = element.animation.duration || baseDuration;
    return baseDuration / currentDuration; // Speed is inverse of duration ratio
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (!isLoopAnimation(element.animation!.type)) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const startX = e.clientX;
    const initialDelay = element.animation?.delay || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const timeDelta = deltaX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
      const newDelay = Math.max(0, initialDelay + timeDelta);
      
      updateTextElement(track.id, element.id, {
        animation: {
          ...element.animation!,
          delay: newDelay
        }
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      toast.success('Loop animation timing adjusted');
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const deleteAnimationByKeyboard = () => {
    updateTextElement(track.id, element.id, {
      animation: undefined
    });
    toast.success(`Removed ${element.animation?.type} animation`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHovered && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        e.stopPropagation();
        deleteAnimationByKeyboard();
      }
    };

    if (isHovered) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovered]);

  // Close speed controls when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSpeedControls) {
        const target = event.target as HTMLElement;
        // Check if click is outside the animation marker container
        const markerContainer = document.querySelector(`[data-marker-id="${track.id}-${element.id}"]`);
        if (markerContainer && !markerContainer.contains(target)) {
          setShowSpeedControls(false);
        }
      }
    };

    if (showSpeedControls) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showSpeedControls, track.id, element.id]);

  return (
    <div
      key={`${track.id}-${element.id}-animation`}
      className="pointer-events-auto relative" // Make this interactive
      data-marker-id={`${track.id}-${element.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animation start marker */}
      <div
        className={`absolute transition-all duration-200 ${
          isDragging ? 'bg-green-500' : 'bg-blue-500'
        } ${
          isHovered ? 'opacity-100' : 'opacity-80'
        }`}
        style={{
          left: `${markerLeft}px`,
          top: `${trackTop}px`,
          width: '2px',
          height: `${trackHeight}px`,
          boxShadow: isHovered 
            ? '0 0 8px rgba(59, 130, 246, 0.8)'
            : '0 0 4px rgba(59, 130, 246, 0.6)',
          cursor: isLoopAnimation(element.animation!.type) ? 'grab' : 'pointer'
        }}
        title={`${element.animation?.type} animation (${isInAnimation(element.animation!.type) ? 'entrance' : isOutAnimation(element.animation!.type) ? 'exit' : 'loop'}) starts at ${animationStartTime.toFixed(1)}s${isHovered ? ' - Press Delete to remove' : ''}${isLoopAnimation(element.animation!.type) ? ' - Drag to adjust timing' : ''}`}
        onMouseDown={isLoopAnimation(element.animation!.type) ? handleDragStart : undefined}
      />
      
      {/* Animation duration bar */}
      <div
        className={`absolute transition-all duration-200 ${
          isDragging ? 'bg-green-500' : 'bg-blue-500'
        } ${
          isHovered ? 'opacity-50' : 'opacity-30'
        }`}
        style={{
          left: `${markerLeft}px`,
          top: `${trackTop + trackHeight - 5}px`,
          width: `${Math.max(markerWidth, 4)}px`,
          height: '3px',
          cursor: isLoopAnimation(element.animation!.type) ? 'grab' : 'pointer'
        }}
        title={`${element.animation?.type} animation duration: ${element.animation?.duration}s${isHovered ? ' - Click for speed controls' : ''}${isLoopAnimation(element.animation!.type) ? ' - Drag to adjust timing' : ''}`}
        onClick={handleMarkerClick}
        onMouseDown={isLoopAnimation(element.animation!.type) ? handleDragStart : undefined}
      />
      
      {/* Animation type label */}
      <div
        className={`absolute text-white text-xs px-1 py-0.5 rounded font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1 ${
          isDragging ? 'bg-green-600' : 'bg-blue-500'
        } ${
          isHovered ? 'bg-blue-600 shadow-lg' : ''
        }`}
        style={{
          left: `${markerLeft + 4}px`,
          top: `${trackTop + 2}px`,
          fontSize: '10px',
          lineHeight: '1',
          cursor: isLoopAnimation(element.animation!.type) ? 'grab' : 'pointer'
        }}
        title={`Animation: ${element.animation?.type} (${element.animation?.duration}s)${isHovered ? ' - Click for options' : ''}${isLoopAnimation(element.animation!.type) ? ' - Drag to adjust timing' : ''}`}
        onClick={handleMarkerClick}
        onMouseDown={isLoopAnimation(element.animation!.type) ? handleDragStart : undefined}
      >
        <span>{element.animation?.type}</span>
        {isHovered && (
          <button
            className="ml-1 text-red-200 hover:text-red-100 hover:bg-red-500 rounded px-0.5 transition-colors"
            onClick={deleteAnimation}
            title="Remove animation"
            style={{ fontSize: '8px', lineHeight: '1' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Speed Control Panel */}
      {showSpeedControls && (
        <div
          className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg p-3 z-50"
          style={{
            left: `${markerLeft + 4}px`,
            top: `${trackTop + 20}px`,
            width: '160px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-white text-xs font-medium mb-2">Animation Speed</div>
          
          {/* Speed value display */}
          <div className="text-center text-white text-sm font-bold mb-2">
            {localSpeed.toFixed(1)}x
          </div>
          
          {/* Speed slider */}
          <div className="mb-3">
            <Slider
              value={[localSpeed]}
              min={0.2}
              max={3.0}
              step={0.1}
              onValueChange={([value]) => {
                setLocalSpeed(value);
              }}
              className="w-full"
            />
          </div>
          
          {/* Quick preset buttons */}
          <div className="flex justify-between gap-1 mb-2">
            <button
              className="text-white text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation();
                adjustAnimationSpeed(0.5);
              }}
            >
              0.5x
            </button>
            <button
              className="text-white text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation();
                adjustAnimationSpeed(1.0);
              }}
            >
              1.0x
            </button>
            <button
              className="text-white text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation();
                adjustAnimationSpeed(2.0);
              }}
            >
              2.0x
            </button>
          </div>
          
          <div className="text-gray-400 text-xs text-center">
            Duration: {((element.animation?.duration || 0.8)).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}

export function AnimationMarkers({ zoomLevel, dynamicTimelineWidth, tracks }: AnimationMarkersProps) {
  const { dragState } = useTimelineStore();
  
  const textElementsWithAnimations = tracks
    .filter(track => track.type === "text")
    .flatMap(track => 
      track.elements
        .filter((element: TextElement) => element.animation)
        .map((element: TextElement) => ({ track, element }))
    );

  if (textElementsWithAnimations.length === 0) return null;

  // Helper functions already defined above

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {textElementsWithAnimations.map(({ track, element }) => {
        // Use real-time position during drag, otherwise use stored position
        const isBeingDragged = dragState.elementId === element.id && dragState.isDragging;
        const elementStartTime = isBeingDragged ? dragState.currentTime : element.startTime;
        const elementEndTime = elementStartTime + (element.duration - element.trimStart - element.trimEnd);
        
        const animationType = element.animation!.type;
        
        // Calculate animation marker position based on category
        let animationStartTime: number;
        let animationEndTime: number;
        
        if (isInAnimation(animationType)) {
          // "In" animations start at element start
          animationStartTime = elementStartTime + (element.animation?.delay || 0);
          animationEndTime = animationStartTime + (element.animation?.duration || 0.8);
        } else if (isOutAnimation(animationType)) {
          // "Out" animations end at element end
          const animationDuration = element.animation?.duration || 0.8;
          animationEndTime = elementEndTime - (element.animation?.delay || 0);
          animationStartTime = animationEndTime - animationDuration;
        } else if (isLoopAnimation(animationType)) {
          // "Loop" animations start after entrance buffer and continue
          const inAnimationBuffer = 1.0;
          animationStartTime = elementStartTime + inAnimationBuffer + (element.animation?.delay || 0);
          animationEndTime = elementEndTime - 0.5; // Leave some buffer at end
        } else {
          // Default behavior
          animationStartTime = elementStartTime + (element.animation?.delay || 0);
          animationEndTime = animationStartTime + (element.animation?.duration || 0.8);
        }
        
        const markerLeft = animationStartTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        const markerWidth = (animationEndTime - animationStartTime) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        
        // Find track index for positioning using proper track height calculations
        const trackIndex = tracks.findIndex(t => t.id === track.id);
        const trackTop = getCumulativeHeightBefore(tracks, trackIndex);
        const trackHeight = getTrackHeight(track.type);
        
        return (
          <AnimationMarker
            key={`${track.id}-${element.id}-animation`}
            track={track}
            element={element}
            zoomLevel={zoomLevel}
            markerLeft={markerLeft}
            markerWidth={markerWidth}
            trackTop={trackTop}
            trackHeight={trackHeight}
            animationStartTime={animationStartTime}
          />
        );
      })}
    </div>
  );
}
