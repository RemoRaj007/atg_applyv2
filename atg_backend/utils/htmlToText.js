// Job descriptions from public feeds arrive as HTML. The frontend renders them
// as text (React escapes them), so HTML never executes — but left as-is a
// candidate would read raw `<p>` and `&amp;`. This turns markup into readable
// plain text: block elements become line breaks, list items become bullets,
// every other tag is dropped, and entities are decoded.
//
// Deliberately not a sanitizer. Its output is plain text and is only ever
// rendered as text, which is what makes it safe; it must never be fed to
// innerHTML.

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", euro: "€", pound: "£" };

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      // Out-of-range or control code points would put garbage in the text.
      return Number.isFinite(n) && n > 31 && n <= 0x10ffff ? String.fromCodePoint(n) : " ";
    }
    return NAMED[code.toLowerCase()] ?? match;
  });

const htmlToText = (html) => {
  if (typeof html !== "string" || !html.trim()) return null;
  const text = decodeEntities(
    html
      // Content that is never prose.
      .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|section|article|blockquote)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
  );
  return text
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // A closing </li> and the next <li> both break the line; one is enough.
    .replace(/\n\n(?=• )/g, "\n")
    .trim() || null;
};

module.exports = { htmlToText, decodeEntities };
