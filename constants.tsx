
import { Preset } from './types';

export const PRESETS: Preset[] = [
  {
    id: 'professional',
    label: 'Corporate Chic',
    prompt: 'Enhance this photo to look like a high-quality professional portrait. Soften the background lighting, sharpen facial features naturally, and ensure a clean, high-end atmosphere suitable for a professional dating profile.',
    description: 'Clean, professional, and trustworthy.',
    icon: '👔'
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    prompt: 'Apply a warm, golden hour sunset glow to the entire photo. Make the lighting soft and flattering on the skin, and give the background a slightly blurred, romantic outdoor feel.',
    description: 'Warm, flattering sunset vibes.',
    icon: '🌅'
  },
  {
    id: 'adventure',
    label: 'Adventurer',
    prompt: 'Modify the background to look like a scenic mountain or coastal trail. Keep the subject unchanged but integrate them naturally into the new, vibrant outdoor setting.',
    description: 'Great for showing your active side.',
    icon: '⛰️'
  },
  {
    id: 'cafe-vibes',
    label: 'Urban Cafe',
    prompt: 'Change the background to a stylish, modern interior of a cozy urban cafe. Add a slight bokeh effect to the background and warm up the indoor lighting.',
    description: 'Cozy, approachable, and social.',
    icon: '☕'
  },
  {
    id: 'bw-classic',
    label: 'Classic Noir',
    prompt: 'Convert to a high-contrast, professional black and white portrait with film grain. Focus on dramatic lighting and sharp details.',
    description: 'Sophisticated and timeless.',
    icon: '🎞️'
  },
  {
    id: 'cleanup',
    label: 'Clean Background',
    prompt: 'Remove any distracting objects or clutter from the background. Keep the subject exactly as they are but make the background minimalist and neat.',
    description: 'Removes distractions behind you.',
    icon: '🧹'
  }
];
