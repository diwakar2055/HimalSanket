// HimalSanket Bilingual Localization Dictionary (English & नेपाली)

export type Language = "en" | "ne";

export const TRANSLATIONS = {
  en: {
    // Brand & Header
    brandName: "HimalSanket",
    brandSubtitle: "Multi-Hazard Early Warning & Disaster Intelligence",
    systemOnline: "Live Autonomous Telemetry Active",
    statusNormal: "NORMAL BASELINE",
    statusModerate: "ELEVATED ADVISORY",
    statusHigh: "HIGH RISK WARNING",
    statusCritical: "CRITICAL GLOF / FLOOD EMERGENCY",
    activeDistrict: "Rasuwa District · Langtang Basin",
    
    // Navigation Tabs
    tabMap: "Tactical Risk Map",
    tabAnalytics: "Predictive AI Analytics",
    tabSar: "Search & Rescue Queue",
    tabSos: "Victim SOS Beacon",
    
    // Quick Tools
    guideBtn: "System Architecture Tour",
    langBtn: "नेपाली",
    quickSosBtn: "1-Click SOS",
    
    // Scenarios
    scenariosTitle: "1-Click Presentation Disaster Scenarios",
    scenarioBaseline: "Baseline Normal",
    scenarioCloudburst: "Cloudburst Spike (118mm)",
    scenarioSeismic: "USGS 3.6M Tremor",
    scenarioGlof: "Sentinel-2 GLOF (+14.8%)",
    scenarioCascade: "Critical Cascade",
    
    // Corridor Details
    corridorsLabel: "Monitored Corridors",
    simRainSpike: "Simulate Rain Spike",
    resetSignals: "Reset Corridor Signals",
    
    // Live Telemetry
    telemetryTitle: "Live Environmental Telemetry Feeds",
    rainfallLabel: "24h Saturation",
    rainRateLabel: "Rain Rate",
    seismicLabel: "Crustal Seismicity",
    lakeChangeLabel: "Sentinel-2 NDWI Delta",
    soilMoistureLabel: "Soil Moisture VWC",
    slopeLabel: "Slope Incline",
    reportsLabel: "Field Dispatches",
    inspectSatelliteBtn: "Inspect Satellite ↗",
    
    // Geofence & Trekker
    geofenceAlertTitle: "ACTIVE GEOFENCE INTRUSION WARNING",
    geofenceAlertDesc: "You are dangerously close to the active river surge path or landslide debris chute! Move uphill immediately to high granite bedrock terraces.",
    trekkerRadarTitle: "Live Trekker Geolocation & Radar",
    locateMeBtn: "Locate My Device (GPS)",
    simulateTrekkerBtn: "Simulate Langtang Trekker",
    distanceToHazard: "to nearest hazard zone",
    safeBuffer: "Safe Buffer",
    dangerZone: "DANGER ZONE",
    
    // Map Layers
    mapLayersTitle: "Tactical GIS Layers",
    layerPeople: "Settlements & Lodges",
    layerBridges: "Suspension Bridges",
    layerSchools: "Schools",
    layerClinics: "Clinics / Hospitals",
    layerDams: "Hydropower Dams",
    layerSafeHavens: "Safe Haven Terraces",
    layerLandslides: "Landslide Chutes",
    layerLakes: "Glacial Lake Boundary",
    layerSurge: "Dynamic River Flood Buffer",
    layerSarBases: "SAR Dispatch Bases",
    surgeSliderLabel: "Simulated River Surge",
    
    // Analytics
    timesfmTitle: "Google TimesFM 24-Hour AI Predictive Rainfall Forecast",
    cascadeTitle: "Downstream Glacial Floodwave Propagation & Lag-Times",
    
    // Gemini AI
    geminiTitle: "Gemini 2.0 Flash Reasoning & Directive Layer",
    voiceBroadcastEn: "🔊 Voice Broadcast (English)",
    voiceBroadcastNe: "🔊 ध्वनि प्रसारण (नेपाली)",
    actionDirectiveLabel: "ACTION DIRECTIVE",
    
    // Ground Report
    reportTitle: "Submit Field Ground Dispatch",
    recordVoiceBtn: "🎙️ Speak / Record Voice Note",
    submitReportBtn: "Submit Dispatch",
    voiceAttachedLabel: "Voice Note Attached",
    
    // SOS Beacon
    sosTitle: "Victim Self-Report & Tactical Rescue Beacon",
    sosSubtitle: "Transmit exact GPS coordinates and voice notes directly to Nepal Army & APF SAR teams.",
    broadcastSosBtn: "BROADCAST EMERGENCY SOS BEACON",
    
    // Search & Rescue
    sarTitle: "Prioritized Search & Rescue Queue (APF & Nepal Army)",
    sarSubtitle: "Algorithmic triage prioritizing direct SOS signals and multi-story collapses.",
    missingPersonFormTitle: "Family: Report Missing Person",
  },
  ne: {
    // Brand & Header
    brandName: "हिमालसंकेत",
    brandSubtitle: "बहु-प्रकोप पूर्वसूचना तथा विपद् व्यवस्थापन एआई प्रणाली",
    systemOnline: "प्रत्यक्ष वातावरणीय सेन्सर नेटवर्क सक्रिय",
    statusNormal: "सामान्य अवस्था",
    statusModerate: "मध्यम सतर्कता",
    statusHigh: "उच्च जोखिम चेतावनी",
    statusCritical: "गम्भीर बाढी तथा हिमताल संकटकाल",
    activeDistrict: "रसुवा जिल्ला · लाङटाङ जलाधार क्षेत्र",
    
    // Navigation Tabs
    tabMap: "नक्सा तथा जोखिम अनुगमन",
    tabAnalytics: "एआई पूर्वअनुमान विश्लेषण",
    tabSar: "उद्धार प्राथमिकता सूची",
    tabSos: "आपतकालीन उद्धार संकेत (SOS)",
    
    // Quick Tools
    guideBtn: "प्रणाली परिचय तथा भ्रमण",
    langBtn: "English",
    quickSosBtn: "तत्काल SOS",
    
    // Scenarios
    scenariosTitle: "प्रस्तुतीकरण विपद् परिदृश्यहरू (१-क्लिक)",
    scenarioBaseline: "सामान्य अवस्था",
    scenarioCloudburst: "बादल फाट्ने भीषण वर्षा (११८mm)",
    scenarioSeismic: "३.६ म्याग्निच्युड भूकम्पीय कम्पन",
    scenarioGlof: "सेन्टिनेल-२ हिमताल विस्तार (+१४.८%)",
    scenarioCascade: "शृङ्खलाबद्ध विनाशकारी प्रकोप",
    
    // Corridor Details
    corridorsLabel: "निगरानी गरिएका पदमार्गहरू",
    simRainSpike: "वर्षा वृद्धि सिमुलेसन",
    resetSignals: "संकेतहरू पुनःसेट गर्नुहोस्",
    
    // Live Telemetry
    telemetryTitle: "प्रत्यक्ष वातावरणीय सेन्सर तथ्याङ्क",
    rainfallLabel: "२४ घण्टाको वर्षा",
    rainRateLabel: "वर्षा दर",
    seismicLabel: "भूकम्पीय कम्पन",
    lakeChangeLabel: "सेन्टिनेल-२ हिमताल विस्तार",
    soilMoistureLabel: "माटोको ओसिलोपन",
    slopeLabel: "भीरको भिरालोपन",
    reportsLabel: "स्थानीय प्रत्यक्ष प्रतिवेदनहरू",
    inspectSatelliteBtn: "उपग्रह तस्बिर हेर्नुहोस् ↗",
    
    // Geofence & Trekker
    geofenceAlertTitle: "🚨 आपतकालीन जोखिम क्षेत्र चेतावनी (GEOFENCE ALERT)",
    geofenceAlertDesc: "तपाईं खोलाको बाढी वा पहिरो खस्ने अति-जोखिमपूर्ण क्षेत्र नजिक हुनुहुन्छ! तुरुन्तै सुरक्षित माथिल्लो डाँडातर्फ उक्लिनुहोस्।",
    trekkerRadarTitle: "प्रत्यक्ष पदयात्री जीपीएस रडार",
    locateMeBtn: "मेरो जीपीएस पत्ता लगाउनुहोस्",
    simulateTrekkerBtn: "लाङटाङ पदयात्री सिमुलेट",
    distanceToHazard: "जोखिम क्षेत्रसम्मको दूरी",
    safeBuffer: "सुरक्षित क्षेत्र",
    dangerZone: "खतरा क्षेत्र",
    
    // Map Layers
    mapLayersTitle: "रणनीतिक जीआईएस तहहरू",
    layerPeople: "गाउँ तथा लजहरू",
    layerBridges: "झोलुङ्गे पुलहरू",
    layerSchools: "विद्यालयहरू",
    layerClinics: "स्वास्थ्य चौकीहरू",
    layerDams: "जलविद्युत बाँधहरू",
    layerSafeHavens: "सुरक्षित आश्रयस्थलहरू",
    layerLandslides: "पहिरो सम्भावित क्षेत्र",
    layerLakes: "हिमताल विस्तार सीमा",
    layerSurge: "खोलाको बाढी विस्तार क्षेत्र",
    layerSarBases: "सुरक्षा निकाय उद्धार अखडा",
    surgeSliderLabel: "सिमुलेटेड नदी जलसतह वृद्धि",
    
    // Analytics
    timesfmTitle: "गुगल टाइम्सएफएम २४ घण्टे एआई वर्षा पूर्वानुमान",
    cascadeTitle: "तल्लो तटीय क्षेत्रमा बाढी पुग्न लाग्ने समय",
    
    // Gemini AI
    geminiTitle: "जेमिनाई २.० फ्ल्यास एआई विश्लेषण तथा निर्देशन",
    voiceBroadcastEn: "🔊 Voice Broadcast (English)",
    voiceBroadcastNe: "🔊 ध्वनि प्रसारण (नेपाली)",
    actionDirectiveLabel: "तत्काल निर्देशन",
    
    // Ground Report
    reportTitle: "प्रत्यक्ष स्थलगत प्रतिवेदन पठाउनुहोस्",
    recordVoiceBtn: "🎙️ आवाज रेकर्ड गर्नुहोस् (नेपाली/अङ्ग्रेजी)",
    submitReportBtn: "प्रतिवेदन पेश गर्नुहोस्",
    voiceAttachedLabel: "आवाज सन्देश संलग्न गरिएको छ",
    
    // SOS Beacon
    sosTitle: "पीडित प्रत्यक्ष आपतकालीन सन्देश (SOS)",
    sosSubtitle: "नेपाल सेना तथा सशस्त्र प्रहरी बल (APF) को उद्धार टोलीलाई तुरुन्त जीपीएस स्थान पठाउनुहोस्।",
    broadcastSosBtn: "आपतकालीन उद्धार संकेत (SOS) प्रसारण गर्नुहोस्",
    
    // Search & Rescue
    sarTitle: "उद्धार प्राथमिकता सूची (नेपाल प्रहरी / APF / सेना)",
    sarSubtitle: "प्रत्यक्ष SOS संकेत तथा भत्किएका भवनहरूलाई आधार मानी स्वचालित प्राथमिकता निर्धारण।",
    missingPersonFormTitle: "परिवार: बेपत्ता व्यक्तिको सूचना दिनुहोस्",
  },
};

export function getTranslation(lang: Language, key: keyof typeof TRANSLATIONS["en"]): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || String(key);
}
