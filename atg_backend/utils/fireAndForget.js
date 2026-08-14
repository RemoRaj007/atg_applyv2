const { systemLogger } = require("../config/atg_logger");

/**
 * Error handler for notifications that are deliberately not awaited.
 *
 * Notifying someone must never fail the operation that triggered it — a job
 * still gets created if the email server is down. That was expressed as
 * `.catch(() => {})`, which also meant a wholly broken notification pipeline
 * produced no evidence anywhere. This keeps the non-blocking behaviour and
 * leaves a record.
 *
 *   notificationService.notifyRoles({ ... }).catch(logNotifyFailure("job_created"));
 */
const logNotifyFailure = (context) => (err) => {
  systemLogger.warn("Notification dispatch failed", {
    context,
    error: err?.message || String(err),
  });
};

module.exports = { logNotifyFailure };
