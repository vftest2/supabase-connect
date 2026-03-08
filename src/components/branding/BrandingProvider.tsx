import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hexToHSL, getForegroundForBg, lightenHex, darkenHex } from '@/lib/theme-presets';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { entity } = useAuth();

  useEffect(() => {
    if (!entity) return;

    const root = document.documentElement;
    const primary = entity.primary_color || '#E85A4F';
    const secondary = entity.secondary_color || '#F5F0EB';
    const accent = entity.accent_color || '#E8A83C';
    const sidebar = entity.sidebar_color || '#1a1a2e';

    // Primary colors
    root.style.setProperty('--primary', hexToHSL(primary));
    root.style.setProperty('--primary-foreground', getForegroundForBg(primary));
    root.style.setProperty('--primary-glow', hexToHSL(lightenHex(primary, 0.2)));
    root.style.setProperty('--ring', hexToHSL(primary));

    // Secondary colors
    root.style.setProperty('--secondary', hexToHSL(secondary));
    root.style.setProperty('--secondary-foreground', getForegroundForBg(secondary));

    // Accent colors
    root.style.setProperty('--accent', hexToHSL(accent));
    root.style.setProperty('--accent-foreground', getForegroundForBg(accent));

    // Sidebar colors
    root.style.setProperty('--sidebar-background', hexToHSL(sidebar));
    root.style.setProperty('--sidebar-foreground', getForegroundForBg(sidebar));
    root.style.setProperty('--sidebar-primary', hexToHSL(primary));
    root.style.setProperty('--sidebar-primary-foreground', getForegroundForBg(primary));
    root.style.setProperty('--sidebar-accent', hexToHSL(lightenHex(sidebar, 0.15)));
    root.style.setProperty('--sidebar-accent-foreground', getForegroundForBg(lightenHex(sidebar, 0.15)));
    root.style.setProperty('--sidebar-border', hexToHSL(lightenHex(sidebar, 0.1)));
    root.style.setProperty('--sidebar-ring', hexToHSL(primary));

    // Muted (derived from secondary)
    root.style.setProperty('--muted', hexToHSL(secondary));
    root.style.setProperty('--muted-foreground', hexToHSL(darkenHex(secondary, 0.5)));

    // Border/input derived from secondary
    root.style.setProperty('--border', hexToHSL(darkenHex(secondary, 0.1)));
    root.style.setProperty('--input', hexToHSL(darkenHex(secondary, 0.1)));

    // Gradients
    root.style.setProperty('--gradient-warm', `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`);
    root.style.setProperty('--shadow-glow', `0 0 30px ${primary}26`);

    // Theme class
    const theme = entity.theme || 'dark';
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // auto
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }

    return () => {
      const vars = [
        '--primary', '--primary-foreground', '--primary-glow', '--ring',
        '--secondary', '--secondary-foreground',
        '--accent', '--accent-foreground',
        '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
        '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
        '--sidebar-border', '--sidebar-ring',
        '--muted', '--muted-foreground', '--border', '--input',
        '--gradient-warm', '--shadow-glow',
      ];
      vars.forEach(v => root.style.removeProperty(v));
    };
  }, [entity]);

  return <>{children}</>;
}
