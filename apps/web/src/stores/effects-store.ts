import { create } from 'zustand';
import { 
  Effect, 
  VideoFilter, 
  AudioEffect, 
  MotionEffect, 
  Transition, 
  AppliedEffect,
  AIOperation,
  AIBatch,
  EffectCollection,
  SpeedEffect,
  MaskEffect,
  TextAnimation
} from '@/types/effects';

interface EffectsState {
  // Available effects
  effects: Effect[];
  videoFilters: VideoFilter[];
  audioEffects: AudioEffect[];
  motionEffects: MotionEffect[];
  transitions: Transition[];
  speedEffects: SpeedEffect[];
  maskEffects: MaskEffect[];
  textAnimations: TextAnimation[];
  effectCollections: EffectCollection[];

  // Applied effects on timeline
  appliedEffects: AppliedEffect[];
  
  // AI operations
  aiBatches: AIBatch[];
  aiCache: Record<string, any>;
  tokenUsage: {
    used: number;
    limit: number;
    resetDate: Date;
  };

  // UI state
  selectedEffect: Effect | null;
  previewMode: boolean;
  isProcessing: boolean;
  
  // Actions
  initializeEffects: () => void;
  
  // Effect management
  addEffect: (effect: Effect) => void;
  removeEffect: (effectId: string) => void;
  updateEffect: (effectId: string, updates: Partial<Effect>) => void;
  
  // Apply/remove effects on timeline elements
  applyEffect: (effectId: string, elementId: string, trackId: string, startTime?: number, endTime?: number) => void;
  removeAppliedEffect: (appliedEffectId: string) => void;
  updateAppliedEffect: (appliedEffectId: string, parameters: Record<string, any>) => void;
  getEffectsForElement: (elementId: string, trackId: string) => AppliedEffect[];
  
  // Filter management
  applyVideoFilter: (filterId: string, elementId: string, trackId: string) => void;
  updateFilterIntensity: (filterId: string, elementId: string, intensity: number) => void;
  
  // AI operations
  createAIBatch: (operations: AIOperation[]) => string;
  processAIBatch: (batchId: string) => Promise<void>;
  getCachedResult: (cacheKey: string) => any;
  setCachedResult: (cacheKey: string, result: any) => void;
  updateTokenUsage: (tokens: number) => void;
  
  // Motion effects
  applyMotionEffect: (effectId: string, elementId: string, trackId: string) => void;
  createCustomMotionEffect: (keyframes: any[], duration: number) => MotionEffect;
  
  // Speed effects
  applySpeedEffect: (speedMultiplier: number, elementId: string, trackId: string) => void;
  createSpeedRamp: (points: { time: number; speed: number }[], elementId: string, trackId: string) => void;
  
  // Transitions
  applyTransition: (transitionId: string, fromElementId: string, toElementId: string, duration: number) => void;
  
  // Masks and overlays
  applyMask: (maskId: string, elementId: string, trackId: string) => void;
  
  // Text animations
  applyTextAnimation: (animationId: string, elementId: string, trackId: string) => void;
  
  // Batch operations
  applyEffectToMultipleElements: (effectId: string, elementIds: string[], trackIds: string[]) => void;
  
  // Preview and processing
  togglePreview: () => void;
  setProcessing: (processing: boolean) => void;
  selectEffect: (effect: Effect | null) => void;
}

// Default effects library (CapCut/剪映 style)
const createDefaultEffects = (): Effect[] => [
  // Basic color effects
  {
    id: 'brightness-contrast',
    name: 'Brightness & Contrast',
    description: 'Adjust brightness and contrast',
    type: 'color',
    category: 'basic',
    icon: '☀️',
    preview: '/effects/brightness-contrast.gif',
    ffmpegFilter: 'eq=brightness={brightness}:contrast={contrast}',
    parameters: [
      {
        id: 'brightness',
        name: 'Brightness',
        type: 'range',
        value: 0,
        min: -1,
        max: 1,
        step: 0.1,
        unit: '',
      },
      {
        id: 'contrast',
        name: 'Contrast',
        type: 'range',
        value: 1,
        min: 0,
        max: 3,
        step: 0.1,
        unit: '',
      }
    ],
    supported: { video: true, audio: false, image: true }
  },
  {
    id: 'saturation-hue',
    name: 'Saturation & Hue',
    description: 'Adjust color saturation and hue',
    type: 'color',
    category: 'basic',
    icon: '🎨',
    preview: '/effects/saturation-hue.gif',
    ffmpegFilter: 'eq=saturation={saturation}:hue={hue}',
    parameters: [
      {
        id: 'saturation',
        name: 'Saturation',
        type: 'range',
        value: 1,
        min: 0,
        max: 3,
        step: 0.1,
        unit: '',
      },
      {
        id: 'hue',
        name: 'Hue',
        type: 'range',
        value: 0,
        min: -180,
        max: 180,
        step: 1,
        unit: '°',
      }
    ],
    supported: { video: true, audio: false, image: true }
  },
  // Blur effects
  {
    id: 'gaussian-blur',
    name: 'Gaussian Blur',
    description: 'Apply gaussian blur effect',
    type: 'visual',
    category: 'basic',
    icon: '🌫️',
    preview: '/effects/gaussian-blur.gif',
    ffmpegFilter: 'gblur=sigma={sigma}',
    parameters: [
      {
        id: 'sigma',
        name: 'Blur Amount',
        type: 'range',
        value: 1,
        min: 0.1,
        max: 20,
        step: 0.1,
        unit: 'px',
      }
    ],
    supported: { video: true, audio: false, image: true }
  },
  {
    id: 'motion-blur',
    name: 'Motion Blur',
    description: 'Add motion blur effect',
    type: 'motion',
    category: 'advanced',
    icon: '💨',
    preview: '/effects/motion-blur.gif',
    ffmpegFilter: 'minterpolate=fps={fps}:mb_size={size}',
    parameters: [
      {
        id: 'fps',
        name: 'Frame Rate',
        type: 'range',
        value: 30,
        min: 15,
        max: 60,
        step: 1,
        unit: 'fps',
      },
      {
        id: 'size',
        name: 'Block Size',
        type: 'range',
        value: 16,
        min: 4,
        max: 32,
        step: 4,
        unit: 'px',
      }
    ],
    supported: { video: true, audio: false, image: false }
  },
  // Artistic effects
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    description: 'Classic film look with grain and color grading',
    type: 'color',
    category: 'artistic',
    icon: '📽️',
    preview: '/effects/vintage-film.gif',
    ffmpegFilter: 'curves=vintage:eq=contrast={contrast}:gamma={gamma},noise=alls={grain}',
    parameters: [
      {
        id: 'contrast',
        name: 'Contrast',
        type: 'range',
        value: 1.2,
        min: 0.5,
        max: 2,
        step: 0.1,
        unit: '',
      },
      {
        id: 'gamma',
        name: 'Gamma',
        type: 'range',
        value: 1.1,
        min: 0.5,
        max: 2,
        step: 0.1,
        unit: '',
      },
      {
        id: 'grain',
        name: 'Film Grain',
        type: 'range',
        value: 20,
        min: 0,
        max: 50,
        step: 1,
        unit: '',
      }
    ],
    supported: { video: true, audio: false, image: true }
  },
  // Cinematic effects
  {
    id: 'cinematic-bars',
    name: 'Cinematic Bars',
    description: 'Add black bars for cinematic aspect ratio',
    type: 'overlay',
    category: 'cinematic',
    icon: '🎬',
    preview: '/effects/cinematic-bars.gif',
    ffmpegFilter: 'pad=iw:ih*{ratio}:(ow-iw)/2:(oh-ih)/2:black',
    parameters: [
      {
        id: 'ratio',
        name: 'Aspect Ratio',
        type: 'select',
        value: 1.25,
        options: [
          { label: '2.35:1 (Anamorphic)', value: 1.25 },
          { label: '2.4:1 (Ultra Wide)', value: 1.2 },
          { label: '1.85:1 (Standard)', value: 1.35 }
        ]
      }
    ],
    supported: { video: true, audio: false, image: true }
  },
];

const createDefaultVideoFilters = (): VideoFilter[] => [
  {
    id: 'natural',
    name: 'Natural',
    description: 'Enhance natural colors',
    thumbnail: '/filters/natural.jpg',
    category: 'basic',
    intensity: 50,
    ffmpegFilters: ['eq=contrast=1.1:brightness=0.05:saturation=1.2'],
    parameters: {
      brightness: 5,
      contrast: 10,
      saturation: 20,
      hue: 0,
      gamma: 1,
      warmth: 10,
      vignette: 0,
      grain: 0
    }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-like color grading',
    thumbnail: '/filters/cinematic.jpg',
    category: 'cinematic',
    intensity: 60,
    ffmpegFilters: ['curves=r=\'0/0.1 0.5/0.4 1/0.9\':g=\'0/0 0.5/0.5 1/1\':b=\'0/0.1 0.5/0.6 1/0.9\''],
    parameters: {
      brightness: -5,
      contrast: 15,
      saturation: -10,
      hue: 0,
      gamma: 1.1,
      warmth: 15,
      vignette: 20,
      grain: 10
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Retro film look',
    thumbnail: '/filters/vintage.jpg',
    category: 'vintage',
    intensity: 70,
    ffmpegFilters: ['eq=contrast=1.3:brightness=0.1:saturation=0.8:gamma_r=1.2:gamma_g=1.1:gamma_b=0.9'],
    parameters: {
      brightness: 10,
      contrast: 30,
      saturation: -20,
      hue: 5,
      gamma: 1.2,
      warmth: 25,
      vignette: 30,
      grain: 25
    }
  }
];

const createDefaultTransitions = (): Transition[] => [
  {
    id: 'fade',
    name: 'Fade',
    description: 'Simple fade transition',
    icon: '🌅',
    preview: '/transitions/fade.gif',
    duration: 1,
    parameters: [
      {
        id: 'duration',
        name: 'Duration',
        type: 'range',
        value: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
        unit: 's'
      }
    ],
    ffmpegTransition: 'fade=t=in:st={start}:d={duration},fade=t=out:st={end}:d={duration}'
  },
  {
    id: 'slide',
    name: 'Slide',
    description: 'Slide transition',
    icon: '➡️',
    preview: '/transitions/slide.gif',
    duration: 1,
    parameters: [
      {
        id: 'direction',
        name: 'Direction',
        type: 'select',
        value: 'left',
        options: [
          { label: 'Left to Right', value: 'left' },
          { label: 'Right to Left', value: 'right' },
          { label: 'Top to Bottom', value: 'up' },
          { label: 'Bottom to Top', value: 'down' }
        ]
      },
      {
        id: 'duration',
        name: 'Duration',
        type: 'range',
        value: 1,
        min: 0.1,
        max: 3,
        step: 0.1,
        unit: 's'
      }
    ],
    ffmpegTransition: 'xfade=transition=slide{direction}:duration={duration}:offset={offset}'
  }
];

export const useEffectsStore = create<EffectsState>((set, get) => ({
  // Initial state
  effects: [],
  videoFilters: [],
  audioEffects: [],
  motionEffects: [],
  transitions: [],
  speedEffects: [],
  maskEffects: [],
  textAnimations: [],
  effectCollections: [],
  appliedEffects: [],
  aiBatches: [],
  aiCache: {},
  tokenUsage: {
    used: 0,
    limit: 10000,
    resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  selectedEffect: null,
  previewMode: false,
  isProcessing: false,

  // Initialize with default effects
  initializeEffects: () => {
    set({
      effects: createDefaultEffects(),
      videoFilters: createDefaultVideoFilters(),
      transitions: createDefaultTransitions()
    });
  },

  // Effect management
  addEffect: (effect) => {
    set((state) => ({
      effects: [...state.effects, effect]
    }));
  },

  removeEffect: (effectId) => {
    set((state) => ({
      effects: state.effects.filter(e => e.id !== effectId),
      appliedEffects: state.appliedEffects.filter(ae => ae.effectId !== effectId)
    }));
  },

  updateEffect: (effectId, updates) => {
    set((state) => ({
      effects: state.effects.map(e => 
        e.id === effectId ? { ...e, ...updates } : e
      )
    }));
  },

  // Apply effects to timeline elements
  applyEffect: (effectId, elementId, trackId, startTime, endTime) => {
    const appliedEffect: AppliedEffect = {
      id: `${effectId}-${elementId}-${Date.now()}`,
      effectId,
      elementId,
      trackId,
      startTime: startTime || 0,
      endTime,
      parameters: {},
      enabled: true
    };

    set((state) => ({
      appliedEffects: [...state.appliedEffects, appliedEffect]
    }));
  },

  removeAppliedEffect: (appliedEffectId) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.filter(ae => ae.id !== appliedEffectId)
    }));
  },

  updateAppliedEffect: (appliedEffectId, parameters) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.map(ae =>
        ae.id === appliedEffectId ? { ...ae, parameters: { ...ae.parameters, ...parameters } } : ae
      )
    }));
  },

  getEffectsForElement: (elementId, trackId) => {
    return get().appliedEffects.filter(ae => 
      ae.elementId === elementId && ae.trackId === trackId
    );
  },

  // Video filters
  applyVideoFilter: (filterId, elementId, trackId) => {
    const filter = get().videoFilters.find(f => f.id === filterId);
    if (filter) {
      const appliedEffect: AppliedEffect = {
        id: `filter-${filterId}-${elementId}-${Date.now()}`,
        effectId: filterId,
        elementId,
        trackId,
        startTime: 0,
        parameters: { ...filter.parameters },
        enabled: true
      };

      set((state) => ({
        appliedEffects: [...state.appliedEffects, appliedEffect]
      }));
    }
  },

  updateFilterIntensity: (filterId, elementId, intensity) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.map(ae =>
        ae.effectId === filterId && ae.elementId === elementId
          ? { ...ae, parameters: { ...ae.parameters, intensity } }
          : ae
      )
    }));
  },

  // AI operations
  createAIBatch: (operations) => {
    const batchId = `batch-${Date.now()}`;
    const totalTokenCost = operations.reduce((sum, op) => sum + op.tokenCost, 0);
    
    const batch: AIBatch = {
      id: batchId,
      operations,
      totalTokenCost,
      status: 'pending',
      results: {}
    };

    set((state) => ({
      aiBatches: [...state.aiBatches, batch]
    }));

    return batchId;
  },

  processAIBatch: async (batchId) => {
    const batch = get().aiBatches.find(b => b.id === batchId);
    if (!batch) return;

    set((state) => ({
      aiBatches: state.aiBatches.map(b =>
        b.id === batchId ? { ...b, status: 'processing' } : b
      )
    }));

    try {
      // Process AI operations (implementation would depend on AI service)
      // This is a placeholder for actual AI processing
      const results: Record<string, any> = {};
      
      for (const operation of batch.operations) {
        // Check cache first
        const cachedResult = get().getCachedResult(operation.cacheKey);
        if (cachedResult) {
          results[operation.id] = cachedResult;
        } else {
          // Process operation (placeholder)
          results[operation.id] = { processed: true };
          get().setCachedResult(operation.cacheKey, results[operation.id]);
        }
      }

      set((state) => ({
        aiBatches: state.aiBatches.map(b =>
          b.id === batchId ? { ...b, status: 'completed', results } : b
        )
      }));

      get().updateTokenUsage(batch.totalTokenCost);
    } catch (error) {
      set((state) => ({
        aiBatches: state.aiBatches.map(b =>
          b.id === batchId ? { ...b, status: 'failed' } : b
        )
      }));
    }
  },

  getCachedResult: (cacheKey) => {
    return get().aiCache[cacheKey];
  },

  setCachedResult: (cacheKey, result) => {
    set((state) => ({
      aiCache: { ...state.aiCache, [cacheKey]: result }
    }));
  },

  updateTokenUsage: (tokens) => {
    set((state) => ({
      tokenUsage: {
        ...state.tokenUsage,
        used: state.tokenUsage.used + tokens
      }
    }));
  },

  // Motion effects
  applyMotionEffect: (effectId, elementId, trackId) => {
    get().applyEffect(effectId, elementId, trackId);
  },

  createCustomMotionEffect: (keyframes, duration) => {
    const motionEffect: MotionEffect = {
      id: `custom-motion-${Date.now()}`,
      name: 'Custom Motion',
      description: 'Custom keyframe animation',
      type: 'emphasis',
      duration,
      keyframes: keyframes.map((kf, index) => ({
        time: index / (keyframes.length - 1),
        transform: kf
      }))
    };

    set((state) => ({
      motionEffects: [...state.motionEffects, motionEffect]
    }));

    return motionEffect;
  },

  // Speed effects
  applySpeedEffect: (speedMultiplier, elementId, trackId) => {
    const speedEffect: AppliedEffect = {
      id: `speed-${elementId}-${Date.now()}`,
      effectId: 'speed-change',
      elementId,
      trackId,
      startTime: 0,
      parameters: { speedMultiplier },
      enabled: true
    };

    set((state) => ({
      appliedEffects: [...state.appliedEffects, speedEffect]
    }));
  },

  createSpeedRamp: (points, elementId, trackId) => {
    const speedRamp: AppliedEffect = {
      id: `speed-ramp-${elementId}-${Date.now()}`,
      effectId: 'speed-ramp',
      elementId,
      trackId,
      startTime: 0,
      parameters: { curve: { points } },
      enabled: true
    };

    set((state) => ({
      appliedEffects: [...state.appliedEffects, speedRamp]
    }));
  },

  // Transitions
  applyTransition: (transitionId, fromElementId, toElementId, duration) => {
    const transition: AppliedEffect = {
      id: `transition-${fromElementId}-${toElementId}-${Date.now()}`,
      effectId: transitionId,
      elementId: fromElementId,
      trackId: '', // Transitions span elements
      startTime: 0,
      parameters: { toElementId, duration },
      enabled: true
    };

    set((state) => ({
      appliedEffects: [...state.appliedEffects, transition]
    }));
  },

  // Masks
  applyMask: (maskId, elementId, trackId) => {
    get().applyEffect(maskId, elementId, trackId);
  },

  // Text animations
  applyTextAnimation: (animationId, elementId, trackId) => {
    get().applyEffect(animationId, elementId, trackId);
  },

  // Batch operations
  applyEffectToMultipleElements: (effectId, elementIds, trackIds) => {
    elementIds.forEach((elementId, index) => {
      get().applyEffect(effectId, elementId, trackIds[index]);
    });
  },

  // UI actions
  togglePreview: () => {
    set((state) => ({ previewMode: !state.previewMode }));
  },

  setProcessing: (processing) => {
    set({ isProcessing: processing });
  },

  selectEffect: (effect) => {
    set({ selectedEffect: effect });
  }
}));
