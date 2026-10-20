import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Buffer } from "buffer";
import sans from "../../assets/fonts/gdd/NotoSans-Regular.ttf";
import sansBold from "../../assets/fonts/gdd/NotoSans-Bold.ttf";
import sansItalic from "../../assets/fonts/gdd/NotoSans-Italic.ttf";
import sansBoldItalic from "../../assets/fonts/gdd/NotoSans-BoldItalic.ttf";
import serif from "../../assets/fonts/gdd/NotoSerif-Regular.ttf";
import serifBold from "../../assets/fonts/gdd/NotoSerif-Bold.ttf";
import serifItalic from "../../assets/fonts/gdd/NotoSerif-Italic.ttf";
import serifBoldItalic from "../../assets/fonts/gdd/NotoSerif-BoldItalic.ttf";
import type { Block, GddDocument, Inline } from "./document";
import type { PdfImage } from "./images";

// React-PDF's layout package also uses Buffer in its browser image path.
if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = Buffer;

Font.register({
  family: "GddSans",
  fonts: [
    { src: sans },
    { src: sansBold, fontWeight: 700 },
    { src: sansItalic, fontStyle: "italic" },
    { src: sansBoldItalic, fontStyle: "italic", fontWeight: 700 },
  ],
});
Font.register({
  family: "GddSerif",
  fonts: [
    { src: serif },
    { src: serifBold, fontWeight: 700 },
    { src: serifItalic, fontStyle: "italic" },
    { src: serifBoldItalic, fontStyle: "italic", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => {
  const characters = [...word];
  if (characters.length <= 32) return [word];
  const parts: string[] = [];
  for (let index = 0; index < characters.length; index += 24) {
    parts.push(characters.slice(index, index + 24).join(""));
  }
  return parts;
});

const GREEN = "#264b3d";
const MUTED = "#57685f";
const styles = StyleSheet.create({
  page: {
    fontFamily: "GddSans",
    fontSize: 9.6,
    color: "#24372e",
    paddingTop: 58,
    paddingBottom: 62,
    paddingHorizontal: 54,
    height: 792,
  },
  header: {
    position: "absolute",
    top: 22,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "0.5 solid #dce3dd",
    paddingBottom: 8,
    fontSize: 7,
    color: MUTED,
  },
  headerTitle: { fontWeight: 700, color: GREEN, maxWidth: 330 },
  footer: {
    position: "absolute",
    top: 748,
    height: 22,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5 solid #dce3dd",
    paddingTop: 8,
    fontSize: 7,
    color: MUTED,
  },
  kicker: {
    fontSize: 8,
    fontWeight: 700,
    color: GREEN,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: "GddSerif",
    fontSize: 23,
    color: GREEN,
    marginBottom: 12,
  },
  subheading: {
    fontFamily: "GddSerif",
    fontSize: 12,
    fontWeight: 700,
    color: GREEN,
    marginTop: 8,
    marginBottom: 5,
  },
  paragraph: { marginBottom: 7, orphans: 2, widows: 2 },
  quote: {
    borderLeft: `2 solid ${GREEN}`,
    paddingLeft: 10,
    color: MUTED,
    marginVertical: 5,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 8,
    padding: 9,
    backgroundColor: "#f0f3ef",
    marginVertical: 6,
  },
  row: { flexDirection: "row", borderBottom: "0.5 solid #dce3dd" },
  cell: { flex: 1, padding: 6, fontSize: 8.5 },
  tableHead: { backgroundColor: "#e8eee7", color: GREEN, fontWeight: 700 },
  figure: { marginVertical: 8 },
  caption: { fontSize: 7.5, color: MUTED, marginTop: 5 },
  tocRow: {
    flexDirection: "row",
    paddingVertical: 9,
    borderBottom: "0.5 solid #dce3dd",
    alignItems: "center",
  },
  tocNumber: { width: 34, color: GREEN, fontSize: 14, fontFamily: "GddSerif" },
  tocTitle: {
    flex: 1,
    color: GREEN,
    fontWeight: 700,
    textDecoration: "none",
    paddingRight: 10,
  },
  tocPage: { width: 28, textAlign: "right", color: MUTED },
});

function Spans({ spans }: { spans: Inline[] }) {
  return spans.map((span, index) => {
    const text = (
      <Text
        key={index}
        style={{
          ...(span.bold ? { fontWeight: 700 } : {}),
          ...(span.italic ? { fontStyle: "italic" } : {}),
          ...(span.strike ? { textDecoration: "line-through" } : {}),
        }}
      >
        {span.text}
      </Text>
    );
    return span.href ? (
      <Link key={index} src={span.href} style={{ color: GREEN }}>
        {text}
      </Link>
    ) : (
      text
    );
  });
}

function Blocks({
  blocks,
  images,
}: {
  blocks: Block[];
  images: Record<string, PdfImage>;
}) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "paragraph":
      case "quote":
      case "code":
        return (
          <Text
            key={index}
            style={[
              styles.paragraph,
              ...(block.type === "quote" ? [styles.quote] : []),
              ...(block.type === "code" ? [styles.code] : []),
            ]}
          >
            <Spans spans={block.text} />
          </Text>
        );
      case "heading":
        return (
          <Text key={index} style={styles.subheading} minPresenceAhead={35}>
            <Spans spans={block.text} />
          </Text>
        );
      case "rule":
        return (
          <View
            key={index}
            style={{ borderBottom: "0.5 solid #dce3dd", marginVertical: 8 }}
          />
        );
      case "list":
        return (
          <View key={index} style={{ marginBottom: 5 }}>
            {block.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                style={{ flexDirection: "row", paddingLeft: 2 }}
              >
                <Text style={{ width: 22 }}>
                  {block.ordered ? `${block.start + itemIndex}.` : "\u2022"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Blocks blocks={item} images={images} />
                </View>
              </View>
            ))}
          </View>
        );
      case "table":
        return (
          <View key={index} style={{ marginVertical: 5 }}>
            {[block.header, ...block.rows].map((row, rowIndex) => (
              <View
                key={rowIndex}
                wrap={false}
                style={[
                  styles.row,
                  ...(rowIndex === 0 ? [styles.tableHead] : []),
                ]}
              >
                {row.map((cell, cellIndex) => (
                  <Text key={cellIndex} style={styles.cell}>
                    <Spans spans={cell} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      case "image": {
        const image = images[block.path];
        if (!image) throw new Error(`Missing prepared image: ${block.path}`);
        const scale = Math.min(504 / image.width, 460 / image.height);
        return (
          <View key={index} wrap={false} style={styles.figure}>
            <Image
              src={image.src}
              style={{
                width: image.width * scale,
                height: image.height * scale,
                alignSelf: "center",
                objectFit: "contain",
              }}
            />
            <Text
              style={styles.caption}
            >{`Figure ${String(block.number).padStart(2, "0")}. ${block.caption}`}</Text>
          </View>
        );
      }
    }
  });
}

function Furniture({ title }: { title: string }) {
  return (
    <>
      <View fixed style={styles.header}>
        <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
        <Text>GAME DESIGN DOCUMENT</Text>
      </View>
      <View fixed style={styles.footer}>
        <Text>DESIGN &amp; VISUAL REFERENCES</Text>
        <Text
          style={{ width: 64, height: 12, textAlign: "right" }}
          render={({ pageNumber, totalPages }) =>
            `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`
          }
        />
      </View>
    </>
  );
}

interface PdfProps {
  content: GddDocument;
  images: Record<string, PdfImage>;
  pageNumbers: Record<string, number>;
  recordPage?: (id: string, page: number) => void;
}

export function GddPdf({ content, images, pageNumbers, recordPage }: PdfProps) {
  return (
    <Document
      title={`${content.title} - Game Design Document`}
      author=""
      language="en"
    >
      <Page size="LETTER" style={[styles.page, { paddingTop: 72 }]}>
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 14,
            backgroundColor: GREEN,
          }}
        />
        <Text style={styles.kicker}>GAME DESIGN DOCUMENT</Text>
        <Text
          style={{
            fontFamily: "GddSerif",
            color: GREEN,
            fontSize:
              content.title.length > 70
                ? 28
                : content.title.length > 40
                  ? 36
                  : 46,
            marginTop: 65,
            marginBottom: 25,
          }}
        >
          {content.title}
        </Text>
        <View
          style={{
            width: 82,
            height: 2,
            backgroundColor: "#b88a3b",
            marginBottom: 27,
          }}
        />
        {content.introduction.map((paragraph, index) => (
          <Text
            key={index}
            style={{ color: GREEN, fontSize: 11, marginBottom: 15 }}
          >
            <Spans spans={paragraph} />
          </Text>
        ))}
        <View
          style={{
            position: "absolute",
            bottom: 45,
            left: 54,
            right: 54,
            borderBottom: "0.5 solid #dce3dd",
            paddingBottom: 20,
          }}
        >
          <Text style={{ color: MUTED, fontSize: 8, fontWeight: 700 }}>
            {content.title.toUpperCase()}
          </Text>
        </View>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Furniture title={content.title} />
        <Text style={styles.kicker}>DOCUMENT GUIDE</Text>
        <Text style={styles.title}>Contents</Text>
        {content.sections.map((section, index) => (
          <View key={section.id} wrap={false} style={styles.tocRow}>
            <Text style={styles.tocNumber}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Link src={`#${section.id}`} style={styles.tocTitle}>
              {section.title}
            </Link>
            <Text style={styles.tocPage}>
              {String(pageNumbers[section.id] ?? 0).padStart(2, "0")}
            </Text>
          </View>
        ))}
      </Page>
      {content.sections.map((section, index) => (
        <Page
          key={section.id}
          size="LETTER"
          style={styles.page}
          bookmark={section.title}
        >
          <Furniture title={content.title} />
          <Text
            id={section.id}
            style={[styles.kicker, { height: 24, width: 504 }]}
            render={({ pageNumber }) => {
              recordPage?.(section.id, pageNumber);
              return `${String(index + 1).padStart(2, "0")} / ${section.title.toUpperCase()}`;
            }}
          />
          <Text style={styles.title} minPresenceAhead={35}>
            {section.title}
          </Text>
          <Blocks blocks={section.blocks} images={images} />
        </Page>
      ))}
    </Document>
  );
}
