import { Container, IconButton, useTheme } from "@mui/material";
import Home from "./Home";
import { FaCircleArrowUp } from "react-icons/fa6";
import { useEffect, useState } from "react";
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
                        transition: EFFECTS.TRANSITION,
                        '&:hover': {
                            color: theme.palette.softGreen.main,
                            transform: 'scale(1.1)'
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