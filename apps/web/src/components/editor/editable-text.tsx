"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { FONT_CLASS_MAP } from "@/lib/font-config";
import { cn } from "@/lib/utils";
import { TextAlignmentToolbar } from "./text-alignment-toolbar";

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
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [initialWidth, setInitialWidth] = useState(element.maxWidth || 'auto');
  const [showAlignmentToolbar, setShowAlignmentToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  
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
        
        // Position alignment toolbar at the bottom center of the canvas
        const currentPreviewRef = externalPreviewRef || previewRef;
        if (currentPreviewRef?.current) {
          const canvasRect = currentPreviewRef.current.getBoundingClientRect();
          const centerX = canvasRect.left + canvasRect.width / 2;
          const bottomY = canvasRect.bottom - 15; // 15px from bottom of canvas
          setToolbarPosition({ x: centerX, y: bottomY });
          setShowAlignmentToolbar(true);
        }
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

  // Handle width adjustment (left and right handles)
  const handleWidthMouseDown = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizingWidth(true);
    
    // Get the current actual rendered width of the text
    const textRect = gsapRef.current?.getBoundingClientRect();
    const currentRenderedWidth = textRect?.width || 300;
    
    // Use current maxWidth or rendered width as starting point
    const initialWidthPx = element.maxWidth || currentRenderedWidth;
    setInitialWidth(initialWidthPx);
    
    const startX = e.clientX;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      let newWidth: number;
      
      if (side === 'right') {
        // Right drag: expand width (no upper limit for CapCut-like behavior)
        newWidth = initialWidthPx + deltaX;
      } else {
        // Left drag: contract width
        newWidth = initialWidthPx - deltaX;
      }
      
      // Only set minimum width limit (no maximum for unlimited expansion)
      newWidth = Math.max(50, newWidth);
      
      // Always set maxWidth when dragging (this enables text wrapping)
      updateTextElement(track.id, element.id, { maxWidth: newWidth });
    };
    
    const handleMouseUp = () => {
      setIsResizingWidth(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element.maxWidth, track.id, element.id, updateTextElement]);

  // Click outside to deselect and hide toolbar when not selected
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        // Check if the click was on the alignment toolbar
        const target = e.target as Element;
        const isToolbarClick = target.closest('[data-alignment-toolbar]');
        
        if (!isToolbarClick) {
          setIsSelected(false);
          setShowAlignmentToolbar(false);
        }
      }
    };
    
    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);
  
  // Hide alignment toolbar when element is deselected
  useEffect(() => {
    if (!isSelected) {
      setShowAlignmentToolbar(false);
    }
  }, [isSelected]);

  // Handle text editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  const handleTextSave = () => {
    updateTextElement(track.id, element.id, { content: editContent });
    setIsEditing(false);
  };

  // Handle alignment change
  const handleAlignmentChange = (alignment: "left" | "center" | "right") => {
    updateTextElement(track.id, element.id, { textAlign: alignment });
  };

  // Handle toolbar position change
  const handleToolbarPositionChange = (newPosition: { x: number; y: number }) => {
    setToolbarPosition(newPosition);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter creates new line (Shift+Enter also creates new line)
    if (e.key === 'Enter') {
      // Allow default behavior for Enter to create new lines
      // Do NOT prevent default
      return;
    }
    // Ctrl/Cmd + Enter saves and exits
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTextSave();
    }
    if (e.key === 'Escape') {
      setEditContent(element.content);
      setIsEditing(false);
    }
  };
  // Auto-resize textarea and copy styles from display element when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current && gsapRef.current) {
      const textarea = textareaRef.current;
      const displayElement = gsapRef.current;

      // Wait for next frame to ensure textarea is rendered
      requestAnimationFrame(() => {
        // Apply styles to textarea first
        const computedStyles = window.getComputedStyle(displayElement);
        const textStyle = {
          fontSize: computedStyles.fontSize,
          fontFamily: computedStyles.fontFamily,
          fontWeight: computedStyles.fontWeight,
          fontStyle: computedStyles.fontStyle,
          lineHeight: computedStyles.lineHeight,
          letterSpacing: computedStyles.letterSpacing,
          textAlign: computedStyles.textAlign,
          padding: computedStyles.padding,
          width: computedStyles.width,
          maxWidth: computedStyles.maxWidth,
          wordWrap: computedStyles.wordWrap,
          whiteSpace: computedStyles.whiteSpace,
          boxSizing: 'border-box' as const,
        };

        Object.assign(textarea.style, textStyle);

        // Wait for font loading before measuring
        document.fonts.ready.then(() => {
          // Create a temporary div for accurate measurement with all constraints
          const measureDiv = document.createElement('div');
          Object.assign(measureDiv.style, textStyle, {
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            visibility: 'hidden',
            height: 'auto',
            minHeight: '0px',
            overflow: 'visible',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          });

          measureDiv.textContent = textarea.value || ' '; // Ensure at least one character for measurement
          document.body.appendChild(measureDiv);

          // Force layout and measure
          measureDiv.offsetHeight; // Trigger layout
          const contentHeight = measureDiv.scrollHeight;
          
          document.body.removeChild(measureDiv);
          
          // Set textarea height with buffer and ensure minimum height
          const minHeight = 40;
          const finalHeight = Math.max(contentHeight + 10, minHeight); // Increased buffer
          textarea.style.height = `${finalHeight}px`;
          textarea.style.minHeight = `${finalHeight}px`;

          // Focus and set cursor position
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          
          console.log('📏 Textarea height calculation:', {
            originalContent: element.content,
            textareaValue: textarea.value,
            contentHeight,
            finalHeight,
            displayElementHeight: displayElement.offsetHeight
          });
        });
      });
    }
  }, [isEditing]); // Remove editContent from dependencies to prevent re-calculation during typing
  
  // Auto-resize textarea on content change while maintaining display consistency
  const handleTextChangeWithResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    
    // Auto-resize to fit content while maintaining minimum height from display element
    const textarea = e.target;
    const displayElement = gsapRef.current;
    const minHeight = displayElement ? parseInt(window.getComputedStyle(displayElement).height) : 40;
    
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Force reflow
    textarea.offsetHeight;
    
    // Set height to accommodate all content
    const contentHeight = textarea.scrollHeight;
    const requiredHeight = Math.max(contentHeight, minHeight, 40);
    textarea.style.height = `${requiredHeight}px`;
  };

  // GSAP animation functions with improved smoothness
  const playAnimation = useCallback((animation: string) => {
    if (!gsapRef.current || isAnimating) return;
    
    // Get dynamic duration from animation config, fallback to default values
    const animationDuration = element.animation?.duration || 0.8;
    
    setIsAnimating(true);
    const tl = gsap.timeline({
      onComplete: () => {
        // Handle animation category-specific completion behavior
        const animationType = element.animation?.type;
        if (animationType) {
          // "in" animations should remain visible after completion
          // "out" animations should hide or fade the element
          // "loop" animations should repeat
          if (isOutAnimation(animationType)) {
            // For out animations, keep the final state
            gsapRef.current!.style.opacity = '0';
          }
        }
        setIsAnimating(false);
        setCurrentGSAPTimeline(null);
      }
    });
    
    // Store the timeline reference for pause/resume control
    setCurrentGSAPTimeline(tl);

    // Reset only transform-related properties to preserve text styling
    gsap.set(gsapRef.current, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      opacity: 1,
      transformOrigin: "center center"
    });
    
    switch (animation) {
      case 'fadeIn':
        tl.fromTo(gsapRef.current, 
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: animationDuration, ease: "power2.out" }
        );
        break;
      case 'slideIn':
        tl.fromTo(gsapRef.current,
          { x: -80, opacity: 0 },
          { x: 0, opacity: 1, duration: animationDuration, ease: "power3.out" }
        );
        break;
      case 'bounce':
        tl.fromTo(gsapRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: animationDuration, ease: "elastic.out(1, 0.5)" }
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
        
        // Calculate per-character timing based on total duration
        const charDelay = animationDuration / chars.length;
        
        // Animate each character appearing with proper timeline
        chars.forEach((char, i) => {
          tl.to(gsapRef.current!.children[i], {
            opacity: 1,
            duration: charDelay * 0.8, // Character appears for 80% of its allocated time
            ease: "power1.out"
          }, i * charDelay);
        });
        break;
      case 'glow':
        tl.to(gsapRef.current, {
          textShadow: "0 0 15px #fff, 0 0 25px #fff, 0 0 35px #fff",
          duration: animationDuration / 2,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1
        });
        break;
      case 'zoomIn':
        tl.fromTo(gsapRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: animationDuration, ease: "back.out(1.2)" }
        );
        break;
      case 'rotateIn':
        tl.fromTo(gsapRef.current,
          { rotation: -90, opacity: 0, transformOrigin: "center center" },
          { rotation: 0, opacity: 1, duration: animationDuration, ease: "power2.out" }
        );
        break;
        
      // EXIT ANIMATIONS
      case 'fadeOut':
        tl.to(gsapRef.current, {
          opacity: 0,
          scale: 0.9,
          duration: animationDuration,
          ease: "power2.in"
        });
        break;
      case 'slideOut':
        tl.to(gsapRef.current, {
          x: 80,
          opacity: 0,
          duration: animationDuration,
          ease: "power3.in"
        });
        break;
      case 'bounceOut':
        tl.to(gsapRef.current, {
          y: -30,
          opacity: 0,
          duration: animationDuration,
          ease: "elastic.in(1, 0.5)"
        });
        break;
      case 'zoomOut':
        tl.to(gsapRef.current, {
          scale: 0.5,
          opacity: 0,
          duration: animationDuration,
          ease: "back.in(1.2)"
        });
        break;
      case 'rotateOut':
        tl.to(gsapRef.current, {
          rotation: 90,
          opacity: 0,
          duration: animationDuration,
          ease: "power2.in",
          transformOrigin: "center center"
        });
        break;
        
      // LOOP ANIMATIONS
      case 'pulse':
        tl.to(gsapRef.current, {
          scale: 1.05,
          duration: animationDuration,
          ease: "power2.inOut",
          yoyo: true,
          repeat: -1
        });
        break;
      case 'wobble':
        // Store the current transform to maintain it during wobble
        // Calculate individual step duration based on total animation duration
        const wobbleStepDuration = animationDuration / 5; // 5 steps in wobble animation
        const currentTransform = gsap.getProperty(gsapRef.current, "transform");
        tl.to(gsapRef.current, {
          rotation: "+=3", // Relative rotation to preserve existing rotation
          duration: wobbleStepDuration,
          ease: "power2.inOut"
        })
        .to(gsapRef.current, {
          rotation: "-=6", // Relative rotation
          duration: wobbleStepDuration,
          ease: "power2.inOut"
        })
        .to(gsapRef.current, {
          rotation: "+=6",
          duration: wobbleStepDuration,
          ease: "power2.inOut"
        })
        .to(gsapRef.current, {
          rotation: "-=6",
          duration: wobbleStepDuration,
          ease: "power2.inOut"
        })
        .to(gsapRef.current, {
          rotation: "+=3", // Return to starting position
          duration: wobbleStepDuration,
          ease: "power2.inOut"
        });
        break;
      case 'float':
        tl.to(gsapRef.current, {
          y: "-=10", // Relative movement to preserve existing position
          duration: animationDuration,
          ease: "power2.inOut",
          yoyo: true,
          repeat: -1
        });
        break;
      case 'shake':
        tl.to(gsapRef.current, {
          x: "+=2", // Relative movement to preserve existing position
          duration: animationDuration / 6, // 6 total movements (5 repeats + 1 original)
          ease: "power2.inOut",
          yoyo: true,
          repeat: 5
        });
        break;
      case 'splitText':
        // Import motion functions dynamically since they're not in GSAP
        import('motion').then(async ({ animate, stagger }) => {
          const { splitText } = await import('motion-plus');
          
          // Hide the container initially
          gsapRef.current!.style.visibility = 'hidden';
          
          // Wait for fonts to be ready
          document.fonts.ready.then(() => {
            if (!gsapRef.current) return;
            
            // Show the container
            gsapRef.current.style.visibility = 'visible';
            
            // Split the text into words
            const { words } = splitText(gsapRef.current);
            
            // Animate the words with spring animation and store the animation reference
            const motionAnimation = animate(
              words,
              { opacity: [0, 1], y: [10, 0] },
              {
                type: "spring",
                duration: animationDuration,
                bounce: 0,
                delay: stagger(0.05),
                onComplete: () => {
                  setIsAnimating(false);
                  setCurrentMotionAnimation(null);
                }
              }
            );
            
            // Store the motion animation reference for pause/resume control
            setCurrentMotionAnimation(motionAnimation);
          });
        }).catch(error => {
          console.error('Failed to load motion libraries for splitText animation:', error);
          // Fallback to simple fade in if motion libraries fail
          tl.fromTo(gsapRef.current, 
            { opacity: 0 },
            { opacity: 1, duration: animationDuration, ease: "power2.out" }
          );
        });
        break;
    }
  }, [element.content, isAnimating, element.animation?.duration]);

  // Helper function to determine animation category
  const isInAnimation = (animationType: string): boolean => {
    return ['fadeIn', 'slideIn', 'bounce', 'zoomIn', 'rotateIn', 'typewriter', 'glow', 'splitText'].includes(animationType);
  };

  const isOutAnimation = (animationType: string): boolean => {
    return ['fadeOut', 'slideOut', 'bounceOut', 'zoomOut', 'rotateOut'].includes(animationType);
  };

  const isLoopAnimation = (animationType: string): boolean => {
    return ['pulse', 'wobble', 'float', 'shake'].includes(animationType);
  };

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
  const [currentMotionAnimation, setCurrentMotionAnimation] = useState<any>(null);

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

  // Control GSAP timeline and Motion animations pause/resume based on playback state
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
    
    // Control Motion animations (splitText)
    if (currentMotionAnimation) {
      if (isPlaying) {
        console.log(`▶️ Resuming Motion animation for element ${element.id}`);
        // Motion animations don't have built-in pause/resume, but we can use play/pause methods if available
        if (typeof currentMotionAnimation.play === 'function') {
          currentMotionAnimation.play();
        }
      } else {
        console.log(`⏸️ Pausing Motion animation for element ${element.id}`);
        if (typeof currentMotionAnimation.pause === 'function') {
          currentMotionAnimation.pause();
        } else if (typeof currentMotionAnimation.stop === 'function') {
          // If pause is not available, stop the animation
          currentMotionAnimation.stop();
        }
      }
    }
  }, [isPlaying, currentGSAPTimeline, currentMotionAnimation, element.id]);

  // Synchronize animations with timeline playback - trigger every time playback crosses animation marker
  useEffect(() => {
    // Only trigger automatic animations if the element has an animation property
    if (!element.animation) return;

    const handlePlaybackUpdate = (event: CustomEvent) => {
      const { time: currentTime } = event.detail;
      
      // Calculate element's effective start and end times
      const elementStart = element.startTime;
      const elementEnd = element.startTime + (element.duration - element.trimStart - element.trimEnd);
      
      const animationType = element.animation?.type;
      
      // Calculate animation trigger times based on category
      let animationTriggerTime: number;
      
      if (animationType && isInAnimation(animationType)) {
        // "In" animations trigger at the start of the element
        animationTriggerTime = elementStart + (element.animation?.delay || 0);
      } else if (animationType && isOutAnimation(animationType)) {
        // "Out" animations trigger near the end of the element
        const animationDuration = element.animation?.duration || 0.8;
        animationTriggerTime = elementEnd - animationDuration - (element.animation?.delay || 0);
      } else if (animationType && isLoopAnimation(animationType)) {
        // "Loop" animations trigger after "in" animations would complete
        const inAnimationBuffer = 1.0; // Allow time for entrance animations
        animationTriggerTime = elementStart + inAnimationBuffer + (element.animation?.delay || 0);
      } else {
        // Default behavior (treat as "in" animation)
        animationTriggerTime = elementStart + (element.animation?.delay || 0);
      }
      
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
        console.log(`🎬 ${animationType} animation triggered for element ${element.id} at time ${currentTime.toFixed(2)}s (trigger: ${animationTriggerTime.toFixed(2)}s)`);
        if (element.animation?.type) {
          playAnimation(element.animation.type);
        }
      }
    };

    const handlePlaybackSeek = (event: CustomEvent) => {
      const { time: currentTime } = event.detail;
      const elementStart = element.startTime;
      const elementEnd = element.startTime + (element.duration - element.trimStart - element.trimEnd);
      
      const animationType = element.animation?.type;
      
      // Calculate animation trigger time based on category
      let animationTriggerTime: number;
      
      if (animationType && isInAnimation(animationType)) {
        animationTriggerTime = elementStart + (element.animation?.delay || 0);
      } else if (animationType && isOutAnimation(animationType)) {
        const animationDuration = element.animation?.duration || 0.8;
        animationTriggerTime = elementEnd - animationDuration - (element.animation?.delay || 0);
      } else if (animationType && isLoopAnimation(animationType)) {
        const inAnimationBuffer = 1.0;
        animationTriggerTime = elementStart + inAnimationBuffer + (element.animation?.delay || 0);
      } else {
        animationTriggerTime = elementStart + (element.animation?.delay || 0);
      }
      
      // Reset animation state when seeking
      setIsAnimating(false);
      
      // Stop any current GSAP timeline
      if (currentGSAPTimeline) {
        currentGSAPTimeline.kill();
        setCurrentGSAPTimeline(null);
      }
      
      // Stop any current Motion animation
      if (currentMotionAnimation) {
        if (typeof currentMotionAnimation.stop === 'function') {
          currentMotionAnimation.stop();
        } else if (typeof currentMotionAnimation.pause === 'function') {
          currentMotionAnimation.pause();
        }
        setCurrentMotionAnimation(null);
      }
      
      // Reset element to default state (preserve text styling)
      if (gsapRef.current) {
        gsap.set(gsapRef.current, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          transformOrigin: "center center",
          textShadow: element.textShadow || "none"
        });
        // Restore original content for typewriter animations
        if (gsapRef.current.innerHTML !== element.content) {
          gsapRef.current.innerHTML = element.content;
        }
      }
      
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
              onChange={handleTextChangeWithResize}
              onKeyDown={handleKeyDown}
              onBlur={handleTextSave}
              className={cn(
                "bg-transparent border-none resize-none",
                fontClassName
              )}
              style={{
                // Base styling - these will be overridden by computed styles in useEffect
                fontSize: `${element.fontSize}px`,
                color: element.color,
                backgroundColor: element.backgroundColor || 'transparent',
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
                whiteSpace: element.maxWidth ? "normal" : "nowrap",
                wordWrap: element.maxWidth ? "break-word" : "normal",
                maxWidth: element.maxWidth ? `${element.maxWidth}px` : undefined,
                width: element.maxWidth ? `${element.maxWidth}px` : 'auto',
                fontFamily: fontClassName === "" ? element.fontFamily : undefined,
                outline: 'none',
                border: 'none',
                margin: '0',
                boxSizing: 'border-box',
                caretColor: element.color === '#ffffff' || element.color === 'white' ? '#000000' : 
                           element.color === '#000000' || element.color === 'black' ? '#ffffff' : element.color,
              }}
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
                whiteSpace: element.maxWidth ? "pre-wrap" : "nowrap", // Use pre-wrap to preserve line breaks
                wordWrap: element.maxWidth ? "break-word" : "normal",
                maxWidth: element.maxWidth ? `${element.maxWidth}px` : undefined,
                width: element.maxWidth ? `${element.maxWidth}px` : "auto",
                fontFamily: fontClassName === "" ? element.fontFamily : undefined,
                overflow: "visible", // Ensure text doesn't get clipped
                minHeight: "auto", // Allow natural height
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
                  
                  {/* Width adjustment handles - Made larger */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 group/width-left pointer-events-auto">
                    <div
                      className="w-16 h-16 bg-orange-500 border-2 border-white rounded-full cursor-ew-resize hover:bg-orange-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={(e) => handleWidthMouseDown(e, 'left')}
                    >
                      <svg width="28" height="28" viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M4 6H8M4 6L6 4M4 6L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Width tooltip */}
                    <div className="absolute -top-12 -left-6 bg-black/90 text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover/width-left:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
                      Drag to adjust width
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                    </div>
                  </div>
                  
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 group/width-right pointer-events-auto">
                    <div
                      className="w-16 h-16 bg-orange-500 border-2 border-white rounded-full cursor-ew-resize hover:bg-orange-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={(e) => handleWidthMouseDown(e, 'right')}
                    >
                      <svg width="28" height="28" viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M8 6H4M8 6L6 4M8 6L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Width tooltip */}
                    <div className="absolute -top-12 -left-6 bg-black/90 text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover/width-right:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
                      Drag to adjust width
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                    </div>
                  </div>
                  
                  {/* Font size handle (bottom-right) - Made larger */}
                  <div className="absolute -bottom-4 -right-4 group/resize pointer-events-auto">
                    <div
                      className="w-10 h-10 bg-blue-500 border-2 border-white rounded-full cursor-move hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={handleFontSizeMouseDown}
                    >
                      <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="text-white">
                        <path d="M3 9V3h6v6M3 3l6 6M9 3v6M3 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Larger tooltip */}
                    <div className="absolute -top-12 -left-8 bg-black/90 text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover/resize:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
                      Drag outward to resize
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                    </div>
                  </div>
                  
                  {/* Rotation handle (top-right) - Made larger */}
                  <div className="absolute -top-12 right-0 group/rotate pointer-events-auto">
                    <div
                      className="w-10 h-10 bg-green-500 border-2 border-white rounded-full cursor-crosshair hover:bg-green-600 transition-colors flex items-center justify-center shadow-lg"
                      onMouseDown={handleRotationMouseDown}
                    >
                      <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="text-white">
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
        
        {/* Text Alignment Toolbar */}
        <AnimatePresence>
          {showAlignmentToolbar && isSelected && (
            <div data-alignment-toolbar>
              <TextAlignmentToolbar
                currentAlignment={element.textAlign}
                onAlignmentChange={handleAlignmentChange}
                position={toolbarPosition}
                onPositionChange={handleToolbarPositionChange}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
