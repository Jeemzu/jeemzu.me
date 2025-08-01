import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        primaryGreen: Palette['primary'];
        darkBackground: Palette['primary'];
        whiteHover: Palette['primary'];
    }

    interface PaletteOptions {
        primaryGreen?: PaletteOptions['primary'];
        darkBackground?: PaletteOptions['primary'];
        whiteHover?: PaletteOptions['primary'];
    }
}

const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
        primaryGreen: {
            main: '#bdeb92ff',
            contrastText: '#000000',
        },
        darkBackground: {
            main: '#222222ff',
            contrastText: '#ffffff',
        },
        whiteHover: {
            main: '#ffffffff',
            contrastText: '#000000',
        },
    },
    typography: {
        fontFamily: 'Palace, Avenir, Helvetica, Arial, sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiTypography: {
            defaultProps: {
                variantMapping: {
                    h1: 'h1',
                    h2: 'h2',
                    h3: 'h3',
                    h4: 'h4',
                    h5: 'h5',
                    h6: 'h6',
                    subtitle1: 'h6',
                    subtitle2: 'h6',
                    body1: 'span',
                    body2: 'span',
                },
            },
        },
    },
});

// CSS Custom Properties for use in non-MUI contexts
export const CSS_VARS = {
    '--primary-green': '#bdeb92ff',
    '--dark-background': '#222222ff',
    '--white-hover': '#ffffffff',
} as const;

export default theme;
