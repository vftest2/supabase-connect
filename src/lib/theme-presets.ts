export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
    sidebar: string;
  };
  colors: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    sidebar_color: string;
  };
}

export const themePresets: ThemePreset[] = [
  {
    id: 'coral-warmth',
    name: 'Coral Quente',
    description: 'Tons quentes e acolhedores com coral vibrante',
    preview: { primary: '#E85A4F', secondary: '#F5F0EB', accent: '#E8A83C', sidebar: '#1a1a2e' },
    colors: { primary_color: '#E85A4F', secondary_color: '#F5F0EB', accent_color: '#E8A83C', sidebar_color: '#1a1a2e' },
  },
  {
    id: 'midnight-blue',
    name: 'Azul Meia-Noite',
    description: 'Elegância com azul profundo e dourado',
    preview: { primary: '#2563EB', secondary: '#F0F4FF', accent: '#D4A853', sidebar: '#0F172A' },
    colors: { primary_color: '#2563EB', secondary_color: '#F0F4FF', accent_color: '#D4A853', sidebar_color: '#0F172A' },
  },
  {
    id: 'emerald-forest',
    name: 'Esmeralda',
    description: 'Verde sofisticado com toques terrosos',
    preview: { primary: '#059669', secondary: '#F0FDF4', accent: '#D97706', sidebar: '#064E3B' },
    colors: { primary_color: '#059669', secondary_color: '#F0FDF4', accent_color: '#D97706', sidebar_color: '#064E3B' },
  },
  {
    id: 'royal-purple',
    name: 'Roxo Real',
    description: 'Luxo e sofisticação com púrpura',
    preview: { primary: '#7C3AED', secondary: '#F5F3FF', accent: '#EC4899', sidebar: '#1E1B4B' },
    colors: { primary_color: '#7C3AED', secondary_color: '#F5F3FF', accent_color: '#EC4899', sidebar_color: '#1E1B4B' },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Delicado e feminino com tons rosados',
    preview: { primary: '#E11D48', secondary: '#FFF1F2', accent: '#CA8A04', sidebar: '#4C0519' },
    colors: { primary_color: '#E11D48', secondary_color: '#FFF1F2', accent_color: '#CA8A04', sidebar_color: '#4C0519' },
  },
  {
    id: 'ocean-breeze',
    name: 'Brisa do Oceano',
    description: 'Azul-turquesa refrescante e moderno',
    preview: { primary: '#0891B2', secondary: '#ECFEFF', accent: '#F59E0B', sidebar: '#164E63' },
    colors: { primary_color: '#0891B2', secondary_color: '#ECFEFF', accent_color: '#F59E0B', sidebar_color: '#164E63' },
  },
  {
    id: 'slate-minimal',
    name: 'Minimalista',
    description: 'Clean e profissional com cinzas neutros',
    preview: { primary: '#334155', secondary: '#F8FAFC', accent: '#3B82F6', sidebar: '#0F172A' },
    colors: { primary_color: '#334155', secondary_color: '#F8FAFC', accent_color: '#3B82F6', sidebar_color: '#0F172A' },
  },
  {
    id: 'sunset-orange',
    name: 'Pôr do Sol',
    description: 'Vibrante com laranja e vermelho quente',
    preview: { primary: '#EA580C', secondary: '#FFF7ED', accent: '#DC2626', sidebar: '#431407' },
    colors: { primary_color: '#EA580C', secondary_color: '#FFF7ED', accent_color: '#DC2626', sidebar_color: '#431407' },
  },
];

// Utility: hex to HSL string for CSS variables
export function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Get relative luminance for contrast calculations
export function getLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Determine if text should be white or dark on a given background
export function getForegroundForBg(bgHex: string): string {
  return getLuminance(bgHex) > 0.4 ? '0 0% 10%' : '0 0% 100%';
}

// Lighten a hex color
export function lightenHex(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Darken a hex color
export function darkenHex(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
