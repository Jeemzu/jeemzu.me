import { useId, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TabScrollButton,
  type TabScrollButtonProps,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FaArrowDown,
  FaArrowUp,
  FaPlus,
  FaTrash,
  FaUpload,
} from "react-icons/fa6";
import {
  bodySx,
  dialogPaperSx,
  fieldSx,
  goldButtonSx,
  headingSx,
  outlineButtonSx,
  panelSx,
} from "../../lib/medievalStyles";
import { LIMITS } from "./document";
import {
  moveItem,
  canCompleteSetup,
  newImageGroup,
  newSection,
  newText,
  type EditorDraft,
  type EditorItem,
} from "./editor";
import type { PdfImage } from "./images";
import PrototypeFields from "./PrototypeFields";
import TechnicalDetails from "./technical/TechnicalDetails";

interface Props {
  draft: EditorDraft;
  images: Record<string, PdfImage>;
  disabled: boolean;
  onChange: (draft: EditorDraft) => void;
  onUpload: (sectionId: string, groupId: string, files: File[]) => void;
}

function SectionTabScrollButton(props: TabScrollButtonProps) {
  return (
    <TabScrollButton
      {...props}
      aria-label={
        props.direction === "left" ? "Scroll tabs left" : "Scroll tabs right"
      }
    />
  );
}

function EditableCardTitle({
  value,
  label,
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function finish() {
    setEditing(false);
    if (text !== value) onChange(text);
  }

  return editing ? (
    <TextField
      autoFocus
      label={label}
      value={text}
      disabled={disabled}
      size="small"
      fullWidth
      sx={fieldSx}
      slotProps={{ htmlInput: { maxLength: 100 } }}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setText(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.querySelector("input")?.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
        }
      }}
    />
  ) : (
    <Typography component="h3" sx={{ m: 0, minWidth: 0, flex: 1 }}>
      <Button
        disabled={disabled}
        aria-label={`Edit ${label.toLowerCase()}: ${value || "Untitled"}`}
        onClick={() => {
          setText(value);
          setEditing(true);
        }}
        sx={{
          ...headingSx,
          textTransform: "none",
          textAlign: "left",
          justifyContent: "flex-start",
          overflowWrap: "anywhere",
          minWidth: 0,
          maxWidth: "100%",
          px: 0.5,
          fontSize: "1.1rem",
        }}
      >
        {value || "Untitled"}
      </Button>
    </Typography>
  );
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
  const tabId = useId();
  const [selectedTab, setSelectedTab] = useState("setup");
  const unlocked = draft.setupComplete !== false;
  const activeTab =
    !unlocked ||
    (selectedTab !== "setup" &&
      selectedTab !== "technical" &&
      !draft.sections.some(
        (section) => `section-${section.id}` === selectedTab,
      ))
      ? "setup"
      : selectedTab;
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
            minWidth: 0,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value: string) => setSelectedTab(value)}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
            slots={{ scrollButtons: SectionTabScrollButton }}
            aria-label="GDD sections"
            sx={{
              flex: 1,
              minWidth: 0,
              borderBottom: "1px solid rgba(200,162,74,0.3)",
              "& .MuiTab-root": { ...headingSx, textTransform: "none" },
              "& .MuiTab-root.Mui-selected": { color: "medievalGold.light" },
              "& .MuiTabs-indicator": { backgroundColor: "medievalGold.main" },
              "& .MuiTabs-scrollButtons": {
                color: "medievalGold.light",
                width: 40,
                minHeight: 48,
                border: "1px solid rgba(200,162,74,0.35)",
                borderRadius: 1,
                "&:hover": { backgroundColor: "rgba(200,162,74,0.12)" },
                "&.Mui-disabled": { opacity: 0.3 },
              },
            }}
          >
            <Tab
              label="Setup"
              value="setup"
              disabled={disabled}
              id={`${tabId}-tab-setup`}
              aria-controls={`${tabId}-panel-setup`}
            />
            <Tab
              label="Technical Details"
              value="technical"
              disabled={disabled || !unlocked}
              id={`${tabId}-tab-technical`}
              aria-controls={`${tabId}-panel-technical`}
            />
            {draft.sections.map((section) => (
              <Tab
                key={section.id}
                label={section.title || "Untitled section"}
                value={`section-${section.id}`}
                disabled={disabled || !unlocked}
                id={`${tabId}-tab-section-${section.id}`}
                aria-controls={`${tabId}-panel-section-${section.id}`}
              />
            ))}
          </Tabs>
          <Button
            variant="outlined"
            sx={{ ...outlineButtonSx, flexShrink: 0, minHeight: 48 }}
            startIcon={<FaPlus />}
            disabled={
              disabled ||
              !unlocked ||
              draft.sections.length + (draft.prototype ? 1 : 0) >=
                LIMITS.sections ||
              count >= 400
            }
            onClick={() => {
              const section = newSection();
              setSelectedTab(`section-${section.id}`);
              onChange({ ...draft, sections: [...draft.sections, section] });
            }}
          >
            Add section
          </Button>
        </Box>
        <Box
          role="tabpanel"
          id={`${tabId}-panel-${activeTab}`}
          aria-labelledby={`${tabId}-tab-${activeTab}`}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "repeat(2, minmax(0, 1fr))",
            },
            gap: 3,
            alignItems: "start",
            "& > *": { minWidth: 0 },
          }}
        >
          {activeTab === "setup" && (
            <>
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
              <PrototypeFields
                value={draft.prototype}
                sectionCount={draft.sections.length}
                disabled={disabled}
                onChange={(prototype) => onChange({ ...draft, prototype })}
              />
              <Tooltip
                title={
                  !canCompleteSetup(draft)
                    ? "Enter a game title and select at least one engine and target platform."
                    : ""
                }
              >
                <Box sx={{ gridColumn: "1 / -1", justifySelf: "end" }}>
                  <Button
                    sx={goldButtonSx}
                    disabled={disabled || !canCompleteSetup(draft)}
                    onClick={() => {
                      onChange({ ...draft, setupComplete: true });
                      setSelectedTab("technical");
                    }}
                  >
                    Continue
                  </Button>
                </Box>
              </Tooltip>
            </>
          )}
          {activeTab === "technical" &&
            (draft.prototype ? (
              <TechnicalDetails
                value={draft.prototype}
                disabled={disabled}
                onChange={(prototype) => onChange({ ...draft, prototype })}
              />
            ) : (
              <PrototypeFields
                value={draft.prototype}
                sectionCount={draft.sections.length}
                disabled={disabled}
                onChange={(prototype) => onChange({ ...draft, prototype })}
              />
            ))}
          {draft.sections.map(
            (section, sectionIndex) =>
              activeTab === `section-${section.id}` && (
                <Box
                  key={section.id}
                  sx={{ gridColumn: "1 / -1", minWidth: 0 }}
                  data-section-id={section.id}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{ px: 2, pt: 1 }}
                    justifyContent="space-between"
                  >
                    <Typography sx={bodySx}>
                      Section {sectionIndex + 1}
                    </Typography>
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
                  <Box
                    sx={{
                      display: "grid",
                      gap: 3,
                      gridTemplateColumns: "minmax(0, 1fr)",
                      alignItems: "start",
                      mt: 2,
                    }}
                  >
                    <TextField
                      label="Section title"
                      value={section.title}
                      fullWidth
                      sx={{ ...fieldSx, gridColumn: "1 / -1" }}
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
                            ...panelSx,
                            p: { xs: 1.5, sm: 2 },
                            minWidth: 0,
                          }}
                        >
                          <Stack spacing={2} useFlexGap>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <EditableCardTitle
                                value={item.heading}
                                label={
                                  item.type === "text"
                                    ? "Subsection title"
                                    : "Image category title"
                                }
                                disabled={disabled}
                                onChange={(heading) =>
                                  updateItem(section.id, {
                                    ...item,
                                    heading,
                                    headingMarkdown: undefined,
                                  })
                                }
                              />
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
                                      ml: { xs: 1, sm: 2 },
                                      pl: { xs: 1, sm: 1.5 },
                                      borderLeft:
                                        "1px solid rgba(200,162,74,0.18)",
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
                      sx={{ gridColumn: "1 / -1" }}
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
                  </Box>
                </Box>
              ),
          )}
        </Box>
        {[
          "setup",
          "technical",
          ...draft.sections.map((section) => `section-${section.id}`),
        ]
          .filter((value) => value !== activeTab)
          .map((value) => (
            <Box
              key={value}
              role="tabpanel"
              hidden
              id={`${tabId}-panel-${value}`}
              aria-labelledby={`${tabId}-tab-${value}`}
            />
          ))}
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
