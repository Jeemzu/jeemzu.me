import { Dialog, Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FONTS } from '../lib/globals';

interface ComingSoonModalProps {
    open: boolean;
    onClose: () => void;
    gameTitle: string;
}

const ComingSoonModal = ({ open, onClose, gameTitle }: ComingSoonModalProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'darkBackground.main',
                },
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                }}
            >
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'white',
                    }}
                >
                    <CloseIcon />
                </IconButton>

                <Typography variant="h4" sx={{ color: 'white', fontFamily: FONTS.A_ART, textAlign: 'center' }}>
                    {gameTitle}
                </Typography>

                <Typography
                    variant="h5"
                    sx={{
                        color: 'primaryGreen.main',
                        fontFamily: FONTS.TRAP_BLACK,
                        textAlign: 'center',
                    }}
                >
                    Coming Soon!
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        color: 'textSecondary.main',
                        fontFamily: FONTS.TRAP_BLACK,
                        textAlign: 'center',
                    }}
                >
                    This game is currently under development. Check back soon!
                </Typography>

                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        bgcolor: 'primaryGreen.main',
                        color: 'darkBackground.main',
                        fontFamily: FONTS.A_ART,
                        px: 4,
                        py: 1.5,
                        mt: 2,
                        '&:hover': {
                            bgcolor: 'primaryGreen.light',
                            transform: 'translateY(-2px)',
                        },
                    }}
                >
                    Close
                </Button>
            </Box>
        </Dialog>
    );
};

export default ComingSoonModal;
