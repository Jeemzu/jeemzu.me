import { Alert, Box, Button, Tooltip } from "@mui/material";
import { FaCloudArrowUp, FaDownload } from "react-icons/fa6";
import { goldButtonSx } from "../../lib/medievalStyles";

interface Props {
  signedIn: boolean;
  disabled: boolean;
  error: string;
  onCloud: () => void;
  onLocal: () => void;
}

export default function GddSaveBar({
  signedIn,
  disabled,
  error,
  onCloud,
  onLocal,
}: Props) {
  return (
    <Box
      role="region"
      aria-label="Save GDD progress"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: { xs: 1, sm: 2 },
        p: 1.5,
        pb: "max(12px, env(safe-area-inset-bottom))",
        bgcolor: "medievalStone.dark",
        borderTop: "1px solid rgba(200,162,74,0.5)",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.35)",
      }}
    >
      {error && (
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      )}
      <Tooltip
        title={
          signedIn
            ? "Save editable progress to your account"
            : "Sign in to save to cloud"
        }
      >
        <Box
          component="span"
          sx={{ display: "flex", flex: 1, maxWidth: 240, minWidth: 0 }}
        >
          <Button
            variant="contained"
            sx={{
              ...goldButtonSx,
              fontSize: { xs: "0.7rem", sm: "0.875rem" },
              width: "100%",
              px: { xs: 1, sm: 2 },
              whiteSpace: "nowrap",
              "& .MuiButton-startIcon": {
                display: { xs: "none", sm: "inline-flex" },
              },
            }}
            startIcon={<FaCloudArrowUp />}
            disabled={!signedIn || disabled}
            onClick={onCloud}
          >
            SAVE TO CLOUD
          </Button>
        </Box>
      </Tooltip>
      <Button
        variant="contained"
        sx={{
          ...goldButtonSx,
          fontSize: { xs: "0.7rem", sm: "0.875rem" },
          flex: 1,
          maxWidth: 240,
          minWidth: 0,
          px: { xs: 1, sm: 2 },
          whiteSpace: "nowrap",
          "& .MuiButton-startIcon": {
            display: { xs: "none", sm: "inline-flex" },
          },
        }}
        startIcon={<FaDownload />}
        disabled={disabled}
        onClick={onLocal}
      >
        SAVE LOCALLY
      </Button>
    </Box>
  );
}
