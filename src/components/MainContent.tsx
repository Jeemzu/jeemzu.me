import { Container, IconButton, useTheme } from "@mui/material";
import Home from "./Home";
import { FaCircleArrowUp } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { EFFECTS } from "../lib/globals";
import bg from '../assets/images/bg.png';

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
            backgroundImage: `url(${bg})`,
            backgroundRepeat: 'repeat',
            backgroundAttachment: 'fixed',
            backgroundSize: 'auto',
            backgroundColor: '#121212',
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