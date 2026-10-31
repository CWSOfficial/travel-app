import { Link } from "react-router-dom";

/**
 * Renders the legal consent checkboxes required at registration.
 * Parent must manage: termsAccepted, setTermsAccepted
 */
export default function ConsentCheckboxes({ termsAccepted, setTermsAccepted }) {
  return (
    <div className="space-y-3">
      {/* Terms + Privacy */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-black cursor-pointer"
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          I agree to the{" "}
          <Link to="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">Terms of Service</Link>
          {" "}and{" "}
          <Link to="/privacy" target="_blank" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>.
          {" "}I confirm I am 16 years of age or older. <span className="text-red-500">*</span>
        </p>
      </label>

      {/* SMS consent (optional) */}
      <p className="text-[10px] text-muted-foreground px-1">
        <span className="text-red-500">*</span> Required to create your account. You may withdraw consent at any time by deleting your account.
      </p>
    </div>
  );
}