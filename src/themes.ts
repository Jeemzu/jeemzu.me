// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#38C767',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#C76738',
            contrastText: '#ffffff',
        },
        background: {
            default: '#ffffff',   // page background
            paper: '#f9f9f9',     // cards, surfaces
        },
        text: {
            primary: '#212121',   // main body text
            secondary: '#555555', // muted text
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
