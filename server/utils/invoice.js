import PDFDocument from "pdfkit";

export function invoicePdf({ title, invoiceNumber, date, partyLabel, partyName, items, totalAmount, paymentStatus, notes, priceField = "unitCost" }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(24).fillColor("#20283c").text(title);
    doc.moveDown(0.3).fontSize(10).fillColor("#68738a").text(`Invoice ${invoiceNumber}`);
    doc.text(`Date: ${new Date(date).toLocaleString()}`);
    doc.moveDown().fontSize(11).fillColor("#20283c").text(`${partyLabel}: ${partyName}`);
    if (paymentStatus) doc.text(`Payment status: ${paymentStatus}`);
    if (notes) doc.text(`Notes: ${notes}`);
    doc.moveDown();

    const top = doc.y;
    doc.rect(48, top, doc.page.width - 96, 25).fill("#eef2ff");
    doc.fillColor("#27345c").fontSize(9).text("Product", 54, top + 8, { width: 220 });
    doc.text("Qty", 280, top + 8, { width: 40 });
    doc.text("Unit price", 340, top + 8, { width: 90 });
    doc.text("Line total", 450, top + 8, { width: 90 });
    doc.y = top + 33;

    for (const item of items) {
      if (doc.y > doc.page.height - 100) doc.addPage();
      const y = doc.y;
      doc.fillColor("#20283c").fontSize(9)
        .text(item.productName, 54, y, { width: 215 })
        .text(String(item.quantity), 280, y, { width: 40 })
        .text(Number(item[priceField]).toFixed(2), 340, y, { width: 90 })
        .text(Number(item.lineTotal).toFixed(2), 450, y, { width: 90 });
      doc.y = y + 22;
      doc.strokeColor("#e6e9f0").moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).stroke();
    }

    doc.moveDown().fontSize(14).fillColor("#20283c")
      .text(`Total: ${Number(totalAmount).toFixed(2)}`, { align: "right" });
    doc.end();
  });
}
