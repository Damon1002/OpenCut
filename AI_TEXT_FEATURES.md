# AI-Powered Text Editing Features

This document describes the new AI-powered text editing features implemented in OpenCut.

## Overview

The text editing system now includes:
- **Double-click to edit**: Double-click on any text element to edit it directly
- **AI-powered styling**: Use Google AI to generate text styles based on natural language descriptions
- **Animation system**: Powered by GSAP and Framer Motion for smooth text animations
- **Hover controls**: Quick access to AI editor and style settings

## Features

### 1. Editable Text Component

- **Double-click editing**: Simply double-click any text on the canvas to edit it inline
- **Keyboard shortcuts**: 
  - `Enter` to save changes
  - `Escape` to cancel editing
- **Visual feedback**: Blue border indicates editing mode

### 2. AI Text Editor

Access the AI Text Editor by clicking the sparkles icon (✨) that appears when hovering over text elements.

#### AI Styling
- **Natural language prompts**: Describe the style you want (e.g., "Make it bold and dramatic with a neon glow")
- **Quick suggestions**: Pre-built suggestions for common styles
- **Style preview**: See how styles look before applying them
- **Multiple variations**: AI generates 3 different style options for each prompt

#### Animation System
- **GSAP animations**: Professional-grade animations including:
  - Fade In: Smooth entrance with scale effect
  - Slide In: Text slides in from the left
  - Bounce: Bouncy entrance effect
  - Typewriter: Letter-by-letter reveal
  - Glow: Pulsing glow effect
- **Preview animations**: Test animations before applying them

#### Quick Styles
- **Bold Title**: Large, bold text with shadow
- **Subtitle**: Medium italic text
- **Neon Glow**: Glowing green text effect

### 3. Google AI Integration

#### Setup
1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enter the API key in the AI Text Editor settings tab
3. The key is securely stored in your browser's localStorage

#### AI Style Generation
The AI system analyzes your current text and generates CSS-like styling options based on your prompt. It considers:
- Current font size, family, and colors
- Text alignment and decorations
- Background settings
- Opacity and shadow effects

## Technical Implementation

### Dependencies Added
- `gsap`: For advanced animations
- `@google/generative-ai`: For AI-powered styling
- `framer-motion`: For smooth UI animations (already existed)

### File Structure
```
src/components/editor/
├── editable-text.tsx          # Main editable text component
├── ai-text-editor.tsx         # AI-powered text editor modal
└── preview-panel.tsx          # Updated to use new editable text
```

### Type Extensions
The `TextElement` type has been extended to support:
- `textShadow?: string` - CSS text shadow
- `animation?: object` - Animation configuration
- `isEditable?: boolean` - Editable state

## Usage Examples

### Basic Text Editing
1. Add text to your timeline
2. Double-click the text on the canvas
3. Edit directly and press Enter to save

### AI Styling
1. Hover over text and click the sparkles icon
2. Enter a style description like "vintage movie poster style"
3. Review the generated options
4. Click on your preferred style to apply it

### Animations
1. Open the AI Text Editor
2. Go to the Animation tab
3. Choose an animation and click Preview
4. Animations play immediately on the canvas

## Future Enhancements

Potential future improvements:
- Timeline animation keyframes
- More animation presets
- Voice-to-text integration
- Collaborative editing
- Custom animation creation
- Style templates and saving

## Troubleshooting

### Common Issues
1. **API Key not working**: Ensure you have a valid Google AI Studio API key
2. **Animations not playing**: Check browser console for GSAP errors
3. **Text not editable**: Ensure the text element has `isEditable: true`

### Performance Tips
- Use shorter prompts for faster AI responses
- Limit animation complexity for better performance
- Cache frequently used styles locally

## Security Notes

- API keys are stored locally in browser storage
- No text content is sent to external servers except Google AI for style generation
- All styling happens client-side after AI generates the CSS properties
