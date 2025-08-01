import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { FONTS } from '../lib/globals';

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    ErrorBoundaryState
> {
    constructor(props: React.PropsWithChildren<{}>) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container sx={{
                    textAlign: 'center',
                    mt: 4,
                    color: '#bdeb92ff'
                }}>
                    <Typography variant="h4" fontFamily={FONTS.A_ART} sx={{ mb: 2 }}>
                        Oops! Something went wrong
                    </Typography>
                    <Button
                        onClick={() => window.location.reload()}
                        sx={{
                            backgroundColor: '#bdeb92ff',
                            color: '#121212',
                            fontFamily: FONTS.A_ART
                        }}
                    >
                        Reload Page
                    </Button>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;