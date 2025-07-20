"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { FONT_CLASS_MAP } from "@/lib/font-config";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  element: TextElement;
  track: TimelineTrack;
  index: number;
  scaleRatio: number;
  canvasSize: { width: number; height: number };
  onPositionUpdate: (x: number, y: number) => void;
  previewRef?: React.RefObject<HTMLDivElement>;
}

export function EditableText({
  element,
  track,
  index,
  scaleRatio,
  canvasSize,
  onPositionUpdate,
  previewRef: externalPreviewRef,
}: EditableTextProps) {
  const { updateTextElement, selectElement } = useTimelineStore();
  const { isPlaying } = usePlaybackStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editContent, setEditContent] = useState(element.content);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [initialFontSize, setInitialFontSize] = useState(element.fontSize);
  const [initialRotation, setInitialRotation] = useState(element.rotation);
  
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<HTMLDivElement>(null);

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setEditContent(element.content);
  }, [element.content]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Store mouse down position to detect clicks vs drags
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    
    const elementRect = elementRef.current?.getBoundingClientRect();
    if (!elementRect) return;
    
    const offset = {
      x: e.clientX - (elementRect.left + elementRect.width / 2),
      y: e.clientY - (elementRect.top + elementRect.height / 2)
    };
    
    setDragOffset(offset);
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentPreviewRef = externalPreviewRef || previewRef;
      if (!currentPreviewRef.current) return;
      
      const rect = currentPreviewRef.current.getBoundingClientRect();
      const newX = ((e.clientX - offset.x - rect.left) / rect.width - 0.5) * canvasSize.width;
      const newY = ((e.clientY - offset.y - rect.top) / rect.height - 0.5) * canvasSize.height;
      
      const constrainedX = Math.max(
        -canvasSize.width / 2, 
        Math.min(canvasSize.width / 2, newX)
      );
      const constrainedY = Math.max(
        -canvasSize.height / 2, 
        Math.min(canvasSize.height / 2, newY)
      );
      
      onPositionUpdate(constrainedX, constrainedY);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, canvasSize, onPositionUpdate]);

  // Handle single click to select element
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this was a click (not a drag)
    if (mouseDownPos) {
      const deltaX = Math.abs(e.clientX - mouseDownPos.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.y);
      
      // If mouse didn't move much, it's a click
      if (deltaX < 5 && deltaY < 5) {
        // Select this text element in the timeline and show controls
        selectElement(track.id, element.id, false);
        setIsSelected(true);
      }
    }
    
    setMouseDownPos(null);
  }, [isEditing, mouseDownPos, selectElement, track.id, element.id]);

  // Handle font size adjustment (CapCut-style: drag outward from center = bigger)
  const handleFontSizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setInitialFontSize(element.fontSize);
    
    const elementRect = elementRef.current?.getBoundingClientRect();
    if (!elementRect) return;
    
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;
    const startDistance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    );
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );
      const distanceDelta = currentDistance - startDistance;
      const sizeDelta = distanceDelta * 0.3; // Sensitivity factor for CapCut-like feel
      const newSize = Math.max(8, Math.min(300, initialFontSize + sizeDelta));
      
      updateTextElement(track.id, element.id, { fontSize: Math.round(newSize) });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.fontSize, track.id, element.id, updateTextElement, initialFontSize]);

  // Handle rotation (cursor-based)
  const handleRotationMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsRotating(true);
    setInitialRotation(element.rotation);
    
    const elementRect = elementRef.current?.getBoundingClientRect();
    if (!elementRect) return;
    
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90; // Adjust for natural rotation
      
      updateTextElement(track.id, element.id, { rotation: Math.round(angle) });
    };
    
    const handleMouseUp = () => {
      setIsRotating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.rotation, track.id, element.id, updateTextElement]);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    
    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);

  // Handle text editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  const handleTextSave = () => {
    updateTextElement(track.id, element.id, { content: editContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSave();
    }
    if (e.key === 'Escape') {
      setEditContent(element.content);
      setIsEditing(false);
    }
  };

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // GSAP animation functions with improved smoothness
  const playAnimation = useCallback((animation: string) => {
    if (!gsapRef.current || isAnimating) return;
    
    setIsAnimating(true);
    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        setCurrentGSAPTimeline(null);
      }
    });
    
    // Store the timeline reference for pause/resume control
    setCurrentGSAPTimeline(tl);

    switch (animation) {
      case 'fadeIn':
        tl.fromTo(gsapRef.current, 
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
        );
        break;
      case 'slideIn':
        tl.fromTo(gsapRef.current,
          { x: -80, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
        );
        break;
      case 'bounce':
        tl.fromTo(gsapRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" }
        );
        break;
      case 'typewriter':
        const text = element.content;
        const chars = text.split('');
        
        // Immediately hide the original text and prepare spans
        gsapRef.current.style.opacity = '0';
        gsapRef.current.innerHTML = '';
        
        // Create spans for each character immediately (before timeline starts)
        chars.forEach((char, i) => {
          const span = document.createElement('span');
          span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space for better spacing
          span.style.opacity = '0';
          gsapRef.current!.appendChild(span);
        });
        
        // Make container visible again (spans are still invisible)
        gsapRef.current.style.opacity = '1';
        
        // Animate each character appearing with proper timeline
        chars.forEach((char, i) => {
          tl.to(gsapRef.current!.children[i], {
            opacity: 1,
            duration: 0.08,
            ease: "power1.out"
          }, i * 0.08);
        });
        break;
      case 'glow':
        tl.to(gsapRef.current, {
          textShadow: "0 0 15px #fff, 0 0 25px #fff, 0 0 35px #fff",
          duration: 0.5,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1
        });
        break;
      case 'zoomIn':
        tl.fromTo(gsapRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.2)" }
        );
        break;
      case 'rotateIn':
        tl.fromTo(gsapRef.current,
          { rotation: -90, opacity: 0, transformOrigin: "center center" },
          { rotation: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
        );
        break;
    }
  }, [element.content, isAnimating]);

  // Listen for animation trigger events and playback synchronization
  useEffect(() => {
    const handleAnimationTrigger = (event: CustomEvent) => {
      const { elementId, trackId, animation } = event.detail;
      
      // Only handle events for this specific element
      if (elementId === element.id && trackId === track.id) {
        playAnimation(animation);
      }
    };

    window.addEventListener('triggerTextAnimation', handleAnimationTrigger as EventListener);
    
    return () => {
      window.removeEventListener('triggerTextAnimation', handleAnimationTrigger as EventListener);
    };
  }, [element.id, track.id, playAnimation]);

  // Track animation state and timing for replay functionality
  const [lastPlaybackTime, setLastPlaybackTime] = useState(-1);
  const [animationTriggered, setAnimationTriggered] = useState(false);
  const [currentGSAPTimeline, setCurrentGSAPTimeline] = useState<gsap.core.Timeline | null>(null);

  // Reset animation state when animation type changes
  const [lastAnimationType, setLastAnimationType] = useState(element.animation?.type);
  useEffect(() => {
    const currentAnimationType = element.animation?.type;
    if (currentAnimationType !== lastAnimationType) {
      console.log(`🔄 Animation type changed from ${lastAnimationType} to ${currentAnimationType}, resetting animation state`);
      setAnimationTriggered(false);
      setIsAnimating(false);
      setLastAnimationType(currentAnimationType);
    }
  }, [element.animation?.type, lastAnimationType]);

  // Control GSAP timeline pause/resume based on playback state
  useEffect(() => {
    if (currentGSAPTimeline) {
      if (isPlaying) {
        console.log(`▶️ Resuming GSAP animation for element ${element.id}`);
        currentGSAPTimeline.resume();
      } else {
        console.log(`⏸️ Pausing GSAP animation for element ${element.id}`);
        currentGSAPTimeline.pause();
      }
    }
  }, [isPlaying, currentGSAPTimeline, element.id]);

  // Synchronize animations with timeline playback - trigger every time playback crosses animation marker
  useEffect(() => {
    // Only trigger automatic animations if the element has an animation property
    if (!element.animation) return;

    const handlePlaybackUpdate = (event: CustomEvent) => {
      const { time: currentTime } = event.detail;
      
      // Calculate element's effective start and end times
      const elementStart = element.startTime;
      const elementEnd = element.startTime + (element.duration - element.trimStart - element.trimEnd);
      
      // Calculate animation trigger time
      const animationTriggerTime = elementStart + (element.animation.delay || 0);
      
      // Check if we just crossed the animation trigger point
      const crossedTrigger = lastPlaybackTime < animationTriggerTime && currentTime >= animationTriggerTime;
      
      // Update last playback time
      setLastPlaybackTime(currentTime);
      
      // Trigger animation if:
      // 1. We just crossed the animation trigger time (forward playback)
      // 2. We're within the element's timeframe
      // 3. Timeline is playing
      // 4. Not already animating
      if (crossedTrigger &&
          currentTime >= elementStart &&
          currentTime < elementEnd &&
          isPlaying &&
          !isAnimating) {
        console.log(`🎬 Animation triggered for element ${element.id} at time ${currentTime.toFixed(2)}s (trigger: ${animationTriggerTime.toFixed(2)}s)`);
        playAnimation(element.animation.type);
      }
    };

    const handlePlaybackSeek = (event: CustomEvent) => {
      const { time: currentTime } = event.detail;
      const elementStart = element.startTime;
      const elementEnd = element.startTime + (element.duration - element.trimStart - element.trimEnd);
      const animationTriggerTime = elementStart + (element.animation.delay || 0);
      
      // Reset animation state when seeking
      setIsAnimating(false);
      
      // Update last playback time to current seek position
      setLastPlaybackTime(currentTime);
      
      // If we seek to a position past the animation trigger within the element, play animation immediately
      if (currentTime >= animationTriggerTime && 
          currentTime >= elementStart && 
          currentTime < elementEnd && 
          element.animation) {
        console.log(`🎬 Seek-triggering ${element.animation.type} animation for element ${element.id}`);
        setTimeout(() => playAnimation(element.animation!.type), 100); // Small delay to ensure state is reset
      }
    };

    // Listen to both playback update and seek events
    window.addEventListener('playback-update', handlePlaybackUpdate as EventListener);
    window.addEventListener('playback-seek', handlePlaybackSeek as EventListener);
    
    return () => {
      window.removeEventListener('playback-update', handlePlaybackUpdate as EventListener);
      window.removeEventListener('playback-seek', handlePlaybackSeek as EventListener);
    };
  }, [element.id, element.startTime, element.duration, element.trimStart, element.trimEnd, element.animation, playAnimation, isAnimating, lastPlaybackTime, isPlaying]);

  const fontClassName = FONT_CLASS_MAP[element.fontFamily as keyof typeof FONT_CLASS_MAP] || "";

  return (
    <>
      <div
        ref={elementRef}
        className={cn(
          "absolute flex items-center justify-center select-none group",
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          isEditing && 'cursor-text'
        )}
        style={{
          left: `${50 + (element.x / canvasSize.width) * 100}%`,
          top: `${50 + (element.y / canvasSize.height) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${scaleRatio})`,
          opacity: element.opacity,
          zIndex: 100 + index,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        {isEditing ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative"
          >
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={handleTextSave}
              className={cn(
                "bg-black/80 text-white border-2 border-blue-500 rounded-md px-2 py-1 resize-none overflow-hidden",
                fontClassName
              )}
              style={{
                fontSize: `${element.fontSize}px`,
                fontWeight: element.fontWeight,
                fontStyle: element.fontStyle,
                textDecoration: element.textDecoration,
                textAlign: element.textAlign,
                minWidth: '100px',
                fontFamily: fontClassName === "" ? element.fontFamily : undefined,
              }}
              rows={1}
              autoFocus
            />
          </motion.div>
        ) : (
          <div className="relative">
            <div
              ref={gsapRef}
              className={fontClassName}
              style={{
                fontSize: `${element.fontSize}px`,
                color: element.color,
                backgroundColor: element.backgroundColor,
                textAlign: element.textAlign,
                fontWeight: element.fontWeight,
                fontStyle: element.fontStyle,
                textDecoration: element.textDecoration,
                textShadow: element.textShadow,
                letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
                lineHeight: element.lineHeight || undefined,
                WebkitTextStroke: element.textStroke ? `${element.textStroke.width}px ${element.textStroke.color}` : undefined,
                padding: "4px 8px",
                borderRadius: "2px",
                whiteSpace: "nowrap",
                fontFamily: fontClassName === "" ? element.fontFamily : undefined,
              }}
              onMouseEnter={() => {
                console.log('🔍 Text element debug info:');
                console.log('📍 Element:', element);
                console.log('📍 textShadow value:', element.textShadow);
                console.log('📍 textShadow type:', typeof element.textShadow);
                console.log('📍 Full style object:', {
                  fontSize: `${element.fontSize}px`,
                  color: element.color,
                  backgroundColor: element.backgroundColor,
                  textAlign: element.textAlign,
                  fontWeight: element.fontWeight,
                  fontStyle: element.fontStyle,
                  textDecoration: element.textDecoration,
                  textShadow: element.textShadow,
                });
              }}
            >
              {element.content}
            </div>
            
            {/* Selection handles - only show when selected */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {/* Selection border - White border like CapCut */}
                  <div className="absolute inset-0 border-2 border-white rounded-md pointer-events-none shadow-lg" />
                  
                  {/* Font size handle (bottom-right) with larger tooltip */}
                  <div className="absolute -bottom-3 -right-3 group/resize pointer-events-auto">
                    <div
                      className="w-8 h-8 bg-blue-500 border-2 border-white rounded-full cursor-move hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={handleFontSizeMouseDown}
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M3 9V3h6v6M3 3l6 6M9 3v6M3 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Larger tooltip */}
                    <div className="absolute -top-12 -left-8 bg-black/90 text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover/resize:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
                      Drag outward to resize
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                    </div>
                  </div>
                  
                  {/* Rotation handle (top-right) with larger tooltip */}
                  <div className="absolute -top-10 right-0 group/rotate pointer-events-auto">
                    <div
                      className="w-8 h-8 bg-green-500 border-2 border-white rounded-full cursor-crosshair hover:bg-green-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={handleRotationMouseDown}
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M10 6a4 4 0 1 1-4-4V1l2 2-2 2V4a2 2 0 1 0 2 2h1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Larger tooltip */}
                    <div className="absolute -top-12 -left-6 bg-black/90 text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover/rotate:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
                      Drag to rotate
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                    </div>
                  </div>
                  
                  {/* Corner indicators - White to match border */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full pointer-events-none shadow-md" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full pointer-events-none shadow-md" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full pointer-events-none shadow-md" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
