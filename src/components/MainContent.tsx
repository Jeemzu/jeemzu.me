import { Container, IconButton, useTheme } from "@mui/material";
import Home from "./Home";
import { FaCircleArrowUp } from "react-icons/fa6";
import { useEffect, useState } from "react";
import bgImage from '../assets/images/bg.png';
import { EFFECTS } from "../lib/globals";

const MainContent = () => {
    const theme = useTheme();
    const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollToTopButton(window.scrollY > 300);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <Container maxWidth={false} sx={{
            py: "20%",
            position: 'relative',
            color: theme.palette.primaryGreen.main,
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                backgroundImage: `url(${bgImage})`,
                backgroundRepeat: 'repeat',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 90%)',
                zIndex: 0
            },
        }}>
            <Home />
            {showScrollToTopButton && (
                <IconButton
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    sx={{
                        color: theme.palette.primaryGreen.main,
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1000,
                        '&:hover': {
                            color: theme.palette.whiteHover.main,
                            filter: EFFECTS.GLOW_FILTER
                        }
                    }}
                >
                    <FaCircleArrowUp size={40} />
                </IconButton>
            )}
        </Container>
    );
};

export default MainContent;