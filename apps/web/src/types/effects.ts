// Types for video effects and filters system
export type EffectType = 
  | 'visual' 
  | 'audio' 
  | 'transition' 
  | 'color'
  | 'motion'
  | 'distortion'
  | 'overlay';

export type EffectCategory = 
  | 'basic'
  | 'advanced'
  | 'artistic'
  | 'cinematic'
  | 'social'
  | 'ai-enhanced';

export interface EffectParameter {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'color' | 'select' | 'range';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  unit?: string;
  description?: string;
}

export interface Effect {
  id: string;
  name: string;
  description: string;
  type: EffectType;
  category: EffectCategory;
  icon: string;
  preview: string; // thumbnail or preview GIF
  parameters: EffectParameter[];
  ffmpegFilter: string; // FFmpeg filter string template
  isAIEnhanced?: boolean;
  processingTime?: 'fast' | 'medium' | 'slow';
  supported: {
    video: boolean;
    audio: boolean;
    image: boolean;
  };
}

export interface Transition {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string;
  duration: number; // in seconds
  parameters: EffectParameter[];
  ffmpegTransition: string;
}

// AI-related types for token efficiency
export interface AIOperation {
  id: string;
  type: 'enhance' | 'analyze' | 'generate' | 'optimize';
  prompt: string;
  tokenCost: number;
  estimatedTime: number; // in seconds
  cacheKey: string; // for avoiding repeated operations
}

export interface AIEnhancedEffect extends Effect {
  aiOperation: AIOperation;
  fallbackEffect?: Effect; // non-AI version
}

// CapCut/剪映 style effect collections
export interface EffectCollection {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  effects: Effect[];
  category: EffectCategory;
}

// Filter types similar to CapCut
export interface VideoFilter {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'basic' | 'cinematic' | 'vintage' | 'food' | 'portrait' | 'landscape';
  intensity: number; // 0-100
  ffmpegFilters: string[];
  parameters: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    gamma: number;
    warmth: number;
    vignette: number;
    grain: number;
  };
}

// Audio effects
export interface AudioEffect {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'voice' | 'music' | 'ambient';
  parameters: {
    volume: number;
    pitch: number;
    speed: number;
    reverb: number;
    echo: number;
    bassBoost: number;
    trebleBoost: number;
    noiseReduction: number;
  };
  ffmpegFilters: string[];
}

// Motion effects (similar to CapCut's animation presets)
export interface MotionEffect {
  id: string;
  name: string;
  description: string;
  type: 'entrance' | 'exit' | 'emphasis' | 'path';
  duration: number;
  keyframes: {
    time: number; // 0-1
    transform: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
  }[];
}

// Speed effects (ramping, slow-mo, etc.)
export interface SpeedEffect {
  id: string;
  name: string;
  type: 'constant' | 'ramp' | 'curve';
  speedMultiplier: number;
  curve?: {
    points: { time: number; speed: number }[];
  };
}

// Mask and overlay effects
export interface MaskEffect {
  id: string;
  name: string;
  type: 'shape' | 'gradient' | 'image' | 'animated';
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  opacity: number;
  feather: number;
  data: string; // SVG path, image URL, or animation data
}

// Text animation effects (enhanced from existing)
export interface TextAnimation {
  id: string;
  name: string;
  type: 'entrance' | 'exit' | 'emphasis' | 'typewriter';
  duration: number;
  easing: string;
  parameters: {
    staggerDelay?: number;
    letterSpacing?: number;
    wordSpacing?: number;
    direction?: 'left' | 'right' | 'up' | 'down' | 'center';
  };
}

// AI prompt templates for common operations
export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  tokenCost: number;
  category: 'color-correction' | 'enhancement' | 'style-transfer' | 'object-removal';
  examples: string[];
}

// Applied effect on timeline element
export interface AppliedEffect {
  id: string;
  effectId: string;
  elementId: string;
  trackId: string;
  startTime: number;
  endTime?: number; // if null, applies to entire element
  parameters: Record<string, any>;
  enabled: boolean;
  blendMode?: string;
  opacity?: number;
}

// For batching AI operations to save tokens
export interface AIBatch {
  id: string;
  operations: AIOperation[];
  totalTokenCost: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: Record<string, any>;
}
