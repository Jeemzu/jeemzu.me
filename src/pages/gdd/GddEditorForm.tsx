import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FaArrowDown,
  FaArrowUp,
  FaChevronDown,
  FaPlus,
  FaTrash,
  FaUpload,
} from "react-icons/fa6";
import {
  bodySx,
  dialogPaperSx,
  fieldSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import { LIMITS } from "./document";
import {
  moveItem,
  newImageGroup,
  newSection,
  newText,
  type EditorDraft,
  type EditorItem,
} from "./editor";
import type { PdfImage } from "./images";

interface Props {
  draft: EditorDraft;
  images: Record<string, PdfImage>;
  disabled: boolean;
  onChange: (draft: EditorDraft) => void;
  onUpload: (sectionId: string, groupId: string, files: File[]) => void;
}

function ItemActions({
  label,
  first,
  last,
  onMove,
  onRemove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <Stack direction="row" sx={{ flexShrink: 0 }}>
      <Tooltip title="Move up">
        <span>
          <IconButton
            aria-label={`Move ${label} up`}
            disabled={first}
            onClick={() => onMove(-1)}
          >
            <FaArrowUp size={14} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move down">
        <span>
          <IconButton
            aria-label={`Move ${label} down`}
            disabled={last}
            onClick={() => onMove(1)}
          >
            <FaArrowDown size={14} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Remove">
        <IconButton aria-label={`Remove ${label}`} onClick={onRemove}>
          <FaTrash size={14} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function GddEditorForm({
  draft,
  images,
  disabled,
  onChange,
  onUpload,
}: Props) {
  const [expanded, setExpanded] = useState<string | false>(
    draft.sections[0]?.id ?? false,
  );
  const [removal, setRemoval] = useState<{
    label: string;
    confirm: () => void;
  } | null>(null);

  function updateSection(
    sectionId: string,
    update: (items: EditorItem[]) => EditorItem[],
  ) {
    onChange({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: update(section.items) }
          : section,
      ),
    });
  }

  function updateItem(sectionId: string, item: EditorItem) {
    updateSection(sectionId, (items) =>
      items.map((current) => (current.id === item.id ? item : current)),
    );
  }

  const count = draft.sections.reduce(
    (total, section) => total + section.items.length,
    0,
  );
  return (
    <>
      <Box
        component="fieldset"
        disabled={disabled}
        sx={{
          border: 0,
          m: 0,
          p: 0,
          minWidth: 0,
          "& .MuiIconButton-root": { color: "parchment.main" },
          "& .MuiIconButton-root.Mui-disabled": {
            color: "rgba(230,220,196,0.25)",
          },
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ ...panelSx, p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={headingSx}>
                Document details
              </Typography>
              <TextField
                label="Game title"
                value={draft.title}
                onChange={(event) =>
                  onChange({ ...draft, title: event.target.value })
                }
                slotProps={{ htmlInput: { maxLength: 100 } }}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="Cover text"
                value={draft.introduction}
                onChange={(event) =>
                  onChange({ ...draft, introduction: event.target.value })
                }
                multiline
                minRows={2}
                maxRows={8}
                fullWidth
                sx={fieldSx}
              />
            </Stack>
          </Box>
          {draft.sections.map((section, sectionIndex) => (
            <Box key={section.id} sx={panelSx} data-section-id={section.id}>
              <Stack
                direction="row"
                alignItems="center"
                sx={{ px: 2, pt: 1 }}
                justifyContent="space-between"
              >
                <Typography sx={bodySx}>Section {sectionIndex + 1}</Typography>
                <ItemActions
                  label={`section ${sectionIndex + 1}`}
                  first={sectionIndex === 0}
                  last={sectionIndex === draft.sections.length - 1}
                  onMove={(direction) =>
                    onChange({
                      ...draft,
                      sections: moveItem(
                        draft.sections,
                        sectionIndex,
                        direction,
                      ),
                    })
                  }
                  onRemove={() =>
                    setRemoval({
                      label: section.title || `Section ${sectionIndex + 1}`,
                      confirm: () =>
                        onChange({
                          ...draft,
                          sections: draft.sections.filter(
                            (entry) => entry.id !== section.id,
                          ),
                        }),
                    })
                  }
                />
              </Stack>
              <Accordion
                expanded={expanded === section.id}
                onChange={(_, open) => setExpanded(open ? section.id : false)}
                disableGutters
                elevation={0}
                sx={{
                  background: "transparent",
                  "&::before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<FaChevronDown />}
                  aria-controls={`details-${section.id}`}
                  id={`summary-${section.id}`}
                >
                  <Typography sx={{ ...headingSx, overflowWrap: "anywhere" }}>
                    {section.title || "Untitled section"}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails id={`details-${section.id}`}>
                  <Stack spacing={2}>
                    <TextField
                      label="Section title"
                      value={section.title}
                      fullWidth
                      sx={fieldSx}
                      slotProps={{ htmlInput: { maxLength: 100 } }}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          sections: draft.sections.map((entry) =>
                            entry.id === section.id
                              ? { ...entry, title: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    {section.items.map((item, itemIndex) => {
                      const label = `${item.type === "text" ? "subsection" : "image category"} ${itemIndex + 1} in section ${sectionIndex + 1}`;
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            border: "1px solid rgba(200,162,74,0.25)",
                            borderRadius: 1,
                            p: { xs: 1.5, sm: 2 },
                            minWidth: 0,
                          }}
                        >
                          <Stack spacing={2}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography sx={bodySx}>
                                {item.type === "text"
                                  ? "Subsection"
                                  : "Image category"}
                              </Typography>
                              <ItemActions
                                label={label}
                                first={itemIndex === 0}
                                last={itemIndex === section.items.length - 1}
                                onMove={(direction) =>
                                  updateSection(section.id, (items) =>
                                    moveItem(items, itemIndex, direction),
                                  )
                                }
                                onRemove={() =>
                                  setRemoval({
                                    label: item.heading || label,
                                    confirm: () =>
                                      updateSection(section.id, (items) =>
                                        items.filter(
                                          (entry) => entry.id !== item.id,
                                        ),
                                      ),
                                  })
                                }
                              />
                            </Stack>
                            <TextField
                              label={
                                item.type === "text"
                                  ? "Subheading"
                                  : "Image category title"
                              }
                              value={item.heading}
                              fullWidth
                              sx={fieldSx}
                              slotProps={{ htmlInput: { maxLength: 100 } }}
                              onChange={(event) =>
                                updateItem(section.id, {
                                  ...item,
                                  heading: event.target.value,
                                  headingMarkdown: undefined,
                                })
                              }
                            />
                            {item.type === "text" ? (
                              <Tooltip
                                title="Paragraphs, lists, tables and inline Markdown are supported. Empty subsections are omitted from the PDF."
                                placement="top-start"
                              >
                                <TextField
                                  label="Body text"
                                  value={item.body}
                                  multiline
                                  minRows={4}
                                  maxRows={20}
                                  fullWidth
                                  sx={fieldSx}
                                  onChange={(event) =>
                                    updateItem(section.id, {
                                      ...item,
                                      body: event.target.value,
                                    })
                                  }
                                />
                              </Tooltip>
                            ) : (
                              <>
                                {item.images.map((image, imageIndex) => (
                                  <Box
                                    key={image.id}
                                    sx={{
                                      borderTop:
                                        "1px solid rgba(200,162,74,0.2)",
                                      pt: 2,
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                    >
                                      <Typography sx={bodySx}>
                                        Image {imageIndex + 1}
                                      </Typography>
                                      <ItemActions
                                        label={`image ${imageIndex + 1} in ${label}`}
                                        first={imageIndex === 0}
                                        last={
                                          imageIndex === item.images.length - 1
                                        }
                                        onMove={(direction) =>
                                          updateItem(section.id, {
                                            ...item,
                                            images: moveItem(
                                              item.images,
                                              imageIndex,
                                              direction,
                                            ),
                                          })
                                        }
                                        onRemove={() =>
                                          setRemoval({
                                            label: image.caption || "Image",
                                            confirm: () =>
                                              updateItem(section.id, {
                                                ...item,
                                                images: item.images.filter(
                                                  (entry) =>
                                                    entry.id !== image.id,
                                                ),
                                              }),
                                          })
                                        }
                                      />
                                    </Stack>
                                    <Box
                                      component="img"
                                      src={images[image.path]?.src}
                                      alt={
                                        image.caption || "Uploaded reference"
                                      }
                                      sx={{
                                        display: "block",
                                        maxWidth: "100%",
                                        height: 160,
                                        objectFit: "contain",
                                        my: 1,
                                      }}
                                    />
                                    <TextField
                                      label="Caption / source"
                                      value={image.caption}
                                      fullWidth
                                      sx={fieldSx}
                                      slotProps={{
                                        htmlInput: { maxLength: 400 },
                                      }}
                                      onChange={(event) =>
                                        updateItem(section.id, {
                                          ...item,
                                          images: item.images.map((entry) =>
                                            entry.id === image.id
                                              ? {
                                                  ...entry,
                                                  caption: event.target.value,
                                                }
                                              : entry,
                                          ),
                                        })
                                      }
                                    />
                                  </Box>
                                ))}
                                <Button
                                  component="label"
                                  variant="outlined"
                                  startIcon={<FaUpload />}
                                  sx={{
                                    ...outlineButtonSx,
                                    alignSelf: "flex-start",
                                  }}
                                  disabled={disabled}
                                >
                                  Add images
                                  <input
                                    hidden
                                    type="file"
                                    multiple
                                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                    aria-label={`Upload images to ${item.heading || label}`}
                                    onChange={(event) => {
                                      const files = Array.from(
                                        event.target.files ?? [],
                                      );
                                      event.target.value = "";
                                      if (files.length)
                                        onUpload(section.id, item.id, files);
                                    }}
                                  />
                                </Button>
                              </>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Button
                        variant="outlined"
                        sx={outlineButtonSx}
                        startIcon={<FaPlus />}
                        disabled={count >= 400}
                        onClick={() =>
                          updateSection(section.id, (items) => [
                            ...items,
                            newText(),
                          ])
                        }
                      >
                        Add subsection
                      </Button>
                      <Button
                        variant="outlined"
                        sx={outlineButtonSx}
                        startIcon={<FaPlus />}
                        disabled={count >= 400}
                        onClick={() =>
                          updateSection(section.id, (items) => [
                            ...items,
                            newImageGroup(),
                          ])
                        }
                      >
                        Add image category
                      </Button>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Box>
          ))}
          <Button
            variant="outlined"
            sx={{ ...outlineButtonSx, alignSelf: "flex-start" }}
            startIcon={<FaPlus />}
            disabled={draft.sections.length >= LIMITS.sections || count >= 400}
            onClick={() => {
              const section = newSection();
              setExpanded(section.id);
              onChange({ ...draft, sections: [...draft.sections, section] });
            }}
          >
            Add section
          </Button>
        </Stack>
      </Box>
      <Dialog
        open={removal !== null}
        onClose={() => setRemoval(null)}
        slotProps={{ paper: { sx: dialogPaperSx } }}
      >
        <DialogTitle sx={headingSx}>Remove {removal?.label}?</DialogTitle>
        <DialogActions>
          <Button sx={outlineButtonSx} onClick={() => setRemoval(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              removal?.confirm();
              setRemoval(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
