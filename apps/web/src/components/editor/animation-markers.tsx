"use client";

import { useState, useEffect } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { TIMELINE_CONSTANTS, getTrackHeight, getCumulativeHeightBefore } from "@/constants/timeline-constants";
import { TextElement } from "@/types/timeline";
import { toast } from "sonner";

interface AnimationMarkersProps {
  zoomLevel: number;
  dynamicTimelineWidth: number;
  tracks: any[];
}

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

  const deleteAnimation = () => {
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
        deleteAnimation();
      }
    };

    if (isHovered) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovered]);

  return (
    <div
      key={`${track.id}-${element.id}-animation`}
      className="pointer-events-auto" // Make this interactive
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animation start marker */}
      <div
        className={`absolute bg-blue-500 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-80'
        }`}
        style={{
          left: `${markerLeft}px`,
          top: `${trackTop}px`,
          width: '2px',
          height: `${trackHeight}px`,
          boxShadow: isHovered 
            ? '0 0 8px rgba(59, 130, 246, 0.8)'
            : '0 0 4px rgba(59, 130, 246, 0.6)'
        }}
        title={`${element.animation?.type} animation starts at ${animationStartTime.toFixed(1)}s${isHovered ? ' - Press Delete to remove' : ''}`}
      />
      
      {/* Animation duration bar */}
      <div
        className={`absolute bg-blue-500 transition-opacity duration-200 ${
          isHovered ? 'opacity-50' : 'opacity-30'
        }`}
        style={{
          left: `${markerLeft}px`,
          top: `${trackTop + trackHeight - 5}px`,
          width: `${Math.max(markerWidth, 4)}px`,
          height: '3px',
        }}
        title={`${element.animation?.type} animation duration: ${element.animation?.duration}s${isHovered ? ' - Press Delete to remove' : ''}`}
      />
      
      {/* Animation type label */}
      <div
        className={`absolute bg-blue-500 text-white text-xs px-1 py-0.5 rounded font-medium whitespace-nowrap transition-all duration-200 ${
          isHovered ? 'bg-blue-600 shadow-lg' : ''
        }`}
        style={{
          left: `${markerLeft + 4}px`,
          top: `${trackTop + 2}px`,
          fontSize: '10px',
          lineHeight: '1',
        }}
        title={`Animation: ${element.animation?.type} (${element.animation?.duration}s)${isHovered ? ' - Press Delete to remove' : ''}`}
      >
        {element.animation?.type}
        {isHovered && (
          <span className="ml-1 text-red-200">×</span>
        )}
      </div>
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

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {textElementsWithAnimations.map(({ track, element }) => {
        // Use real-time position during drag, otherwise use stored position
        const isBeingDragged = dragState.elementId === element.id && dragState.isDragging;
        const elementStartTime = isBeingDragged ? dragState.currentTime : element.startTime;
        
        const animationStartTime = elementStartTime + (element.animation?.delay || 0);
        const animationEndTime = animationStartTime + (element.animation?.duration || 0.8);
        
        const markerLeft = animationStartTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        const markerWidth = (element.animation?.duration || 0.8) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        
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
