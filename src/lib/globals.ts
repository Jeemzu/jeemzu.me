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
    LINKEDIN: 'https://www.linkedin.com/in/james-friedenberg-664643255/',
    GITHUB: 'https://github.com/Jeemzu',
    MINECRAFT_CREDITS: 'https://www.minecraft.net/en-us/credits',
    EMAIL: 'mailto:jamesfriedenberg@gmail.com?subject=Hello from your website!',
    RESUME: resumePdf,
} as const;

// Layout Constants
export const LAYOUT = {
    SECTION_SPACING: '20vh',
    HEADER_SPACING: '50vh',
    ICON_SIZE: 80,
    CARD_ROTATION_RANGE: 5,
} as const;

// Animations & Effects
export const EFFECTS = {
    HOVER_SCALE: 'scale(1.01)',
    HOVER_OPACITY: 0.8,
    GLOW_FILTER: 'drop-shadow(0 0 10px var(--primary-green)) drop-shadow(0 0 20px var(--primary-green))',
} as const;