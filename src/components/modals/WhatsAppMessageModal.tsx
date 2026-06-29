"use client";

import { useMemo, useState } from "react";
import { formatSlotDisplay } from "@/lib/constants";
import { formatPhone } from "@/lib/format";

type WhatsAppBooking = {
  customerName: string;
  phone: string;
  timeSlot: string;
  timeOverride: string | null;
  businessDate: string;
  totalAmount: number;
  advanceAmount: number;
  turfNumber: number;
};

export function WhatsAppMessageModal({ booking, onClose }: { booking: WhatsAppBooking; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => generateMessage(booking), [booking]);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-400">WhatsApp</p>
            <h2 className="mt-1 text-2xl font-black text-white">Booking Confirmation Message</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">Close</button>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Sending to: {booking.customerName} · {formatPhone(booking.phone)}
        </div>

        <div className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-emerald-400/20 bg-[#0d2818] p-4 text-sm leading-6 text-white">
          {renderPreview(message)}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={copyMessage} className={`rounded-2xl px-5 py-3 font-bold ${copied ? "bg-emerald-500 text-white" : "bg-[var(--infinity-lime)] text-black"}`}>
            {copied ? "Copied!" : "Copy Message"}
          </button>
          <button onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 text-zinc-300">Done</button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Open WhatsApp, find {booking.customerName}&apos;s chat, and paste this message.</p>
      </div>
    </div>
  );
}

function generateMessage(booking: WhatsAppBooking) {
  const { from, to } = formatSlotDisplay(booking.timeSlot);
  const displaySlot = booking.timeOverride ?? `${from} to ${to}`;
  const dateStr = new Date(`${booking.businessDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const pending = Math.max(booking.totalAmount - booking.advanceAmount, 0);

  return `નમસ્તે,
*ઈન્ફિનિટી સ્પોર્ટ્સ* તરફથી શુભેચ્છાઓ 🙏
તમારું બુકિંગ નીચેના સમય માટે કન્ફર્મ કરવામાં આવ્યું છે.

*નામ* :- ${booking.customerName}
*મો. નં.* :- ${formatPhone(booking.phone)}
*ટર્ફ* :- Turf ${booking.turfNumber}
*સ્લોટ* :- ${displaySlot}
*તારીખ* :- ${dateStr}
*ટોટલ* :- ₹${booking.totalAmount.toLocaleString("en-IN")}
*એડવાન્સ* :- ₹${booking.advanceAmount.toLocaleString("en-IN")}
*કુલ બાકી* :- ₹${pending.toLocaleString("en-IN")}

https://g.co/kgs/mCV7BR

*કડક સૂચનાઓ:*
આલ્કોહોલ કે અન્ય નશામાં રહેલા વ્યક્તિ ને ગ્રાઉન્ડમાં પરમિશન નથી.
કોઈપણ મિલકતના નુકસાન પર વધારાના ચાર્જ કરવામાં આવશે.
એકવાર બુકિંગ થઈ જશે તે રદ કે રી-શેડ્યુલ કરવામાં આવશે નહીં.
અમે તમારા સહકારની આશા રાખીએ છીએ....
આભાર..

*ઈન્ફિનિટી સ્પોર્ટ્સ કલબ* 🏏`;
}

function renderPreview(message: string) {
  return message.split(/(\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
