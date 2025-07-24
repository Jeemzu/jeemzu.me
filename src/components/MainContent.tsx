import { Grid, Container, IconButton } from "@mui/material";
import Home from "./Home";
import { FaCircleArrowUp } from "react-icons/fa6";
import { useEffect, useState } from "react";

const MainContent = () => {
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
            color: "#bdeb92ff",
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                backgroundImage: "url('/src/assets/images/bg.png')",
                backgroundRepeat: 'repeat',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 90%)',
                zIndex: 0
            },
        }}>
            <Grid container spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
                <Home />
            </Grid>

            {showScrollToTopButton && (
                <IconButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ color: "#bdeb92ff", position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
                    <FaCircleArrowUp size={40} />
                </IconButton>
            )}
        </Container>
    );
};

export default MainContent;