"use client";

import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureKeyManager } from "@/lib/security/key-manager";
import { TextElement, TimelineTrack } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Play, Loader2, RotateCcw, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AITextPropertiesProps {
  element: TextElement;
  track: TimelineTrack;
  onAnimationTrigger: (animation: string) => void;
}

const ANIMATION_PRESETS = [
  { name: "Fade In", value: "fadeIn", description: "Smooth fade in with gentle scale" },
  { name: "Slide In", value: "slideIn", description: "Smooth slide in from left" },
  { name: "Bounce", value: "bounce", description: "Elastic bounce entrance" },
  { name: "Typewriter", value: "typewriter", description: "Letter by letter reveal" },
  { name: "Glow", value: "glow", description: "Smooth glowing text effect" },
  { name: "Zoom In", value: "zoomIn", description: "Scale up with bounce" },
  { name: "Rotate In", value: "rotateIn", description: "Rotate into position" },
];

const STYLE_SUGGESTIONS = [
  "Make it bold and dramatic",
  "Create a vintage look",
  "Make it modern and sleek",
  "Add a neon glow effect",
  "Make it elegant and refined",
  "Create a comic book style",
];

export function AITextProperties({
  element,
  track,
  onAnimationTrigger,
}: AITextPropertiesProps) {
  const { updateTextElement } = useTimelineStore();
  const { updateBackgroundType } = useProjectStore();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStyles, setGeneratedStyles] = useState<any[]>([]);
  const [aiApiKey, setAiApiKey] = useState("");
  const [textContent, setTextContent] = useState(element.content);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Initialize security and load API key
  useEffect(() => {
    (async () => {
      await secureKeyManager.initialize();
      const savedApiKey = await secureKeyManager.getApiKey("google-ai");
      if (savedApiKey) {
        setAiApiKey(savedApiKey);
      }
    })();
  }, []);

  // Save API key securely
  const handleApiKeySave = async () => {
    try {
      if (!secureKeyManager.validateApiKey(aiApiKey, 'google-ai')) {
        toast.error("Invalid API key format");
        return;
      }

      await secureKeyManager.storeApiKey("google-ai", aiApiKey);
      toast.success("API key saved securely");
    } catch (error) {
      console.error("Failed to save API key securely", error);
      toast.error("Failed to save API key securely");
    }
  };

  // Handle image attachment
  const handleImageAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image file size should be less than 10MB");
        return;
      }
      
      setAttachedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success("Image attached successfully");
    }
  };
  
  // Remove attached image
  const removeAttachedImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
    // Clear file input
    const fileInput = document.getElementById('image-attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // Convert file to base64 for AI analysis
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Generate styles using Google AI (with optional image analysis)
  const generateStyles = async () => {
    if (!aiApiKey) {
      toast.error("Please enter your Google AI API key");
      return;
    }

    if (!prompt && !attachedImage) {
      toast.error("Please enter a style description or attach an image");
      return;
    }

    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(aiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      let content = [];
      let systemPrompt = `You are a text styling assistant for a video editor. Given a text element and styling information, generate CSS-like styling options that can be applied to text. The current text is: "${element.content}".

Current styles:
- Font size: ${element.fontSize}px
- Font family: ${element.fontFamily}
- Color: ${element.color}
- Background: ${element.backgroundColor}
- Text align: ${element.textAlign}
- Font weight: ${element.fontWeight}
- Font style: ${element.fontStyle}
- Text decoration: ${element.textDecoration}
`;
      
      // Add image analysis if image is attached
      if (attachedImage) {
        const base64Image = await fileToBase64(attachedImage);
        content.push({
          text: systemPrompt + `\n\nCarefully analyze the attached image and follow these steps:

1. EXTRACT THE COLOR PALETTE: Identify the 3-5 most prominent colors in the image (as hex codes)
2. ANALYZE THE STYLE: Determine the visual style, mood, typography feel, and overall aesthetic
3. CREATE TEXT STYLES: Generate 3 different text styling variations that use the actual colors from the image

IMPORTANT: You MUST use the actual colors you see in the image for the text color, text shadow, and background. Do not use generic colors like #ffffff or #000000 unless they are actually prominent in the image.

${prompt ? `Also consider this additional request: "${prompt}"` : ''}

For each style, use colors that are actually visible in the image:
- Use dominant colors for main text color
- Use complementary colors from the image for shadows/effects
- Use appropriate background colors that appear in the image
- Create contrast while staying true to the image's palette

Return ONLY a JSON array with this exact structure:
[
  {
    "name": "Style Name (mention specific colors used)",
    "description": "Brief description explaining how it uses the image's actual color palette",
    "fontSize": 48,
    "fontFamily": "Arial",
    "color": "#ACTUAL_HEX_FROM_IMAGE",
    "backgroundColor": "transparent",
    "textAlign": "center",
    "fontWeight": "bold",
    "fontStyle": "normal",
    "textDecoration": "none",
    "textShadow": "2px 2px 4px #ACTUAL_SHADOW_COLOR_FROM_IMAGE",
    "opacity": 1,
    "canvasBackground": {
      "type": "color",
      "value": "#ACTUAL_BACKGROUND_COLOR_FROM_IMAGE"
    }
  }
]

Make sure:
- All color values are actual hex codes extracted from the image
- Each style uses different color combinations from the image's palette
- Colors create good contrast and readability
- Include canvasBackground with colors that actually appear in the image`
        });
        content.push({
          inlineData: {
            mimeType: attachedImage.type,
            data: base64Image
          }
        });
      } else {
        // Text-only prompt
        content.push({
          text: systemPrompt + `\n\nGenerate 3 different styling variations based on this request: "${prompt}"

Return ONLY a JSON array with this exact structure:
[
  {
    "name": "Style Name",
    "description": "Brief description",
    "fontSize": 48,
    "fontFamily": "Arial",
    "color": "#ffffff",
    "backgroundColor": "transparent",
    "textAlign": "center",
    "fontWeight": "bold",
    "fontStyle": "normal",
    "textDecoration": "none",
    "textShadow": "0 0 10px rgba(255,255,255,0.5)",
    "opacity": 1
  }
]

Make sure all color values are valid hex codes, fontSize is a number, and all other values match the expected format.`
        });
      }

      const result = await model.generateContent(content);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const styles = JSON.parse(jsonMatch[0]);
        setGeneratedStyles(styles);
        
        if (attachedImage) {
          toast.success(`Generated ${styles.length} styles based on your image and prompt!`);
        } else {
          toast.success(`Generated ${styles.length} styles!`);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error generating styles:", error);
      toast.error("Failed to generate styles. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply generated style
  const applyStyle = (style: any) => {
    const updates: Partial<TextElement> = {};
    
    if (style.fontSize) updates.fontSize = style.fontSize;
    if (style.fontFamily) updates.fontFamily = style.fontFamily;
    if (style.color) updates.color = style.color;
    if (style.backgroundColor) updates.backgroundColor = style.backgroundColor;
    if (style.textAlign) updates.textAlign = style.textAlign;
    if (style.fontWeight) updates.fontWeight = style.fontWeight;
    if (style.fontStyle) updates.fontStyle = style.fontStyle;
    if (style.textDecoration) updates.textDecoration = style.textDecoration;
    if (style.opacity !== undefined) updates.opacity = style.opacity;
    
    // Add textShadow support
    if (style.textShadow) {
      updates.textShadow = String(style.textShadow);
    }
    
    // Advanced typography support
    if (style.letterSpacing !== undefined) updates.letterSpacing = style.letterSpacing;
    if (style.lineHeight !== undefined) updates.lineHeight = style.lineHeight;
    if (style.textStroke) {
      updates.textStroke = style.textStroke;
    }

    updateTextElement(track.id, element.id, updates);
    
    // Apply canvas background changes if specified
    if (style.canvasBackground) {
      if (style.canvasBackground.type === 'color') {
        updateBackgroundType('color', { backgroundColor: style.canvasBackground.value });
      } else if (style.canvasBackground.type === 'blur') {
        updateBackgroundType('blur', { blurIntensity: style.canvasBackground.value });
      }
    }
    
    toast.success(`Applied ${style.name} style`);
  };
  
  // Expose functions for programmatic AI control
  // These functions are designed to be called by AI chat commands
  const setFontSize = (size: number) => {
    updateTextElement(track.id, element.id, { fontSize: Math.max(8, Math.min(300, size)) });
    toast.success(`Font size set to ${size}px`);
  };
  
  const setLetterSpacing = (spacing: number) => {
    updateTextElement(track.id, element.id, { letterSpacing: Math.max(-5, Math.min(20, spacing)) });
    toast.success(`Letter spacing set to ${spacing}`);
  };
  
  const setLineHeight = (height: number) => {
    updateTextElement(track.id, element.id, { lineHeight: Math.max(0.5, Math.min(3, height)) });
    toast.success(`Line height set to ${height}`);
  };
  
  const setTextStroke = (width: number, color: string = '#000000') => {
    updateTextElement(track.id, element.id, {
      textStroke: {
        width: Math.max(0, Math.min(10, width)),
        color: color
      }
    });
    toast.success(`Text stroke set to ${width}px ${color}`);
  };
  
  // Reset all styling to original defaults
  const resetToOriginalStyle = () => {
    const originalStyle: Partial<TextElement> = {
      fontSize: 48,
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "transparent",
      textAlign: "center",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      opacity: 1,
      textShadow: undefined,
      letterSpacing: undefined,
      lineHeight: undefined,
      textStroke: undefined,
      animation: undefined
    };
    
    updateTextElement(track.id, element.id, originalStyle);
    toast.success("Text styling reset to original");
  };
  
  // Handle animation trigger
  const handleAnimationTrigger = (animation: string) => {
    // Save the animation to the timeline element for automatic playback
    // Using settings similar to CapCut/剪映
    const animationConfig = {
      type: animation,
      duration: 0.8, // Shorter duration like CapCut (0.8s default)
      delay: 0, // No delay by default, animation starts immediately when text appears
      easing: getAnimationEasing(animation)
    };
    
    updateTextElement(track.id, element.id, {
      animation: animationConfig
    });
    
    // Dispatch custom event to trigger animation immediately in the preview
    const animationEvent = new CustomEvent('triggerTextAnimation', {
      detail: {
        elementId: element.id,
        trackId: track.id,
        animation: animation
      }
    });
    window.dispatchEvent(animationEvent);
    
    // Also call the passed handler for backward compatibility
    onAnimationTrigger(animation);
    toast.success(`Applied ${animation} animation - it will play once when text appears during timeline playback`);
  };
  
  // Make these functions globally accessible for AI commands
  useEffect(() => {
    // Store functions globally for AI chat access
    (window as any).aiTextFunctions = {
      setFontSize,
      setLetterSpacing, 
      setLineHeight,
      setTextStroke,
      applyStyle,
      handleAnimationTrigger,
      resetToOriginalStyle,
      elementId: element.id,
      trackId: track.id
    };
    
    return () => {
      delete (window as any).aiTextFunctions;
    };
  }, [element.id, track.id]);

  // Quick style presets
  const quickStyles = [
    {
      name: "Bold Title",
      style: {
        fontSize: 64,
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
      },
    },
    {
      name: "Subtitle",
      style: {
        fontSize: 32,
        fontWeight: "normal",
        color: "#cccccc",
        fontStyle: "italic",
      },
    },
    {
      name: "Neon Glow",
      style: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#00ff00",
        textShadow: "0 0 20px #00ff00, 0 0 30px #00ff00",
      },
    },
    {
      name: "Dark BG",
      style: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#ffffff",
        canvasBackground: {
          type: 'color',
          value: '#000000'
        }
      },
    },
    {
      name: "Blue BG",
      style: {
        fontSize: 40,
        fontWeight: "600",
        color: "#ffffff",
        textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
        canvasBackground: {
          type: 'color',
          value: '#1e40af'
        }
      },
    },
    {
      name: "Pink BG",
      style: {
        fontSize: 38,
        fontWeight: "bold",
        color: "#ffffff",
        canvasBackground: {
          type: 'color',
          value: '#ec4899'
        }
      },
    },
    {
      name: "Green BG",
      style: {
        fontSize: 40,
        fontWeight: "600",
        color: "#ffffff",
        canvasBackground: {
          type: 'color',
          value: '#059669'
        }
      },
    },
    {
      name: "Blur BG",
      style: {
        fontSize: 44,
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        canvasBackground: {
          type: 'blur',
          value: 12
        }
      },
    },
  ];

  // Get appropriate easing for each animation type like CapCut/剪映
  const getAnimationEasing = (animationType: string): string => {
    switch (animationType) {
      case 'fadeIn':
        return 'power2.out'; // Smooth fade
      case 'slideIn':
        return 'back.out(1.2)'; // Slight overshoot like CapCut
      case 'bounce':
        return 'bounce.out'; // Natural bounce
      case 'typewriter':
        return 'none'; // Linear for typewriter effect
      case 'glow':
        return 'power2.inOut'; // Smooth glow transition
      default:
        return 'power2.out';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">AI Text Editor</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToOriginalStyle}
          className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground"
          title="Reset all styling to original defaults"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset Style
        </Button>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="style">AI Styling</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4">
          {/* Quick Styles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Styles</CardTitle>
              <CardDescription className="text-xs">Apply pre-made styles instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickStyles.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => applyStyle(preset.style)}
                    className="h-auto p-2 text-left text-xs"
                  >
                    <div>
                      <div className="font-medium text-xs">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.style.fontSize ? `${preset.style.fontSize}px` : 'Custom'}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Style Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Style Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Describe the style you want or attach an image for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-xs">Style Description</Label>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    placeholder="e.g., Make it bold and dramatic, or attach an image for AI analysis"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[60px] text-xs pr-10"
                  />
                  <div className="absolute right-2 top-2">
                    <input
                      id="image-attachment"
                      type="file"
                      accept="image/*"
                      onChange={handleImageAttachment}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById('image-attachment')?.click()}
                      className="h-6 w-6 p-0 hover:bg-accent"
                      title="Attach image for style analysis"
                    >
                      <Paperclip className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Attached Image
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeAttachedImage}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative rounded-md overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Attached for style analysis"
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all cursor-pointer flex items-center justify-center">
                      <div className="text-xs text-white opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded">
                        AI will analyze this image's style
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {STYLE_SUGGESTIONS.map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1 px-2"
                    onClick={() => setPrompt(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>

              <Button
                onClick={generateStyles}
                disabled={isLoading || !aiApiKey}
                className="w-full text-xs h-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {attachedImage ? 'Analyzing Image...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
                    {attachedImage ? 'Analyze Image & Generate' : 'Generate Styles'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Styles */}
          {generatedStyles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Generated Styles</CardTitle>
                <CardDescription className="text-xs">Click to apply a style</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {generatedStyles.map((style, index) => (
                    <div
                      key={index}
                      className="p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => applyStyle(style)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-xs">{style.name}</h4>
                        <Badge variant="outline" className="text-xs">{style.fontSize}px</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {style.description}
                      </p>
                      <div
                        className="text-center p-1 rounded border text-xs"
                        style={{
                          fontSize: `${Math.min(style.fontSize / 3, 14)}px`,
                          fontFamily: style.fontFamily,
                          color: style.color,
                          backgroundColor: style.backgroundColor,
                          fontWeight: style.fontWeight,
                          fontStyle: style.fontStyle,
                          textDecoration: style.textDecoration,
                          textShadow: style.textShadow,
                        }}
                      >
                        {element.content}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="animation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Text Animations</CardTitle>
              <CardDescription className="text-xs">
                Choose entrance animations for your text
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category tabs */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" className="text-xs h-7 bg-primary/10 text-primary border-primary/20">
                  入场 (Entrance)
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
                  出场 (Exit)
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
                  循环 (Loop)
                </Button>
              </div>

              {/* Animation grid */}
              <div className="grid grid-cols-2 gap-3">
                {ANIMATION_PRESETS.map((animation) => {
                  // Check if this animation is currently applied to the element
                  const isApplied = element.animation?.type === animation.value;
                  
                  return (
                    <div
                      key={animation.value}
                      className={`
                        relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 group
                        ${
                          isApplied 
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                            : "border-border hover:border-accent-foreground hover:bg-accent/50"
                        }
                      `}
                      onClick={() => {
                        if (isApplied) {
                          // Remove animation if already applied
                          updateTextElement(track.id, element.id, {
                            animation: undefined
                          });
                          toast.success(`Removed ${animation.name} animation`);
                        } else {
                          // Apply new animation
                          handleAnimationTrigger(animation.value);
                        }
                      }}
                    >
                      {/* Preview area */}
                      <div className="h-20 bg-gradient-to-br from-muted/30 to-muted/60 flex items-center justify-center relative overflow-hidden">
                        {/* Animated preview text */}
                        <div 
                          className={`
                            text-lg font-bold transition-all duration-700 relative z-10
                            ${
                              animation.value === 'fadeIn' ? 'animate-pulse' :
                              animation.value === 'slideIn' ? 'transform transition-transform group-hover:translate-x-1' :
                              animation.value === 'bounce' ? 'animate-bounce' :
                              animation.value === 'typewriter' ? 'font-mono' :
                              animation.value === 'glow' ? 'text-yellow-400 animate-pulse' :
                              animation.value === 'zoomIn' ? 'group-hover:scale-110 transition-transform' :
                              animation.value === 'rotateIn' ? 'group-hover:rotate-12 transition-transform' :
                              ''
                            }
                          `}
                          style={{
                            textShadow: animation.value === 'glow' ? '0 0 10px currentColor' : undefined
                          }}
                        >
                          ABC
                        </div>
                        
                        {/* Premium indicator */}
                        {isApplied && (
                          <div className="absolute top-1.5 right-1.5">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                          </div>
                        )}
                        
                        {/* Download/Apply indicator */}
                        <div className="absolute bottom-1.5 right-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                            isApplied ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                          }`}>
                            {isApplied ? '✓' : '↓'}
                          </div>
                        </div>
                        
                        {/* Background animation effect */}
                        <div className={`absolute inset-0 opacity-20 ${
                          animation.value === 'fadeIn' ? 'bg-gradient-to-r from-transparent via-white to-transparent' :
                          animation.value === 'slideIn' ? 'bg-gradient-to-r from-blue-500 to-transparent' :
                          animation.value === 'bounce' ? 'bg-gradient-to-t from-green-500/30 to-transparent' :
                          animation.value === 'glow' ? 'bg-radial-gradient from-yellow-400/30 to-transparent' :
                          animation.value === 'zoomIn' ? 'bg-gradient-to-br from-purple-500/30 to-transparent' :
                          'bg-gradient-to-br from-gray-400/20 to-transparent'
                        }`} />
                      </div>
                      
                      {/* Label */}
                      <div className="p-2 text-center">
                        <div className={`text-xs font-medium ${
                          isApplied ? 'text-primary' : 'text-foreground'
                        }`}>
                          {animation.name}
                        </div>
                      </div>
                      
                      {/* Active overlay */}
                      {isApplied && (
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
                
                {/* No animation option */}
                <div
                  className={`
                    relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 group
                    ${
                      !element.animation 
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                        : "border-border hover:border-accent-foreground hover:bg-accent/50"
                    }
                  `}
                  onClick={() => {
                    updateTextElement(track.id, element.id, {
                      animation: undefined
                    });
                    toast.success('Removed all animations');
                  }}
                >
                  {/* Preview area */}
                  <div className="h-20 bg-gradient-to-br from-muted/30 to-muted/60 flex items-center justify-center relative">
                    <div className="text-2xl text-muted-foreground">
                      ⊘
                    </div>
                    {!element.animation && (
                      <div className="absolute top-1.5 right-1.5">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="p-2 text-center">
                    <div className={`text-xs font-medium ${
                      !element.animation ? 'text-primary' : 'text-foreground'
                    }`}>
                      None
                    </div>
                  </div>
                  
                  {/* Active overlay */}
                  {!element.animation && (
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API Configuration</CardTitle>
              <CardDescription className="text-xs">
                Manage your Google AI Studio API key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="apiKeySettings" className="text-xs">Google AI API Key</Label>
                <Input
                  id="apiKeySettings"
                  type="password"
                  placeholder="Enter your API key"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button onClick={handleApiKeySave} className="text-xs h-7">
                Save API Key
              </Button>
              <div className="text-xs text-muted-foreground">
                <p>
                  Get your API key from{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
