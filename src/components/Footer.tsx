import { Container, Grid, Typography, useTheme } from "@mui/material"
import React from "react"
import { FONTS } from "../lib/globals"

const Footer = () => {
    const theme = useTheme();

    return (
        <React.Fragment>
            <Container
                sx={{
                    pb: { xs: 20, sm: 24 },
                    color: 'rgba(255, 255, 255, 0.9)',
                }}
                maxWidth={false}
            >
                <Grid container sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    bottom: 0,
                    left: 0,
                    right: 0,
                }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography
                            variant="body2"
                            fontFamily={FONTS.A_ART}
                            sx={{
                                color: theme.palette.primaryGreen.main,
                                textAlign: 'center'
                            }}
                        >
                            © 2025 James Friedenberg
                        </Typography>
                    </Grid>
                </Grid>
            </Container>
        </React.Fragment>
    )
}

export default Footer;