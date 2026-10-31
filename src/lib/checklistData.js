// Shared checklist categories used by both the TravelChecklist page
// and the Prepare page ChecklistWidget. Single source of truth.

import {
  FileText, Backpack, Shield, Car, Landmark,
} from "lucide-react";

export const ESIM_AFFILIATE_URL = "https://cellesim.com/r/dheevoy-limited-rze";

export const CATEGORIES = [
  {
    id: "visa_documents",
    label: "Visa Documents",
    icon: FileText,
    items: [
      { id: "passport_valid", label: "Valid passport (6+ months validity)", desc: "Check expiry date — most countries require 6+ months remaining" },
      { id: "visa_approved", label: "Visa approved / eVisa printed", desc: "Print a copy of your eVisa or approval letter" },
      { id: "passport_photos", label: "Passport-sized photos", desc: "Bring 2-4 spare photos for visas on arrival" },
      { id: "return_ticket", label: "Return ticket confirmation", desc: "Print or save digital copy of return flight details" },
      { id: "hotel_booking", label: "Hotel booking confirmation", desc: "Save digital copies of all accommodation bookings" },
      { id: "insurance_cert", label: "Travel insurance certificate", desc: "Carry your insurance policy document" },
    ],
  },
  {
    id: "packing_essentials",
    label: "Packing Essentials",
    icon: Backpack,
    items: [
      { id: "clothing", label: "Weather-appropriate clothing", desc: "Check the forecast and pack layers for your destination" },
      { id: "walking_shoes", label: "Comfortable walking shoes", desc: "Break in new shoes before your trip" },
      { id: "power_adapter", label: "Universal power adapter", desc: "Check the plug type for your destination country" },
      { id: "chargers", label: "Phone charger & power bank", desc: "Include a portable battery for long days out" },
      { id: "toiletries", label: "Toiletries & medications", desc: "Pack prescriptions in original labelled packaging" },
      { id: "documents_folder", label: "Travel documents folder", desc: "Keep all documents in one waterproof folder" },
    ],
  },
  {
    id: "safety_precautions",
    label: "Safety Precautions",
    icon: Shield,
    items: [
      { id: "embassy_contact", label: "Embassy contact saved", desc: "Save your embassy's phone number and address" },
      { id: "emergency_numbers", label: "Local emergency numbers saved", desc: "Know 112 (international) or the local equivalent" },
      { id: "bank_notified", label: "Bank notified of travel dates", desc: "Prevent your card from being blocked abroad" },
      { id: "document_copies", label: "Copies of documents (digital + physical)", desc: "Email yourself copies and carry physical backups" },
      { id: "insurance_accessible", label: "Travel insurance details accessible", desc: "Save your policy number and emergency assistance line" },
      { id: "safety_advisory", label: "Check destination safety advisory", desc: "Review official government travel advice for your destination" },
    ],
  },
  {
    id: "car_rental",
    label: "Car Rental",
    icon: Car,
    items: [
      { id: "driving_license", label: "Driving licence (International Permit if needed)", desc: "Check if an IDP is required at your destination" },
      { id: "rental_confirmation", label: "Car rental confirmation", desc: "Print or save your booking confirmation" },
      { id: "gps_maps", label: "GPS / offline maps downloaded", desc: "Download offline maps in case of no signal" },
      { id: "car_insurance", label: "Car insurance confirmed", desc: "Verify your coverage includes collision damage waiver" },
      { id: "road_assistance", label: "Emergency road assistance number", desc: "Save the rental company's breakdown number" },
    ],
  },
  {
    id: "pilgrimage",
    label: "Pilgrimage",
    icon: Landmark,
    items: [
      { id: "religious_attire", label: "Appropriate religious attire", desc: "Pack modest clothing required for holy sites" },
      { id: "prayer_items", label: "Prayer items / religious supplies", desc: "Bring any required prayer items or religious texts" },
      { id: "guidebook", label: "Guidebook for holy sites", desc: "Research opening hours and entry rules for sacred sites" },
      { id: "tour_confirmation", label: "Group tour confirmation", desc: "Confirm meeting points and contact for your guide" },
      { id: "donation_funds", label: "Donation / charity funds", desc: "Carry small notes for donations at religious sites" },
    ],
  },
];

export const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);
export const TOTAL_ITEMS = ALL_ITEMS.length;