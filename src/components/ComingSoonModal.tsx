import { Dialog, Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  bodySx,
  dialogPaperSx,
  goldButtonSx,
  headingSx,
} from "../lib/medievalStyles";

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  gameTitle: string;
}

const ComingSoonModal = ({
  open,
  onClose,
  gameTitle,
}: ComingSoonModalProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: dialogPaperSx,
      }}
    >
      <Box
        sx={{
          position: "relative",
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "parchment.dark",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h4"
          sx={{ ...headingSx, color: "parchment.main", textAlign: "center" }}
        >
          {gameTitle}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            ...headingSx,
            textAlign: "center",
          }}
        >
          Coming Soon!
        </Typography>

        <Typography
          variant="body1"
          sx={{
            ...bodySx,
            textAlign: "center",
          }}
        >
          This game is currently under development. Check back soon!
        </Typography>

        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            ...goldButtonSx,
            fontSize: "1.1rem",
            px: 4,
            py: 1.5,
            mt: 2,
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
};

export default ComingSoonModal;
