import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    category: "Curated Trips",
    color: "text-teal-600 bg-teal-50",
    items: [
      {
        q: "Can I customize or change a Curated Trip itinerary?",
        a: "No. Curated Trips are fixed, expert-crafted travel packages published directly by our partner operators. They cannot be edited or altered.",
      },
      {
        q: "Why should I use the AI Trip Planner instead of a Curated Trip?",
        a: "If you want a fully customized schedule tailored to your specific preferences, pace, and dates, use the AI Trip Planner. Choose Curated Trips if you prefer a ready-to-book, fixed package.",
      },
    ],
  },
  {
    category: "Contact & Support",
    color: "text-blue-600 bg-blue-50",
    items: [
      {
        q: "How do I get help if I encounter an issue with the app?",
        a: "Fill out the 'Contact Our Team' form below or send an email directly to support@dheevoy.com. Our support team responds within 24 hours (Mon–Fri, 9am–6pm GMT).",
      },
    ],
  },
];

export default function SupportFAQ() {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-base lg:text-lg">❓ Frequently Asked Questions</h2>
      </div>

      {FAQS.map((group, gi) => (
        <div key={gi} className="bg-white rounded-2xl border overflow-hidden lg:rounded-[22px] lg:border-[#e1e9f2] lg:shadow-[0_8px_24px_rgba(16,33,73,0.05)]">
          <div className={`px-4 py-2.5 text-xs font-bold ${group.color}`}>
            {group.category}
          </div>
          {group.items.map((item, ii) => {
            const key = `${gi}-${ii}`;
            const isOpen = open === key;
            return (
              <div key={ii} className="border-t first:border-t-0">
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  onClick={() => setOpen(isOpen ? null : key)}
                >
                  <span className="text-sm font-medium text-foreground leading-snug">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
