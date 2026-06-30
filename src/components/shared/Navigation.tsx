import { AppBar, Toolbar, Button, Stack, useTheme, useMediaQuery, IconButton, Drawer, Box, Chip, Tooltip } from "@mui/material";
import { Link, useLocation } from "wouter";
import { FONTS, LINKS } from "../../lib/globals";
import { FaGithub, FaLinkedin, FaBars, FaTimes, FaUnlock } from "react-icons/fa";
import { useState } from "react";
import { onClickUrl } from "../../utils/openInNewTab";
import { useAuthStore } from "../../stores/authStore";
import UserAuthModal from "./UserAuthModal";

const Navigation = () => {
    const theme = useTheme();
    const [location] = useLocation();
    const isMobile = useMediaQuery('(max-width:900px)');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const { isAuthenticated, username, role, logout } = useAuthStore();

    const navItems = [
        { label: "Home", path: "/" },
        { label: "Projects", path: "/projects" },
        { label: "Experience", path: "/experience" },
        { label: "Games", path: "/games" },
        ...(role === 'Admin' ? [{ label: "Admin", path: "/admin" }] : []),
    ];

    const NavButton = ({ label, path, mobile = false }: { label: string; path: string; mobile?: boolean }) => {
        const isActive = location === path;

        return (
            <Link href={path}>
                <Button
                    sx={{
                        color: isActive ? theme.palette.text.primary : theme.palette.textSecondary.main,
                        fontFamily: FONTS.NECTO_MONO,
                        fontWeight: 700,
                        fontSize: mobile ? '1.8rem' : '1.1rem',
                        px: 2,
                        borderBottom: isActive ? `2px solid ${theme.palette.primaryGreen.main}` : 'none',
                        borderRadius: 0,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            color: theme.palette.primaryGreen.main,
                            backgroundColor: 'rgba(168, 214, 126, 0.08)',
                        },
                        ...(mobile && {
                            width: '100%',
                            justifyContent: 'flex-start',
                            py: 2,
                        })
                    }}
                    onClick={() => mobile && setDrawerOpen(false)}
                >
                    {label}
                </Button>
            </Link>
        );
    };

    const MobileDrawer = () => (
        <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{
                '& .MuiDrawer-paper': {
                    backgroundColor: theme.palette.darkBackground.main,
                    width: '70%',
                    maxWidth: '300px',
                }
            }}
        >
            <Box sx={{ p: 2 }}>
                <IconButton
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                        color: theme.palette.primaryGreen.main,
                        mb: 2,
                    }}
                >
                    <FaTimes size={24} />
                </IconButton>

                <Stack spacing={1}>
                    {navItems.map((item) => (
                        <NavButton key={item.path} {...item} mobile />
                    ))}
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
                    <IconButton
                        onClick={onClickUrl(LINKS.GITHUB)}
                        sx={{
                            color: theme.palette.textSecondary.main,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                color: theme.palette.primaryGreen.main,
                            }
                        }}
                    >
                        <FaGithub size={24} />
                    </IconButton>
                    <IconButton
                        onClick={onClickUrl(LINKS.LINKEDIN)}
                        sx={{
                            color: theme.palette.textSecondary.main,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                color: theme.palette.primaryGreen.main,
                            }
                        }}
                    >
                        <FaLinkedin size={24} />
                    </IconButton>
                </Stack>
            </Box>
        </Drawer>
    );

    return (
        <>
            <AppBar
                position="sticky"
                sx={{
                    backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Logo/Name */}
                    <Link href="/">
                        <Button
                            sx={{
                                color: theme.palette.primaryGreen.main,
                                fontFamily: FONTS.NECTO_MONO,
                                fontSize: '1.75rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    color: theme.palette.softGreen.main,
                                    backgroundColor: 'transparent',
                                }
                            }}
                        >
                            JF
                        </Button>
                    </Link>

                    {/* Desktop Navigation */}
                    {!isMobile ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            {navItems.map((item) => (
                                <NavButton key={item.path} {...item} />
                            ))}

                            <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                                <IconButton
                                    onClick={onClickUrl(LINKS.GITHUB)}
                                    sx={{
                                        color: theme.palette.textSecondary.main,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            color: theme.palette.primaryGreen.main,
                                        }
                                    }}
                                >
                                    <FaGithub size={20} />
                                </IconButton>
                                <IconButton
                                    onClick={onClickUrl(LINKS.LINKEDIN)}
                                    sx={{
                                        color: theme.palette.textSecondary.main,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            color: theme.palette.primaryGreen.main,
                                        }
                                    }}
                                >
                                    <FaLinkedin size={20} />
                                </IconButton>
                            </Stack>

                            {/* Auth — visible only to the site owner */}
                            {isAuthenticated ? (
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
                                    <Chip
                                        label={role === 'Admin' ? `${username} · Admin` : `${username}`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(168, 214, 126, 0.12)',
                                            color: 'primaryGreen.main',
                                            fontFamily: FONTS.NECTO_MONO,
                                            fontSize: '0.7rem',
                                            border: '1px solid rgba(168, 214, 126, 0.25)',
                                        }}
                                    />
                                    <Tooltip title="Sign out">
                                        <IconButton
                                            onClick={() => void logout()}
                                            sx={{
                                                color: 'rgba(255,255,255,0.35)',
                                                '&:hover': { color: '#f44336' },
                                            }}
                                        >
                                            <FaUnlock size={14} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            ) : (
                                <Button
                                    onClick={() => setLoginOpen(true)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        ml: 1,
                                        color: theme.palette.textSecondary.main,
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        fontFamily: FONTS.NECTO_MONO,
                                        fontSize: '0.75rem',
                                        px: 1.5,
                                        py: 0.5,
                                        minWidth: 'auto',
                                        '&:hover': {
                                            borderColor: theme.palette.primaryGreen.main,
                                            color: theme.palette.primaryGreen.main,
                                            bgcolor: 'rgba(168, 214, 126, 0.06)',
                                        },
                                    }}
                                >
                                    Login
                                </Button>
                            )}
                        </Stack>
                    ) : (
                        /* Mobile Menu Button */
                        <IconButton
                            onClick={() => setDrawerOpen(true)}
                            sx={{
                                color: theme.palette.primaryGreen.main,
                            }}
                        >
                            <FaBars size={24} />
                        </IconButton>
                    )}
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            {isMobile && <MobileDrawer />}

            <UserAuthModal open={loginOpen} onClose={() => setLoginOpen(false)} defaultTab="login" />
        </>
    );
};

export default Navigation;
