"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
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
  const { updateTextElement } = useTimelineStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editContent, setEditContent] = useState(element.content);
  const [isAnimating, setIsAnimating] = useState(false);
  
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

  // GSAP animation functions
  const playAnimation = useCallback((animation: string) => {
    if (!gsapRef.current || isAnimating) return;
    
    setIsAnimating(true);
    const tl = gsap.timeline({
      onComplete: () => setIsAnimating(false)
    });

    switch (animation) {
      case 'fadeIn':
        tl.fromTo(gsapRef.current, 
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
        break;
      case 'slideIn':
        tl.fromTo(gsapRef.current,
          { x: -100, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
        );
        break;
      case 'bounce':
        tl.fromTo(gsapRef.current,
          { y: -50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "bounce.out" }
        );
        break;
      case 'typewriter':
        const text = element.content;
        const chars = text.split('');
        gsapRef.current.innerHTML = '';
        
        chars.forEach((char, i) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.opacity = '0';
          gsapRef.current!.appendChild(span);
          
          tl.to(span, {
            opacity: 1,
            duration: 0.05,
            ease: "none"
          }, i * 0.05);
        });
        break;
      case 'glow':
        tl.to(gsapRef.current, {
          textShadow: "0 0 20px #fff, 0 0 30px #fff, 0 0 40px #fff",
          duration: 0.3,
          yoyo: true,
          repeat: 1
        });
        break;
    }
  }, [element.content, isAnimating]);

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
                padding: "4px 8px",
                borderRadius: "2px",
                whiteSpace: "nowrap",
                fontFamily: fontClassName === "" ? element.fontFamily : undefined,
              }}
            >
              {element.content}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
