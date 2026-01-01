import { Link } from "react-router";
import {
  ArrowLeft,
  Shield,
  Lock,
  Database,
  Eye,
  Download,
  Server,
  UserCheck,
  Cloud,
} from "lucide-react";
import Footer from "@/react-app/components/Footer";

export default function PrivacyGuide() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1e2639]">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-[#1a1f2e] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white">UltraPlan Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Last Updated: November 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Privacy Commitment */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Our Commitment to Your Privacy
            </h2>
          </div>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              UltraPlan is designed with privacy at its core. Your race data belongs to you. UltraPlan does not collect, store, or sync your race plans to any cloud servers. Everything remains on your device unless you intentionally share a plan with the Community (future feature) or choose to backup to your personal Google Drive.
            </p>
          </div>
        </section>

        {/* Data Storage */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Data Storage
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Local Storage Only
              </h3>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <p className="text-green-700 dark:text-green-200 font-semibold mb-2">
                  ✓ Your race plans are never stored on our servers, even if you sign in with Google.
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  All race plans, GPX files, FIT processing, and personal information are stored exclusively in your browser's local storage.
                </p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <h4 className="text-gray-900 dark:text-white font-semibold mb-2">
                  What this means:
                </h4>
                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                  <li>Data never leaves your device (except when you backup to your Google Drive)</li>
                  <li>No automatic cloud syncing to UltraPlan servers</li>
                  <li>Full offline functionality</li>
                  <li>Clearing your browser data will permanently delete your plans</li>
                  <li>Export JSON backups to secure your data manually</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                Google Drive Backup (Optional)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                UltraPlan offers an optional backup feature that allows you to save your race plans to <strong>your own Google Drive</strong>.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-3">
                <p className="text-blue-700 dark:text-blue-200 font-semibold mb-2">
                  ✓ Your backups are stored in YOUR Google Drive, not UltraPlan's servers
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  When you authorize Google Drive access, UltraPlan can only access files it creates in a dedicated "UltraPlan Backups" folder. It cannot access any other files in your Google Drive.
                </p>
              </div>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Backups are stored in your personal Google Drive account</li>
                <li>UltraPlan uses the limited "drive.file" scope (can only access files it creates)</li>
                <li>You maintain full control and ownership of your backup files</li>
                <li>You can view, download, or delete backups directly from your Google Drive</li>
                <li>Backups are completely optional - local-only usage is fully supported</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                  <strong>Important:</strong> Google Drive backups are created only when you explicitly choose to backup a race plan. There is no automatic syncing.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                Google Authentication (Optional)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Google sign-in is optional and does not automatically upload your race plans to any cloud service.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Google OAuth is used for:
              </p>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Secure login (Firebase Authentication)</li>
                <li>Basic profile information (email, name, picture)</li>
                <li>Enabling features such as Compare to Previous Race (.FIT upload)</li>
                <li>Providing access to future community features</li>
                <li>Resource and capacity planning</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                  <strong>Important:</strong> Even after signing in, all race plans still remain stored locally in your browser. Google Drive backup is a separate optional feature that requires additional authorization.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Data We Collect */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Eye className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              What Data We Collect
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Locally Stored (All Users)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Stored only on your device:
              </p>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Race plans</li>
                <li>GPX files</li>
                <li>FIT file processing</li>
                <li>Emergency contacts & crew details</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                None of this is uploaded to any server.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                When Signed in With Google
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                UltraPlan collects the following when you sign in:
              </p>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Email address and basic Google profile information</li>
                <li>Google User ID (for authentication)</li>
              </ul>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                <h4 className="text-blue-400 font-semibold mb-2">📊 Usage Analytics (For Signed-In Users)</h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                  To help us understand how UltraPlan is being used and improve the app, we collect basic usage analytics for signed-in users:
                </p>
                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-2 list-disc pl-5">
                  <li><strong className="text-gray-900 dark:text-white">Plan Names:</strong> We record the names of race plans you create (e.g., "Highland Fling 2025") - but NOT the plan content, checkpoints, or nutrition data</li>
                  <li><strong className="text-gray-900 dark:text-white">Activity Counts:</strong> We track that you uploaded a GPX or FIT file - but we do NOT store the actual file on our servers</li>
                  <li><strong className="text-gray-900 dark:text-white">Session Duration:</strong> How long you use the app (for understanding engagement)</li>
                  <li><strong className="text-gray-900 dark:text-white">Device & Browser:</strong> General device type (desktop/mobile) and browser</li>
                  <li><strong className="text-gray-900 dark:text-white">Location:</strong> Country, region, and city detected from your browser's timezone or IP address (for understanding our global user base)</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 text-sm mt-3 italic">
                  This helps us answer questions like: "Did users actually use the new FIT upload feature?" and "Where are our users located?"
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-3">
                <p className="text-green-700 dark:text-green-200 text-sm">
                  <strong>What we do NOT collect:</strong> Your actual race plan content (checkpoints, paces, nutrition details), the actual GPX/FIT files you upload (they stay in your browser), or any personal health data.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                What UltraPlan Doesn't Collect
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>No race plan content (checkpoints, paces, nutrition) on our servers</li>
                <li>No actual GPX or FIT files stored on our servers</li>
                <li>No behavioural tracking or profiling</li>
                <li>No non-essential cookies</li>
                <li>No sale of any data</li>
                <li>No marketing emails</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-3">
                UltraPlan communicates only with the services required for functionality (weather API, Google OAuth, geolocation API, and optionally Google Drive API).
              </p>
            </div>
          </div>
        </section>

        {/* How We Use Your Data */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            How Your Data Is Used
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                How UltraPlan Uses Your Data:
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Display and organize race plans locally</li>
                <li>Process GPX & FIT files locally for insights</li>
                <li>Provide authentication (when signed in)</li>
                <li>Backup race plans to your Google Drive (when you explicitly choose to)</li>
                <li>Import race plans from your Google Drive backups</li>
                <li>Enable future community plan-sharing features (optional and user-initiated only)</li>
                <li>Retrieve weather forecasts for checkpoints</li>
              </ul>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                UltraPlan Does Not:
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Upload, sync, or store your plans on UltraPlan servers</li>
                <li>Automatically backup to the cloud without your explicit action</li>
                <li>Access any Google Drive files except those created by UltraPlan</li>
                <li>Sell or share any data with third parties (other than required APIs)</li>
                <li>Analyze your race content</li>
                <li>Track your behavior or device</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                Your plans remain private unless you explicitly choose to submit them to the Community or backup to your Google Drive.
              </p>
            </div>
          </div>
        </section>

        {/* Third-Party Services */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Server className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Third-Party Services
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Weather Data
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                <li><strong className="text-gray-900 dark:text-white">Service:</strong> Open-Meteo API</li>
                <li><strong className="text-gray-900 dark:text-white">Data Shared:</strong> GPS coordinates from checkpoints</li>
                <li><strong className="text-gray-900 dark:text-white">Purpose:</strong> Weather forecasts</li>
                <li><strong className="text-gray-900 dark:text-white">Notes:</strong> No API keys required; no tracking</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Authentication
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                <li><strong className="text-gray-900 dark:text-white">Service:</strong> Google OAuth (Firebase Authentication)</li>
                <li><strong className="text-gray-900 dark:text-white">Data Shared:</strong> Email & basic profile</li>
                <li><strong className="text-gray-900 dark:text-white">Purpose:</strong> Secure sign-in and feature access</li>
                <li><strong className="text-gray-900 dark:text-white">Notes:</strong> Does not sync your plans to the cloud</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Google Drive Backup (Optional)
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                <li><strong className="text-gray-900 dark:text-white">Service:</strong> Google Drive API</li>
                <li><strong className="text-gray-900 dark:text-white">Data Shared:</strong> Race plan backups (JSON files) stored in YOUR Google Drive</li>
                <li><strong className="text-gray-900 dark:text-white">Purpose:</strong> User-initiated backup and restore of race plans</li>
                <li><strong className="text-gray-900 dark:text-white">Scope:</strong> Limited "drive.file" scope - can only access files created by UltraPlan</li>
                <li><strong className="text-gray-900 dark:text-white">Notes:</strong> Completely optional; requires separate authorization; backups stored in your account, not UltraPlan servers</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Strava Integration (Optional)
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                <li><strong className="text-gray-900 dark:text-white">Service:</strong> Strava API</li>
                <li><strong className="text-gray-900 dark:text-white">Data Accessed:</strong> Your activity data (routes, times, distances) from Strava</li>
                <li><strong className="text-gray-900 dark:text-white">Purpose:</strong> Compare your planned race with previous activities on similar routes</li>
                <li><strong className="text-gray-900 dark:text-white">Processing:</strong> All Strava data is processed locally in your browser</li>
                <li><strong className="text-gray-900 dark:text-white">Storage:</strong> Strava credentials and activity data are NOT stored on UltraPlan servers</li>
                <li><strong className="text-gray-900 dark:text-white">Notes:</strong> Completely optional; requires Strava authorization; you can disconnect at any time via your Strava settings</li>
              </ul>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-3">
                <p className="text-green-700 dark:text-green-200 text-sm">
                  <strong>Privacy First:</strong> UltraPlan does not store your Strava access tokens, activity data, or any personal information from Strava on any cloud servers. All processing happens locally in your browser session.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geolocation Service
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1 list-disc pl-5">
                <li><strong className="text-gray-900 dark:text-white">Service:</strong> ipapi.co (IP-based geolocation)</li>
                <li><strong className="text-gray-900 dark:text-white">Data Shared:</strong> Your IP address (sent to ipapi.co to determine location)</li>
                <li><strong className="text-gray-900 dark:text-white">Data Returned:</strong> Country, region, city, postal code, and ISP</li>
                <li><strong className="text-gray-900 dark:text-white">Purpose:</strong> To help us understand where our users are located globally</li>
                <li><strong className="text-gray-900 dark:text-white">Storage:</strong> Location data is stored in your user profile for admin analytics</li>
                <li><strong className="text-gray-900 dark:text-white">Notes:</strong> Used only for signed-in users; helps us prioritize features for different regions</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Lock className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Security</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Protection Measures
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Local storage only</li>
                <li>Encrypted HTTPS/TLS communication</li>
                <li>No plaintext password handling</li>
                <li>Regular security reviews</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Your Responsibilities
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Keep your device secure</li>
                <li>Export JSON backups regularly or use Google Drive backup</li>
                <li>Protect your Google account (if signed in or using Drive backup)</li>
                <li>Clear browser data on shared devices</li>
                <li>Manage your Google Drive backups and storage quota</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Your Rights & Control */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Your Rights & Control
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Access & Export
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>View all plans in-app</li>
                <li>Export JSON, GPX, or CSV</li>
                <li>No sign-in required for exports</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Modify
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Edit or update any race plan, contacts, or details</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Delete
              </h3>
              <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                <li>Delete individual plans in the app</li>
                <li>Clear browser data to wipe everything</li>
                <li>Request removal of your authentication data via email</li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Contact for Rights Requests
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                <a
                  href="mailto:john@runplan.run"
                  className="text-blue-400 hover:underline"
                >
                  john@runplan.run
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Data Retention
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Race Plans (Local Storage)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Stored locally until deleted</li>
                <li>Never uploaded to UltraPlan servers</li>
                <li>Permanently deleted when browser data is cleared</li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Google Drive Backups (Optional)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Stored in your personal Google Drive account</li>
                <li>Retained according to your Google Drive settings</li>
                <li>You can delete backups directly from your Google Drive at any time</li>
                <li>UltraPlan does not control retention of your Google Drive files</li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Authentication Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Retained while your account is active</li>
                <li>Can be deleted upon request</li>
                <li>Inactive accounts may be purged</li>
              </ul>
            </div>
          </div>
        </section>

        {/* International Users */}
        <section className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            International Users
          </h2>

          <div className="space-y-6">
            <ul className="text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
              <li>Race plans stay on your device and never leave it</li>
              <li>Authentication handled by Google</li>
              <li>UltraPlan infrastructure is US-based</li>
              <li>GDPR rights are fully supported</li>
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-8 mb-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Contact</h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                <strong className="text-gray-900 dark:text-white">Privacy & Support:</strong>{" "}
                <a
                  href="mailto:john@runplan.run"
                  className="text-blue-400 hover:underline"
                >
                  john@runplan.run
                </a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                UltraPlan is part of the RunPlan family of running applications. Both UltraPlan.run and RunPlan.run are owned and operated by the same developer.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Support</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                See{" "}
                <Link to="/guide" className="text-blue-400 hover:underline">
                  User Guide
                </Link>
                , Discord, or GitHub
              </p>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl p-8 border border-green-500/20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Summary – Your Privacy in Simple Terms
          </h2>

          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Your race plans are stored only on your device (local storage)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                UltraPlan never uploads or collects your plans to its servers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Optional Google Drive backup stores files in YOUR Drive, not UltraPlan servers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Strava integration processes data locally - no Strava data stored on our servers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Google sign-in is optional and never automatically syncs plan data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Basic usage analytics only (plan names, feature usage, location) - never sold or shared
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                You control, export, and delete everything
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p>
                Your plans remain private unless you choose to share them
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600 dark:text-gray-400 italic mt-6">
            Plans remain private unless you share to community or backup to your Google Drive.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}
