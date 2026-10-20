import { useState, type ReactNode } from "react";
import { Badge, Dialog, DialogContent, IconButton } from "@mui/material";
import { FaCommentDots, FaXmark } from "react-icons/fa6";

export interface BudgetNotification {
  id: string;
  kind: "info" | "warn" | "error";
  content: ReactNode;
}

interface Props {
  messages: BudgetNotification[];
}

export function BudgetNotifications({ messages }: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const unread = open
    ? 0
    : messages.filter((message) => !readIds.has(message.id)).length;
  const hasErrors = messages.some((message) => message.kind === "error");
  const close = () => {
    setReadIds(new Set(messages.map((message) => message.id)));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn notification-launcher"
        aria-label={`Budget notifications, ${unread} unread${hasErrors ? ", errors need attention" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "budget-notifications" : undefined}
        onClick={() => setOpen(true)}
      >
        <Badge badgeContent={unread} color={hasErrors ? "error" : "warning"}>
          <FaCommentDots size={24} aria-hidden="true" />
        </Badge>
        Notifications
      </button>
      <span
        className="notification-announcement"
        role="status"
        aria-live="polite"
      >
        {unread > 0
          ? `${unread} unread budget notifications${hasErrors ? ". Errors need attention." : "."}`
          : ""}
      </span>
      <Dialog
        open={open}
        onClose={close}
        aria-labelledby="budget-notifications-title"
        scroll="paper"
        slotProps={{
          paper: {
            id: "budget-notifications",
            className: "budgetize budgetize-portal notification-panel",
            sx: {
              position: "fixed",
              right: { xs: 12, sm: 24 },
              bottom: { xs: 80, sm: 88 },
              m: 0,
              width: { xs: "calc(100% - 24px)", sm: 420 },
              maxWidth: "calc(100% - 24px)",
              maxHeight: "min(640px, calc(100dvh - 112px))",
            },
          },
        }}
      >
        <div className="notification-heading">
          <h2 id="budget-notifications-title">Notifications</h2>
          <IconButton
            onClick={close}
            aria-label="Close notifications"
            sx={{ color: "inherit" }}
          >
            <FaXmark size={18} />
          </IconButton>
        </div>
        <DialogContent className="notification-content">
          <div
            role="log"
            aria-label="Budget notification conversation"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="muted">You're all caught up.</p>
            ) : (
              <ol className="notification-thread">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={`notification-message ${message.kind}`}
                  >
                    <span className="notification-sender">
                      Budgetize ·{" "}
                      {message.kind === "error"
                        ? "Action needed"
                        : message.kind === "warn"
                          ? "Warning"
                          : "Update"}
                    </span>
                    {message.content}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
