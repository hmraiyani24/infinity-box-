import * as XLSX from "xlsx";
import { TIME_SLOTS } from "@/lib/constants";
import type { BookingRow } from "@/types";

export function buildExcelBuffer(bookings: BookingRow[], dates: string[], sheetTitle: string): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};
  const lookup: Record<string, Record<number, Record<string, BookingRow>>> = {};

  for (const booking of bookings) {
    const date = booking.businessDate;
    lookup[date] ??= {};
    lookup[date][booking.turfNumber] ??= {};
    lookup[date][booking.turfNumber][booking.timeSlot] = booking;
  }

  const dateSpan = 4;
  const totalCols = 1 + dates.length * dateSpan;
  ws[XLSX.utils.encode_cell({ r: 0, c: 0 })] = { v: "INFINITY BOX", t: "s" };

  dates.forEach((date, dateIndex) => {
    const col = 1 + dateIndex * dateSpan;
    ws[XLSX.utils.encode_cell({ r: 0, c: col })] = {
      v: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }),
      t: "s",
    };
    ws["!merges"] ??= [];
    ws["!merges"].push({ s: { r: 0, c: col }, e: { r: 0, c: col + dateSpan - 1 } });
  });

  ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = { v: "Time Slot", t: "s" };
  dates.forEach((_, dateIndex) => {
    [1, 2, 3, 4].forEach((turfNumber, turfIndex) => {
      ws[XLSX.utils.encode_cell({ r: 1, c: 1 + dateIndex * dateSpan + turfIndex })] = {
        v: `Turf ${turfNumber}`,
        t: "s",
      };
    });
  });

  TIME_SLOTS.forEach((slot, slotIndex) => {
    const row = 2 + slotIndex;
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: slot, t: "s" };
    dates.forEach((date, dateIndex) => {
      [1, 2, 3, 4].forEach((turfNumber, turfIndex) => {
        const col = 1 + dateIndex * dateSpan + turfIndex;
        const booking = lookup[date]?.[turfNumber]?.[slot];
        if (!booking) {
          ws[XLSX.utils.encode_cell({ r: row, c: col })] = { v: "", t: "s" };
          return;
        }

        const lines = [
          booking.customerName,
          booking.phone,
          `${booking.staffName}  Rs ${booking.totalAmount}`,
        ];
        if (booking.advanceAmount > 0) lines.push(`Adv Rs ${booking.advanceAmount} ${booking.advancePaymentMode}`);
        if (booking.timeOverride) lines.push(booking.timeOverride);
        ws[XLSX.utils.encode_cell({ r: row, c: col })] = { v: lines.join("\n"), t: "s" };
      });
    });
  });

  const totalRows = [
    { label: "Daily Total", filter: () => true },
    { label: "Cash", filter: (booking: BookingRow) => booking.advancePaymentMode === "CASH" },
    { label: "DK Bank", filter: (booking: BookingRow) => booking.advancePaymentMode === "DK_BANK" },
    { label: "HG Bank", filter: (booking: BookingRow) => booking.advancePaymentMode === "HG_BANK" },
  ];
  const baseRow = 2 + TIME_SLOTS.length + 1;
  totalRows.forEach(({ label, filter }, rowIndex) => {
    ws[XLSX.utils.encode_cell({ r: baseRow + rowIndex, c: 0 })] = { v: label, t: "s" };
    dates.forEach((date, dateIndex) => {
      const dayBookings = bookings.filter((booking) => booking.businessDate === date && filter(booking));
      const sum = dayBookings.reduce((total, booking) => total + (label === "Daily Total" ? booking.totalAmount : booking.advanceAmount), 0);
      const col = 1 + dateIndex * dateSpan;
      ws[XLSX.utils.encode_cell({ r: baseRow + rowIndex, c: col })] = {
        v: sum > 0 ? `Rs ${sum.toLocaleString("en-IN")}` : "",
        t: "s",
      };
      ws["!merges"] ??= [];
      ws["!merges"].push({ s: { r: baseRow + rowIndex, c: col }, e: { r: baseRow + rowIndex, c: col + dateSpan - 1 } });
    });
  });

  ws["!cols"] = [{ wch: 18 }, ...Array(totalCols - 1).fill({ wch: 22 })];
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: baseRow + totalRows.length - 1, c: totalCols - 1 },
  });

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export async function buildPdfBuffer(bookings: BookingRow[], title: string): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setTextColor(13, 79, 28);
  doc.text("INFINITY BOX", 14, 14);
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(title, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [["Date", "Turf", "Time Slot", "Customer", "Phone", "Total Rs", "Advance Rs", "Payment", "Staff", "Status"]],
    body: bookings.map((booking) => [
      new Date(`${booking.businessDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }),
      `Turf ${booking.turfNumber}`,
      booking.timeOverride ?? booking.timeSlot,
      booking.customerName,
      booking.phone,
      booking.totalAmount.toLocaleString("en-IN"),
      booking.advanceAmount > 0 ? booking.advanceAmount.toLocaleString("en-IN") : "-",
      booking.advancePaymentMode.replace("_", " "),
      booking.staffName,
      booking.status,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [13, 79, 28], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 14 },
      2: { cellWidth: 34 },
      3: { cellWidth: 30 },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 18 },
      8: { cellWidth: 18 },
      9: { cellWidth: 18 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${data.pageNumber} of ${pageCount} - Infinity Box Export`, data.settings.margin.left, doc.internal.pageSize.height - 5);
    },
  });

  return doc.output("arraybuffer");
}
