import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Info, Search } from "lucide-react";
import { getUserTimezone } from "@/react-app/utils/etaCalculations";
import {
  MANDATORY_KIT_ITEMS,
  KIT_CATEGORIES,
  KIT_PRESETS,
} from "@/react-app/constants/mandatoryKitItems";
import { useUnit } from "@/react-app/contexts/UnitContext";
import { getDistanceUnitName, getDistancePlaceholder, inputToMiles, milesToKm } from "@/react-app/utils/unitConversions";

interface CreateRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    distance_miles: number;
    start_date_time?: string | null;
    timezone?: string | null;
    mandatory_kit?: string | null;
    logo_url?: string | null;
    userId?: string;
  }) => Promise<void>;
}

// Ultramarathon events data - parsed from Ultramarathons.txt
const ULTRAMARATHON_EVENTS = `West Highland Way Race 95 mi Scotland
Highland Fling Race 53 mi Scotland
Devil o' the Highlands Footrace 42 mi Scotland
Glasgow To Edinburgh Ultra 42 mi Scotland
Glen Ogle Ultra 33 mi Scotland
Dunoon Ultra 30 mi Scotland
Run The Blades 40 mi Scotland
Montane Spine Race 268 mi United Kingdom
Spine Challenger 108 mi United Kingdom
Race Across Scotland 215 mi Scotland
Ultra Scotland 100 100 mi Scotland
Great Glen Way Ultra 73 mi Scotland
Ben Nevis Ultra 45 mi Scotland
Trossachs Ultra 50 mi Scotland
Cairngorm Ultra 60 mi Scotland
West Coast Way 125 mi Scotland
Speyside Way Ultra 63 mi Scotland
Rob Roy Way Ultra 75 mi Scotland
Southern Upland Way 212 mi Scotland
Galloway Hills Ultra 40 mi Scotland
Loch Lomond Ultra 50 mi Scotland
Kintyre Way Ultra 100 mi Scotland
Arran Coastal Way Ultra 65 mi Scotland
Moffat Hills Ultra 35 mi Scotland
Moray Coastal Path Ultra 50 mi Scotland
Orkney Islands Ultra 40 mi Scotland
Shetland Ultra 50 mi Scotland
Outer Hebrides Way Ultra 154 mi Scotland
Isle of Skye Ultra 45 mi Scotland
Fife Coastal Path Ultra 120 mi Scotland
Angus Glens Ultra 40 mi Scotland
Perthshire Ultra 50 mi Scotland
Stirling Hills Ultra 35 mi Scotland
Dumfries and Galloway Ultra 60 mi Scotland
Highland Games Ultra 45 mi Scotland
Scottish Borders Ultra 70 mi Scotland
Ayrshire Coastal Path Ultra 100 mi Scotland
Morvern Hills Ultra 30 mi Scotland
Sutherland Coast Ultra 80 mi Scotland
Ross-shire Ultra 65 mi Scotland
Inverness Marathon Plus 30 mi Scotland
Fort William Ultra 40 mi Scotland
Oban Bay Run Ultra 25 mi Scotland
Thames Path 100 100 mi England
South Downs Way 100 100 mi England
North Downs Way 100 100 mi England
Lakeland 100 100 mi England
Montane Lakeland 100 100 mi England
Grand Union Canal Race 145 mi England
Cheshire Ring Ultra 100 100 mi England
Race The North 100 100 mi England
Peak District Ultra 50 mi England
Cotswold Way Ultra 102 mi England
Offa's Dyke Ultra 130 mi England
Peddars Way Ultra 47 mi England
Norfolk Coast Path Ultra 100 mi England
Cambridgeshire Fens Ultra 60 mi England
Essex Way Ultra 100 mi England
Hertfordshire Way Ultra 75 mi England
Suffolk Coast Path Ultra 80 mi England
Kent Coastal Ultra 120 mi England
Surrey Hills Ultra 50 mi England
Hampshire Hills Ultra 60 mi England
Dorset Coastal Path Ultra 95 mi England
Devon Coast to Coast Ultra 150 mi England
Cornwall Coastal Ultra 125 mi England
Somerset Levels Ultra 40 mi England
Wiltshire Way Ultra 50 mi England
Gloucestershire Way Ultra 55 mi England
Oxfordshire Ultra 45 mi England
Berkshire Way Ultra 65 mi England
Staffordshire Way Ultra 75 mi England
Derbyshire Dales Ultra 50 mi England
Leicestershire Ultra 40 mi England
Nottinghamshire Hills Ultra 35 mi England
Lincolnshire Wolds Ultra 50 mi England
Warwickshire Way Ultra 60 mi England
Herefordshire Trail Ultra 45 mi England
Shropshire Hills Ultra 70 mi England
Bedfordshire Way Ultra 40 mi England
Cambridgeshire Ultra 35 mi England
Norfolk Broads Ultra 60 mi England
Suffolk Way Ultra 45 mi England
Essex Coastal Path Ultra 100 mi England
Hertfordshire Trail Ultra 50 mi England
Buckinghamshire Way Ultra 55 mi England
Northumberland Way Ultra 103 mi England
Durham Dales Ultra 60 mi England
Cumbria Way Ultra 192 mi England
North York Moors Ultra 108 mi England
Yorkshire Wolds Way Ultra 79 mi England
Dales Way Ultra 80 mi England
Lyke Wake Walk 42 mi England
Wainwright Coast to Coast 192 mi England
Pennine Bridleway Ultra 205 mi England
Trans Pennine Trail Ultra 147 mi England
Canal Way Challenge 150 mi England
Trent Valley Ultra 70 mi England
Derwent Valley Ultra 40 mi England
Avon Valley Ultra 65 mi England
Thames Path Ultra 184 mi England
Medway Valley Ultra 50 mi England
Ouse Valley Ultra 55 mi England
Tamar Valley Ultra 60 mi England
Exe Valley Ultra 70 mi England
Test Valley Ultra 45 mi England
Stour Valley Ultra 50 mi England
Wye Valley Ultra 75 mi England
Severn Way Ultra 205 mi England
Grand Western Canal Ultra 62 mi England
Monk's Way Ultra 40 mi England
Hereward Way Ultra 91 mi England
Icknield Way Ultra 110 mi England
Macmillan Way Ultra 134 mi England
Blaby Way Ultra 35 mi England
Bridleway Challenge 100 mi England
Canal and River Trust Ultra 120 mi England
National Trail Ultra 100 mi England
English Coastal Path Ultra 200 mi England
English Heritage Way Ultra 80 mi England
National Trust Ultra 60 mi England
Countryside Challenge 150 mi England
Beachy Head Ultra 52 mi England
London to Brighton Ultra 54 mi England
Pennine Way Ultra 268 mi England
Hadrian's Wall Ultra 84 mi England
Yorkshire Three Peaks Ultra 25 mi England
Yr Wyddfa (Snowdon) Ultra 50 50 mi Wales
Beacons Way Ultra 100 100 mi Wales
Ultra Wales 50 50 mi Wales
Gower Ultra 50 mi Wales
Barry 40 Mile Race 40 mi Wales
Snowdonia Ultra 60 mi Wales
Brecon Beacons Ultra 50 mi Wales
Pembrokeshire Coastal Path Ultra 186 mi Wales
Cardigan Bay Ultra 100 mi Wales
Radnor Forest Ultra 40 mi Wales
Montgomeryshire Hills Ultra 50 mi Wales
Denbighshire Way Ultra 60 mi Wales
Flintshire Coastal Ultra 45 mi Wales
Powys Trail Ultra 70 mi Wales
Ceredigion Coast Ultra 80 mi Wales
Anglesey Coastal Ultra 125 mi Wales
Gwynedd Way Ultra 155 mi Wales
Wye Valley Walk Ultra 134 mi Wales
Usk Valley Ultra 45 mi Wales
Taff Trail Ultra 50 mi Wales
Rhondda Valley Ultra 40 mi Wales
Afan Valley Ultra 35 mi Wales
Neath Trail Ultra 30 mi Wales
Clydach Trail Ultra 25 mi Wales
Llangollen Canal Ultra 45 mi Wales
Montgomery Canal Ultra 35 mi Wales
Monmouthshire Way Ultra 65 mi Wales`
  .split("\n")
  .map((line) => {
    const match = line.match(/^(.+?)\s+(\d+)\s+mi/);
    if (match) {
      return { name: match[1].trim(), distance: parseFloat(match[2]) };
    }
    return null;
  })
  .filter(
    (event): event is { name: string; distance: number } => event !== null
  );

export default function CreateRaceModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateRaceModalProps) {
  const { useMiles } = useUnit();
  const [selectedEvent, setSelectedEvent] = useState("");
  const [name, setName] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mandatory kit state
  const [showMandatoryKit, setShowMandatoryKit] = useState(false);
  const [selectedKitItems, setSelectedKitItems] = useState<string[]>([]);
  const [kitSearchQuery, setKitSearchQuery] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [showEventTooltip, setShowEventTooltip] = useState(false);

  // Initialize timezone with user's timezone on mount
  useEffect(() => {
    setTimezone(getUserTimezone());
  }, []);

  // Create sorted events list with priority races first, then alphabetical
  const getSortedEvents = () => {
    const priorityOrder = [
      "West Highland Way Race",
      "Highland Fling Race",
      "Devil o' the Highlands Footrace",
    ];

    const priorityEvents = priorityOrder
      .map((name) => ULTRAMARATHON_EVENTS.find((e) => e.name === name))
      .filter((e): e is { name: string; distance: number } => e !== undefined);

    const remainingEvents = ULTRAMARATHON_EVENTS.filter(
      (e) => !priorityOrder.includes(e.name)
    ).sort((a, b) => a.name.localeCompare(b.name));

    return [...priorityEvents, ...remainingEvents];
  };

  const sortedEvents = getSortedEvents();

  if (!isOpen) return null;

  const handleEventChange = (eventValue: string) => {
    setSelectedEvent(eventValue);

    if (eventValue === "custom") {
      // Clear name and distance for custom entry
      setName("");
      setDistanceMiles("");
    } else if (eventValue) {
      // Find the selected event and populate fields
      const event = ULTRAMARATHON_EVENTS.find((e) => e.name === eventValue);
      if (event) {
        setName(event.name);
        // Convert to current unit for display
        const displayDistance = useMiles ? event.distance : milesToKm(event.distance);
        setDistanceMiles(displayDistance.toFixed(1));
      }
    } else {
      // Empty selection
      setName("");
      setDistanceMiles("");
    }
  };

  const toggleKitItem = (item: string) => {
    setSelectedKitItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const applyKitPreset = (presetName: string) => {
    if (presetName === "Clear All") {
      setSelectedKitItems([]);
    } else {
      const preset = KIT_PRESETS[presetName];
      if (preset) {
        setSelectedKitItems(preset);
      }
    }
  };

  const filteredKitItems = MANDATORY_KIT_ITEMS.filter((item) =>
    item.toLowerCase().includes(kitSearchQuery.toLowerCase())
  );

  const getCategoryItemCount = (category: string) => {
    const categoryItems =
      KIT_CATEGORIES[category as keyof typeof KIT_CATEGORIES];
    return categoryItems.filter((item) => selectedKitItems.includes(item))
      .length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !distanceMiles) return;

    setSubmitting(true);
    try {
      // Convert input to miles for storage
      const distanceInMiles = inputToMiles(parseFloat(distanceMiles), useMiles);

      await onSubmit({
        name,
        distance_miles: distanceInMiles,
        start_date_time: startDateTime
          ? new Date(startDateTime).toISOString()
          : null,
        timezone: timezone || null,
        mandatory_kit:
          selectedKitItems.length > 0 ? JSON.stringify(selectedKitItems) : null,
        logo_url: logoUrl || null,
      });
      setSelectedEvent("");
      setName("");
      setDistanceMiles("");
      setStartDateTime("");
      setTimezone(getUserTimezone());
      setLogoUrl("");
      setSelectedKitItems([]);
      setShowMandatoryKit(false);
      setKitSearchQuery("");
      onClose();
    } catch (error) {
      console.error("Failed to create race:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white dark:bg-[#2d3548] coloursplash:bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 coloursplash:border-splash-border">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4 sm:mb-6 coloursplash:border-l-4 coloursplash:border-l-splash-azure coloursplash:pl-4 coloursplash:border-b coloursplash:border-splash-border coloursplash:pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white coloursplash:text-splash-text-primary">Create Race Plan</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#333c52] rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                  Select Event
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowEventTooltip(true)}
                    onMouseLeave={() => setShowEventTooltip(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-[#333c52] rounded transition-all"
                  >
                    <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  {showEventTooltip && (
                    <div className="absolute left-0 top-8 z-50 w-64 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                      Event can be edited after creation
                      <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white dark:border-b-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <select
                value={selectedEvent}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
              >
                <option value="">-- Select a race or enter custom --</option>
                <option value="custom">Custom Race</option>
                {sortedEvents.map((event) => {
                  const displayDistance = useMiles ? event.distance : milesToKm(event.distance);
                  const unit = useMiles ? 'mi' : 'km';
                  return (
                    <option key={event.name} value={event.name}>
                      {event.name} ({displayDistance.toFixed(1)} {unit})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                Race Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Highland Fling Race"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
                disabled={selectedEvent !== "" && selectedEvent !== "custom"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                Distance ({getDistanceUnitName(useMiles)})
              </label>
              <input
                type="number"
                step="0.1"
                value={distanceMiles}
                onChange={(e) => setDistanceMiles(e.target.value)}
                placeholder={getDistancePlaceholder(useMiles)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary">
                  Race Logo URL (Optional)
                </label>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-600 dark:text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    <div className="font-semibold mb-2">How to get the logo URL:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Visit the race website</li>
                      <li>Locate the race logo/icon</li>
                      <li>Right-click on the logo</li>
                      <li>Select "Copy Image Address"</li>
                      <li>Paste the URL here</li>
                    </ol>
                    <div className="mt-2 text-yellow-400 coloursplash:text-splash-text-muted">
                      Note: Logo is private and won't appear on shared plans
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/race-logo.png"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 coloursplash:border-splash-border pt-4 mt-2">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-3">
                Race Timing (Optional)
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mt-1">
                  Set this to calculate arrival times at each checkpoint
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent transition-all"
                >
                  <option value="Europe/London">UK (Europe/London)</option>
                  <option value="Europe/Dublin">Ireland (Europe/Dublin)</option>
                  <option value="America/New_York">
                    US Eastern (America/New_York)
                  </option>
                  <option value="America/Chicago">
                    US Central (America/Chicago)
                  </option>
                  <option value="America/Denver">
                    US Mountain (America/Denver)
                  </option>
                  <option value="America/Los_Angeles">
                    US Pacific (America/Los_Angeles)
                  </option>
                  <option value="Europe/Paris">
                    Central Europe (Europe/Paris)
                  </option>
                  <option value="Europe/Berlin">Germany (Europe/Berlin)</option>
                  <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
                  <option value="Australia/Sydney">
                    Australia (Australia/Sydney)
                  </option>
                </select>
              </div>
            </div>

            {/* Mandatory Kit Section */}
            <div className="border-t border-gray-200 dark:border-gray-600 coloursplash:border-splash-border pt-5">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMandatoryKit(!showMandatoryKit)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <span>Mandatory Kit List</span>
                    {showMandatoryKit ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  {selectedKitItems.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      {selectedKitItems.length} selected
                    </span>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-[#333c52] rounded transition-all"
                    >
                      <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {showTooltip && (
                      <div className="absolute left-0 top-8 z-50 w-64 p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                        Selected items will appear as checkboxes in your printed
                        race plan PDF/CSV
                        <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showMandatoryKit && (
                <div className="mt-4 space-y-4 bg-gray-50 dark:bg-[#3a4458] coloursplash:bg-white rounded-lg p-4 border border-gray-200 dark:border-gray-600 coloursplash:border-splash-border max-h-96 overflow-y-auto">
                  {/* Quick Select Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted mb-2">
                      Quick Select
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(KIT_PRESETS).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => applyKitPreset(preset)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyKitPreset("Clear All")}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <input
                      type="text"
                      value={kitSearchQuery}
                      onChange={(e) => setKitSearchQuery(e.target.value)}
                      placeholder="Search kit items..."
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#2d3548] coloursplash:bg-white border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-900 dark:text-white coloursplash:text-splash-text-primary placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 coloursplash:focus:ring-splash-azure focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Kit Items by Category */}
                  <div className="space-y-4">
                    {Object.entries(KIT_CATEGORIES).map(([category, items]) => {
                      const visibleItems = items.filter((item) =>
                        (filteredKitItems as string[]).includes(item)
                      );

                      if (visibleItems.length === 0) return null;

                      const selectedCount = getCategoryItemCount(category);

                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary uppercase">
                              {category}
                            </h4>
                            {selectedCount > 0 && (
                              <span className="text-xs text-blue-400">
                                {selectedCount} of {items.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {visibleItems.map((item) => (
                              <label
                                key={item}
                                className="flex items-start gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2d3548] coloursplash:hover:bg-splash-bg-subtle p-2 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedKitItems.includes(item)}
                                  onChange={() => toggleKitItem(item)}
                                  className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 dark:bg-[#2d3548] border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary leading-tight">
                                  {item}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedKitItems.length === 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 coloursplash:text-splash-text-muted text-center py-4">
                      No items selected. Use Quick Select or choose items
                      manually.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 sm:px-6 py-3 border border-gray-300 dark:border-gray-600 coloursplash:border-splash-border text-gray-700 dark:text-gray-300 coloursplash:text-splash-text-secondary font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-[#333c52] coloursplash:hover:bg-splash-bg-subtle transition-all min-h-[44px] order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 coloursplash:from-splash-green coloursplash:to-splash-green-hover text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl min-h-[44px] order-1 sm:order-2"
              >
                {submitting ? "Creating..." : "Create Plan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
