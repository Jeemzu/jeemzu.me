import { Fragment, type ReactNode } from "react";
import { Box } from "@mui/material";
import { Lexer, type MarkedToken, type Token } from "marked";
import { bodySx, headingSx } from "../../lib/medievalStyles";

function inline(tokens: Token[]): ReactNode {
  return tokens.map((entry, index) => {
    const token = entry as MarkedToken;
    let content: ReactNode;
    switch (token.type) {
      case "strong":
        content = <strong>{inline(token.tokens)}</strong>;
        break;
      case "em":
        content = <em>{inline(token.tokens)}</em>;
        break;
      case "del":
        content = <del>{inline(token.tokens)}</del>;
        break;
      case "codespan":
        content = <code>{token.text}</code>;
        break;
      case "br":
        content = <br />;
        break;
      case "escape":
        content = token.text;
        break;
      case "link":
        content = /^https?:\/\/[^\s]+$/i.test(token.href) ? (
          <a href={token.href} target="_blank" rel="noopener noreferrer">
            {inline(token.tokens)}
          </a>
        ) : (
          inline(token.tokens)
        );
        break;
      case "text":
        content = token.tokens ? inline(token.tokens) : token.text;
        break;
      default:
        // HTML stays literal and images never load remote resources.
        content = token.type === "image" ? token.text : token.raw;
    }
    return <Fragment key={index}>{content}</Fragment>;
  });
}

function paragraph(tokens: Token[], key: number): ReactNode {
  const parts: ReactNode[] = [];
  let pending: Token[] = [];
  function flush() {
    if (pending.some((token) => token.raw.trim())) {
      parts.push(<p key={parts.length}>{inline(pending)}</p>);
    }
    pending = [];
  }
  for (const entry of tokens) {
    const token = entry as MarkedToken;
    if (
      token.type === "strong" &&
      /^unresolved\s*:?\s*$/i.test(token.text.trim())
    ) {
      flush();
      parts.push(<h4 key={parts.length}>Unresolved</h4>);
    } else {
      const afterHeading = !pending.length && parts.length > 0;
      pending.push(
        afterHeading && token.type === "text"
          ? {
              ...token,
              text: token.text.replace(/^\s*:?\s*/, ""),
            }
          : token,
      );
    }
  }
  flush();
  return <Fragment key={key}>{parts}</Fragment>;
}

function blocks(tokens: Token[]): ReactNode {
  return tokens.map((entry, index) => {
    const token = entry as MarkedToken;
    switch (token.type) {
      case "space":
      case "def":
        return null;
      case "heading": {
        const Heading = token.depth <= 3 ? "h3" : "h4";
        return <Heading key={index}>{inline(token.tokens)}</Heading>;
      }
      case "paragraph":
      case "text":
        return paragraph(
          token.tokens ?? [{ type: "text", raw: token.text, text: token.text }],
          index,
        );
      case "list": {
        const items = token.items.map((item, current) => (
          <li key={current}>
            {item.task && <span>{item.checked ? "[x] " : "[ ] "}</span>}
            {blocks(item.tokens)}
          </li>
        ));
        return token.ordered ? (
          <ol key={index} start={token.start || 1}>
            {items}
          </ol>
        ) : (
          <ul key={index}>{items}</ul>
        );
      }
      case "blockquote":
        return <blockquote key={index}>{blocks(token.tokens)}</blockquote>;
      case "code":
        return (
          <pre key={index}>
            <code>{token.text}</code>
          </pre>
        );
      case "hr":
        return <hr key={index} />;
      case "table":
        return (
          <Box key={index} sx={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {token.header.map((cell, current) => (
                    <th key={current}>{inline(cell.tokens)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {token.rows.map((row, current) => (
                  <tr key={current}>
                    {row.map((cell, column) => (
                      <td key={column}>{inline(cell.tokens)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        );
      default:
        return <p key={index}>{token.raw}</p>;
    }
  });
}

export default function AssistantMarkdown({ children }: { children: string }) {
  return (
    <Box
      sx={{
        ...bodySx,
        textAlign: "left",
        overflowWrap: "anywhere",
        "& p": { mt: 0, mb: 1.5, whiteSpace: "pre-line" },
        "& h3, & h4": {
          ...headingSx,
          fontSize: "1rem",
          lineHeight: 1.5,
          mt: 2.5,
          mb: 1,
        },
        "& > :first-child": { mt: 0 },
        "& > :last-child": { mb: 0 },
        "& ul, & ol": { mt: 0, mb: 1.5, pl: 3 },
        "& li": { mb: 0.75 },
        "& li p": { mb: 0.75 },
        "& a": { color: "medievalGold.light" },
        "& blockquote": {
          mx: 0,
          my: 1.5,
          pl: 2,
          borderLeft: "2px solid rgba(200,162,74,0.5)",
        },
        "& pre": { overflowX: "auto", p: 1.5, bgcolor: "rgba(0,0,0,0.2)" },
        "& code": { fontSize: "0.9em", whiteSpace: "pre-wrap" },
        "& table": { width: "100%", borderCollapse: "collapse", mb: 1.5 },
        "& th, & td": {
          border: "1px solid rgba(200,162,74,0.3)",
          p: 1,
          verticalAlign: "top",
        },
        "& hr": {
          my: 2,
          border: 0,
          borderTop: "1px solid rgba(200,162,74,0.3)",
        },
      }}
    >
      {blocks(Lexer.lex(children, { gfm: true }))}
    </Box>
  );
}
