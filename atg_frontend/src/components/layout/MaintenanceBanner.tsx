import { AlertTriangle } from 'lucide-react';
import { usePublicSettings } from '../../hooks/useSiteContent';

/**
 * Site-wide notice an admin can raise from Site Settings → General without a
 * deploy. Renders nothing while the setting is empty, which is its normal state.
 *
 * The text is inserted as a text node, never as HTML, so the banner cannot be
 * turned into a script-injection surface by whoever edits the setting.
 */
export default function MaintenanceBanner() {
  const settings = usePublicSettings();
  const message = String(settings['features.maintenanceBanner'] ?? '').trim();

  if (!message) return null;

  return (
    <div
      role="status"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-sm"
    >
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
