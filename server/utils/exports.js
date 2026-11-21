import PDFDocument from "pdfkit";

function csvCell(value) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsvBuffer(_title, rows) {
  if (rows.length === 0) {
    return Buffer.from("\uFEFF\"No records\"\r\n", "utf8");
  }
  const columns = Object.keys(rows[0]);
  const header = columns.map((column) =>
    csvCell(column.replaceAll(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()))
  );
  const lines = [
    header,
    ...rows.map((row) => columns.map((column) => csvCell(row[column])))
  ];
  return Buffer.from(`\uFEFF${lines.map((line) => line.join(",")).join("\r\n")}\r\n`, "utf8");
}

export function toPdfBuffer(title, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(20).fillColor("#20283c").text(title);
    doc.moveDown(0.5).fontSize(9).fillColor("#68738a").text(`Generated ${new Date().toLocaleString()}`);
    doc.moveDown();
    if (rows.length === 0) {
      doc.fontSize(11).fillColor("#20283c").text("No records found for this report.");
    } else {
      const columns = Object.keys(rows[0]);
      const columnWidth = (doc.page.width - 80) / columns.length;
      const drawHeader = () => {
        const y = doc.y;
        doc.rect(40, y, doc.page.width - 80, 24).fill("#eef2ff");
        columns.forEach((column, index) => {
          doc.fillColor("#27345c").fontSize(8).text(column, 44 + index * columnWidth, y + 7, {
            width: columnWidth - 8,
            ellipsis: true,
            lineBreak: false
          });
        });
        doc.y = y + 30;
      };
      drawHeader();
      rows.forEach((row) => {
        if (doc.y > doc.page.height - 55) {
          doc.addPage();
          drawHeader();
        }
        const y = doc.y;
        columns.forEach((column, index) => {
          doc.fillColor("#20283c").fontSize(7).text(String(row[column] ?? ""), 44 + index * columnWidth, y, {
            width: columnWidth - 8,
            height: 24,
            ellipsis: true,
            lineBreak: false
          });
        });
        doc.y = y + 24;
        doc.strokeColor("#e6e9f0").moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
        doc.y += 4;
      });
    }
    doc.end();
  });
}
