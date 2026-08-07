/**
 * Route: / (the dashboard)
 *
 * Route files stay thin — a filename and a re-export, nothing else. The screen
 * itself lives in features/, which keeps the URL structure readable at a glance
 * and means a screen can be moved to a different URL without touching its code.
 * Follow this shape for every page you add.
 */
export { DashboardScreen as default } from "../../features/dashboard/DashboardScreen";
