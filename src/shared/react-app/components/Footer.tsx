import { Coffee, Github, BookOpen, Shield, MessageCircle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import stravaButton from "../img/btn_strava_connect_with_orange_x2.png";

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#1a1f2e] border-t border-gray-200 dark:border-gray-800 py-6 mt-12">
      <style>{`
        @keyframes pulse-donate {
          0%, 100% {
            transform: scale(1);
            background: linear-gradient(to right, rgb(202, 138, 4), rgb(161, 98, 7));
          }
          50% {
            transform: scale(1.15);
            background: linear-gradient(to right, rgb(161, 98, 7), rgb(133, 77, 14));
          }
        }
        .donate-button-pulse {
          animation: pulse-donate 3.5s ease-in-out infinite;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
          >
            <BookOpen className="w-4 h-4" />
            User Guide
          </Link>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <Link
            to="/support"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
          >
            <MessageCircle className="w-4 h-4" />
            Support Forum
          </Link>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </Link>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <Link
            to="/gear"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
          >
            <Package className="w-4 h-4" />
            Gear Guide
          </Link>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <a
            href="https://www.paypal.com/donate/?hosted_button_id=JJQ3HSZGHS42J"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-semibold rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all shadow-md hover:shadow-lg donate-button-pulse"
          >
            <Coffee className="w-4 h-4" />

          </a>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <a
            href="https://www.strava.com/clubs/1858183"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src={stravaButton}
              alt="Connect with Strava"
              className="h-10"
            />
          </a>

          <span className="text-gray-400 dark:text-gray-600">•</span>

          <a
            href="https://github.com/glasgowwebguy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all shadow-md hover:shadow-lg"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>

        <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-600">
          Built with passion for ultramarathon runners
        </div>
        <div className="text-center mt-2 text-xs text-gray-400 dark:text-gray-600">
          As an Amazon Associate I earn from qualifying purchases.
        </div>
      </div>
    </footer>
  );
}
