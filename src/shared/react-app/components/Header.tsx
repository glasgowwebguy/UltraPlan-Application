/**
 * Header Component
 * Navigation bar for UltraPlan Desktop
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useUnit } from '../contexts/UnitContext';
import { useTheme } from '../contexts/ThemeContext';
import { Settings, Sun, Moon, Cloud, Menu, X, Package } from 'lucide-react';
import runPlanLogo from '../img/RunPlan.png';
import BackupOptionsModal from './BackupOptionsModal';
import NutritionProductsManager from './NutritionProductsManager';

export const Header: React.FC = () => {
  const { useMiles, toggleUnit } = useUnit();
  const { theme, setTheme } = useTheme();
  const [showSettings, setShowSettings] = React.useState(false);
  const [showBackupModal, setShowBackupModal] = React.useState(false);
  const [showProductsManager, setShowProductsManager] = React.useState(false);
  const [currentRaceId, setCurrentRaceId] = React.useState<number | null>(null);
  const [currentRaceName, setCurrentRaceName] = React.useState<string>('');
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  // Listen for current race info from race planner pages
  React.useEffect(() => {
    const handleRaceInfo = (event: CustomEvent) => {
      setCurrentRaceId(event.detail.raceId);
      setCurrentRaceName(event.detail.raceName);
    };

    window.addEventListener('openBackupOptions' as any, handleRaceInfo);
    return () => window.removeEventListener('openBackupOptions' as any, handleRaceInfo);
  }, []);

  return (
    <header className="bg-white dark:bg-[#2d3548] coloursplash:bg-white border-b border-gray-200 dark:border-gray-700 coloursplash:border-splash-border px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src={runPlanLogo}
            alt="UltraPlan"
            className="h-8 sm:h-10 w-auto"
          />
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 coloursplash:from-splash-azure coloursplash:to-splash-purple bg-clip-text text-transparent">
            UltraPlan
          </h1>
        </Link>

        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="sm:hidden p-2 text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary hover:bg-gray-100 dark:hover:bg-[#3a4458] coloursplash:hover:bg-splash-azure-light rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop navigation */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-azure hover:bg-gray-100 dark:hover:bg-[#3a4458] coloursplash:hover:bg-splash-azure-light transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {showSettings && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute right-0 mt-2 bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border p-3 z-20 min-w-[200px]">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2 px-1">THEME</div>
                  <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-1 mb-4">
                    <button
                      onClick={() => {
                        setTheme('dark');
                        setShowSettings(false);
                      }}
                      className={`px-2 py-2 rounded transition-all text-sm font-medium flex flex-col items-center justify-center gap-1 ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:border-splash-azure coloursplash:bg-splash-azure-light coloursplash:text-splash-azure'
                          : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-azure'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span className="text-xs">Dark</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('coloursplash');
                        setShowSettings(false);
                      }}
                      className={`px-2 py-2 rounded transition-all text-sm font-medium flex flex-col items-center justify-center gap-1 ${
                        theme === 'coloursplash'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:border-splash-azure coloursplash:bg-splash-azure-light coloursplash:text-splash-azure'
                          : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-azure'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span className="text-xs">Light</span>
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2 px-1">DISTANCE UNIT</div>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-1 mb-4">
                    <button
                      onClick={() => {
                        if (!useMiles) toggleUnit();
                        setShowSettings(false);
                      }}
                      className={`flex-1 px-3 py-2 rounded transition-all text-sm font-medium ${
                        useMiles
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:from-splash-azure coloursplash:to-splash-green'
                          : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-azure'
                      }`}
                    >
                      Miles
                    </button>
                    <button
                      onClick={() => {
                        if (useMiles) toggleUnit();
                        setShowSettings(false);
                      }}
                      className={`flex-1 px-3 py-2 rounded transition-all text-sm font-medium ${
                        !useMiles
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:from-splash-azure coloursplash:to-splash-green'
                          : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted hover:text-gray-900 dark:hover:text-white coloursplash:hover:text-splash-azure'
                      }`}
                    >
                      Km
                    </button>
                  </div>

                  {/* Nutrition Products Link */}
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2 px-1">NUTRITION</div>
                  <button
                    onClick={() => {
                      setShowProductsManager(true);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 mb-4 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle hover:bg-gray-200 dark:hover:bg-[#444d5f] coloursplash:hover:bg-splash-azure-light rounded-lg transition-all group"
                  >
                    <Package className="w-4 h-4 text-purple-500 group-hover:text-purple-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary group-hover:text-gray-900 dark:group-hover:text-white">
                      Manage Products
                    </span>
                  </button>

                  {currentRaceId && (
                    <>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2 px-1">BACKUP</div>
                      <button
                        onClick={() => {
                          setShowBackupModal(true);
                          setShowSettings(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary hover:bg-gray-100 dark:hover:bg-[#3a4458] coloursplash:hover:bg-splash-azure-light transition-all"
                      >
                        <Cloud className="w-4 h-4" />
                        <span className="text-sm font-medium">Backup Options</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white dark:bg-[#2d3548] coloursplash:bg-white border-b border-gray-200 dark:border-gray-700 coloursplash:border-splash-border shadow-lg z-50">
          <div className="px-4 py-3 space-y-2">
            {/* Mobile Settings - Inline */}
            <div className="border-t border-gray-200 dark:border-gray-700 coloursplash:border-splash-border pt-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 coloursplash:text-splash-text-muted uppercase">Settings</div>

              {/* Theme Toggle */}
              <div className="px-4 py-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2">Theme</div>
                <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-1">
                  <button
                    onClick={() => {
                      setTheme('dark');
                    }}
                    className={`px-2 py-2 rounded transition-all text-sm font-medium flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:border-splash-azure coloursplash:bg-splash-azure-light coloursplash:text-splash-azure'
                        : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-xs">Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('coloursplash');
                    }}
                    className={`px-2 py-2 rounded transition-all text-sm font-medium flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                      theme === 'coloursplash'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:border-splash-azure coloursplash:bg-splash-azure-light coloursplash:text-splash-azure'
                        : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-xs">Light</span>
                  </button>
                </div>
              </div>

              {/* Distance Unit Toggle */}
              <div className="px-4 py-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2">Distance Unit</div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle rounded-lg p-1">
                  <button
                    onClick={() => {
                      if (!useMiles) toggleUnit();
                    }}
                    className={`flex-1 px-3 py-2 rounded transition-all text-sm font-medium min-h-[44px] ${
                      useMiles
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:from-splash-azure coloursplash:to-splash-green'
                        : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted'
                    }`}
                  >
                    Miles
                  </button>
                  <button
                    onClick={() => {
                      if (useMiles) toggleUnit();
                    }}
                    className={`flex-1 px-3 py-2 rounded transition-all text-sm font-medium min-h-[44px] ${
                      !useMiles
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white coloursplash:from-splash-azure coloursplash:to-splash-green'
                        : 'text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted'
                    }`}
                  >
                    Km
                  </button>
                </div>
              </div>

              {/* Nutrition Products */}
              <div className="px-4 py-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2">Nutrition</div>
                <button
                  onClick={() => {
                    setShowProductsManager(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle hover:bg-gray-200 dark:hover:bg-[#444d5f] coloursplash:hover:bg-splash-azure-light transition-all min-h-[44px]"
                >
                  <Package className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Manage Products</span>
                </button>
              </div>

              {/* Backup Options */}
              {currentRaceId && (
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      setShowBackupModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary bg-gray-100 dark:bg-[#3a4458] coloursplash:bg-splash-bg-subtle hover:bg-gray-200 dark:hover:bg-[#444d5f] coloursplash:hover:bg-splash-azure-light transition-all min-h-[44px]"
                  >
                    <Cloud className="w-4 h-4" />
                    <span className="text-sm font-medium">Backup Options</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && currentRaceId && (
        <BackupOptionsModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          raceId={currentRaceId}
          raceName={currentRaceName}
        />
      )}

      {/* Nutrition Products Manager Modal */}
      <NutritionProductsManager
        isOpen={showProductsManager}
        onClose={() => setShowProductsManager(false)}
        onProductsUpdated={() => {
          console.log('[Header] Products updated');
        }}
      />
    </header>
  );
};
