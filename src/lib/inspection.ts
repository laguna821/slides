/** A DOM-inspection projection, never a rendering or archival source.
 * Binary image/font/PDF bytes do not contribute text, anchors or local links.
 * Keep the data URI's type and all surrounding markup, while avoiding parsing
 * tens of megabytes of encoded binary in historical standalone decks.
 */
export function inspectionHtml(html: string): string {
  return html.replace(
    /(data:(?:(?:image|font)\/[\w.+-]+|application\/(?:pdf|octet-stream|(?:x-)?font[\w.+-]*))(?:;charset=[\w-]+)?;base64,)[A-Za-z0-9+/=\r\n]+/g,
    '$1AA==',
  );
}
