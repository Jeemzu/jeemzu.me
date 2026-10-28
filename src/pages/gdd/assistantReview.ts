import { Lexer, type MarkedToken } from "marked";
import type { AssistantResponse } from "./assistant";

// Older saved proposals put unresolved notes inline instead of in a response list.
export function splitUnresolved(source: string) {
  const content: string[] = [];
  const unresolved: string[] = [];
  function addNote(source: string) {
    for (const token of Lexer.lex(source.trim()) as MarkedToken[]) {
      if (token.type === "list")
        unresolved.push(...token.items.map((item) => item.text));
      else if (token.raw.trim()) unresolved.push(token.raw.trim());
    }
  }
  let inSection = false;
  for (const token of Lexer.lex(source)) {
    if (token.type === "heading") {
      inSection = /^unresolved\s*:?\s*$/i.test(token.text.trim());
      if (inSection) continue;
    }
    if (inSection) {
      addNote(token.raw);
      continue;
    }
    if (token.type === "paragraph") {
      const children = token.tokens as MarkedToken[];
      const marker = children.findIndex(
        (child) =>
          child.type === "strong" &&
          /^unresolved\s*:?\s*$/i.test(child.text.trim()),
      );
      if (marker >= 0) {
        content.push(
          children
            .slice(0, marker)
            .map((child) => child.raw)
            .join(""),
        );
        let pending: string[] = [];
        for (const child of children.slice(marker + 1)) {
          if (
            child.type === "strong" &&
            /^unresolved\s*:?\s*$/i.test(child.text.trim())
          ) {
            addNote(pending.join("").replace(/^\s*:?\s*/, ""));
            pending = [];
          } else pending.push(child.raw);
        }
        const note = pending
          .join("")
          .replace(/^\s*:?\s*/, "")
          .trim();
        if (note) addNote(note);
        else inSection = true;
        content.push("\n\n");
        continue;
      }
    }
    content.push(token.raw);
  }
  return { text: content.join("").trim(), unresolved };
}

export function reviewResponse(response: AssistantResponse) {
  const unresolved = [...(response.unresolved ?? [])];
  const extract = (source: string, context = "") => {
    const result = splitUnresolved(source);
    unresolved.push(
      ...result.unresolved.map((note) =>
        context ? `${context}: ${note}` : note,
      ),
    );
    return result.text;
  };
  const message = extract(response.message);
  const questions = response.questions
    .map((question) => extract(question))
    .filter(Boolean);
  const referenceRequests = response.referenceRequests
    .map((reference) => extract(reference))
    .filter(Boolean);
  const introduction = extract(response.proposal.introduction);
  const sections = response.proposal.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      body: extract(item.body, item.heading),
    })),
  }));
  return {
    ...response,
    message,
    questions,
    referenceRequests,
    proposal: { ...response.proposal, introduction, sections },
    unresolved: [...new Set(unresolved)],
  };
}
