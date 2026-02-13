import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
    children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
    const [location] = useLocation();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (location !== displayLocation) {
            setIsTransitioning(true);
            const timeout = setTimeout(() => {
                setDisplayLocation(location);
                setIsTransitioning(false);
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [location, displayLocation]);

    return (
        <Box
            sx={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(20px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            }}
        >
            {children}
        </Box>
    );
};

export default PageTransition;
