import { Container, Grid, Typography } from "@mui/material"
import React from "react"

const Footer = () => {
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
                        <Typography variant="body2">
                            © 2025 James Friedenberg
                        </Typography>
                    </Grid>
                </Grid>
            </Container>
        </React.Fragment>
    )
}

export default Footer;