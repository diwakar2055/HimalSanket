import React, { useState } from "react";
import { Language, getTranslation } from "../data/localization";
import {
  X,
  Shield,
  Activity,
  Satellite,
  TrendingUp,
  Radio,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

interface SystemTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const TOUR_STEPS = [
  {
    step: 1,
    icon: Activity,
    color: "from-cyan-500 to-blue-600",
    title_en: "Layer 1: Real-Time Ground Telemetry Grid",
    title_ne: "तह १: प्रत्यक्ष स्थलगत सेन्सर सञ्जाल",
    desc_en:
      "Automated Weather Stations (AWS) measure continuous precipitation rates (mm/h), soil moisture volumetric water content (% VWC), and localized seismic accelerations (PGA g). These live signals continuously update the multi-hazard risk engine.",
    desc_ne:
      "नेपाल जल तथा मौसम विज्ञान विभाग (DHM) तथा राष्ट्रिय भूकम्प मापन केन्द्रका स्वचालित सेन्सरहरूले प्रति घण्टा वर्षा दर, माटोको ओसिलोपन तथा कम्पनको नियमित मापन गर्दछन्।",
    badge: "AWS & USGS Network",
  },
  {
    step: 2,
    icon: Satellite,
    color: "from-blue-600 to-indigo-600",
    title_en: "Layer 2: ESA Sentinel-2 Satellite NDWI Analysis",
    title_ne: "तह २: सेन्टिनेल-२ उपग्रह हिमताल विस्तार विश्लेषण",
    desc_en:
      "Sentinel-2 MSI Level-2A multi-spectral satellite imagery tracks proglacial and supraglacial lake expansions behind loose moraine dams. Normalized Difference Water Index (NDWI > 0.30) detects rapid melt pond expansion before catastrophic dam crest overtopping.",
    desc_ne:
      "युरोपेली अन्तरिक्ष एजेन्सी (ESA) को सेन्टिनेल-२ उपग्रहबाट एनडीडब्लूआई (NDWI) सुचकांक मार्फत हिमतालको सतह विस्तार तथा सम्भावित हिमताल विस्फोट (GLOF) को पूर्वअनुमान गरिन्छ।",
    badge: "10m Optical NDWI",
  },
  {
    step: 3,
    icon: TrendingUp,
    color: "from-indigo-600 to-purple-600",
    title_en: "Layer 3: Google TimesFM 24h Predictive Rainfall AI",
    title_ne: "तह ३: गुगल टाइम्सएफएम २४ घण्टे एआई वर्षा पूर्वानुमान",
    desc_en:
      "Rather than only looking at past rain, HimalSanket runs Google's TimesFM foundation time-series model to forecast the next 24 hours of precipitation. It computes exceedance probabilities against geotechnical slope collapse thresholds (144mm).",
    desc_ne:
      "बितेको वर्षा मात्र नहेरी, गुगलको टाइम्सएफएम (TimesFM) फाउन्डेसन मोडलले आगामी २४ घण्टाको वर्षा दर र माटोको पकड कमजोर हुने सम्भाव्यताको स्वचालित पूर्वानुमान गर्दछ।",
    badge: "Hydrological Foundation Model",
  },
  {
    step: 4,
    icon: Radio,
    color: "from-purple-600 to-rose-600",
    title_en: "Layer 4: Trekker GPS Geofence & Proximity Tracking",
    title_ne: "तह ४: पदयात्री जीपीएस रडार तथा जोखिम क्षेत्र चेतावनी",
    desc_en:
      "HimalSanket locates every trekker via browser GPS radar. It continuously calculates distance to the active river flood inundation buffer and steep landslide chutes. If a trekker enters within 150m of a hazard zone, an urgent geofence warning sounds.",
    desc_ne:
      "पदमार्गमा रहेका यात्रुहरूको प्रत्यक्ष जीपीएस स्थान पत्ता लगाई खोलाको बाढी वा पहिरो क्षेत्रबाट १५० मिटर नजिक पुग्दा तुरुन्तै स्वतः सचेत गराइन्छ र आपतकालीन उद्धार संकेत पठाइन्छ।",
    badge: "Sub-150m Threat Geofence",
  },
  {
    step: 5,
    icon: Sparkles,
    color: "from-rose-600 to-amber-600",
    title_en: "Layer 5: Grounded Gemini 2.0 Flash Autonomous Intelligence",
    title_ne: "तह ५: जेमिनाई २.० फ्ल्यास स्वायत्त विपद् निर्देशन",
    desc_en:
      "Google Gemini 2.0 Flash is fed live sensor feeds, trekker GPS coordinates, and active hazard scenarios. It delivers situational safety directives in English and Nepali, commands Search & Rescue triage, and broadcasts audio voice advisories.",
    desc_ne:
      "गुगल जेमिनाई एआईले प्रत्यक्ष वातावरणीय तथ्याङ्क तथा पदयात्रीको स्थानको आधारमा अङ्ग्रेजी र नेपाली दुवै भाषामा वास्तविक सुरक्षा निर्देशन तथा ध्वनि प्रसारण प्रदान गर्दछ।",
    badge: "Live Telemetry Grounded",
  },
];

export function SystemTourModal({ isOpen, onClose, language }: SystemTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#101A2A] border border-[#27364B] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#080E19] border-b border-[#27364B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === "ne" ? "हिमालसंकेत: ५-तहिय एआई विपद् पूर्वसूचना प्रणाली" : "HimalSanket 5-Layer AI Architecture Tour"}
              </h3>
              <p className="text-xs text-[#A7B4C8]">
                {language === "ne" ? "नेपालका हिमाली पदमार्गहरूका लागि स्वायत्त विपद् अनुगमन" : "Autonomous Disaster Intelligence for the Nepal Himalayas"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A7B4C8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Step Progress Pills */}
          <div className="flex items-center justify-between gap-2">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/50"
                    : idx < currentStep
                    ? "bg-cyan-700/60"
                    : "bg-[#27364B]"
                }`}
              />
            ))}
          </div>

          {/* Active Step Card */}
          <div className="p-6 rounded-xl bg-[#152238] border border-[#27364B] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-tr ${step.color} text-white shadow-lg`}>
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {step.badge}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">
                    {language === "ne" ? step.title_ne : step.title_en}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#64748B]">
                {currentStep + 1} / {TOUR_STEPS.length}
              </span>
            </div>

            <p className="text-xs md:text-sm text-[#E2E8F0] leading-relaxed">
              {language === "ne" ? step.desc_ne : step.desc_en}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#080E19] border-t border-[#27364B] flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A7B4C8] hover:text-white bg-[#152238] border border-[#27364B] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentStep < TOUR_STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-blue-600/30 cursor-pointer transition-transform hover:scale-105"
            >
              <span>Next Layer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 cursor-pointer transition-transform hover:scale-105"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Start Exploring HimalSanket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
