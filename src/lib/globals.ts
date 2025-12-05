import resumePdf from '../assets/james_friedenberg_resume.pdf';

// Fonts
export const FONTS = {
    A_ART: 'aArt',
    TRAP_BLACK: 'Trap-Black',
    PALACE: 'Palace',
    PIXER: 'Pixer',
    TOP_SHOW: 'TopShow',
} as const;

// Personal Links
export const LINKS = {
    LINKEDIN: 'https://www.linkedin.com/in/james-friedenberg-664643105',
    GITHUB: 'https://github.com/Jeemzu',
    MINECRAFT_CREDITS: 'https://www.minecraft.net/en-us/credits',
    EMAIL: 'mailto:jamesfriedenberg@gmail.com?subject=Hello from your website!',
    RESUME: resumePdf,
} as const;

// Layout Constants
export const LAYOUT = {
    SECTION_SPACING: 8, // rem units for consistent spacing
    CONTENT_MAX_WIDTH: 1200,
    ICON_SIZE: 24,
    CARD_ROTATION_RANGE: 2, // Reduced for subtlety
} as const;

// Spacing Scale (in rem)
export const SPACING = {
    XS: 0.5,
    SM: 1,
    MD: 2,
    LG: 4,
    XL: 6,
    XXL: 8,
} as const;

// Animations & Effects
export const EFFECTS = {
    HOVER_SCALE: 'scale(1.02)',
    HOVER_OPACITY: 0.9,
    TRANSITION: 'all 0.2s ease-in-out',
    CARD_SHADOW: '0 4px 20px rgba(0, 0, 0, 0.3)',
    CARD_SHADOW_HOVER: '0 8px 30px rgba(168, 214, 126, 0.15)',
} as const;

// Animation Keyframes & Durations
export const ANIMATIONS = {
    FADE_IN: {
        opacity: 0,
        transform: 'translateY(30px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    },
    FADE_IN_VISIBLE: {
        opacity: 1,
        transform: 'translateY(0)',
    },
    SLIDE_IN_LEFT: {
        opacity: 0,
        transform: 'translateX(-40px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
    },
    SLIDE_IN_LEFT_VISIBLE: {
        opacity: 1,
        transform: 'translateX(0)',
    },
    SLIDE_IN_RIGHT: {
        opacity: 0,
        transform: 'translateX(40px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
    },
    SLIDE_IN_RIGHT_VISIBLE: {
        opacity: 1,
        transform: 'translateX(0)',
    },
    STAGGER_DELAY: 0.1, // seconds between each item in a staggered animation
} as const;