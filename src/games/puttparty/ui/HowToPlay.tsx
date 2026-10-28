import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { bodySx, dialogPaperSx, goldButtonSx, headingSx, outlineButtonSx } from "../../../lib/medievalStyles";
import { t, type StringKey } from "../strings";

const STEPS: StringKey[] = ["howTo.aim", "howTo.power", "howTo.camera", "howTo.turns", "howTo.score"];

/** Start-menu slot: opens the How to Play dialog. */
export function HowToPlayButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => setOpen(true)} sx={outlineButtonSx}>
        {t("menu.howToPlay")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: dialogPaperSx } }}>
        <DialogTitle sx={headingSx}>{t("howTo.title")}</DialogTitle>
        <DialogContent>
          <List dense>
            {STEPS.map((key) => (
              <ListItem key={key} disableGutters>
                <ListItemText primary={t(key)} slotProps={{ primary: { sx: bodySx } }} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" autoFocus onClick={() => setOpen(false)} sx={goldButtonSx}>{t("howTo.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
