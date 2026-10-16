import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CORRIDOR_RESCUE_BASES } from "../data/hazardMapData";

export type UserRole = "civilian" | "rescuer" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  organization?: string;
  station?: string;
  avatarUrl?: string;
  callSign?: string;
}

export interface DistressBeacon {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  altitude?: number;
  detail: string;
  priority: number; // 0 - 100
  time: string;
  status: "pending" | "dispatched" | "en_route" | "rescued";
  assignedUnit?: string;
  contact?: string;
  corridorId?: string;
  civilianId?: string; // Links this beacon to a civilian user profile ID
}

export interface DispatchedRescueTeam {
  id: string;
  name: string;
  agency: string;
  vehicleType: "helicopter" | "ground_team";
  callSign: string;
  targetBeaconId: string | number;
  targetCivilianName: string;
  civilianId?: string; // ID of the civilian being rescued
  startBaseName: string;
  startPosition: { lat: number; lng: number };
  targetPosition: { lat: number; lng: number };
  currentPosition: { lat: number; lng: number };
  progress: number; // 0.0 to 1.0
  speedKmH: number;
  etaSeconds: number; // dynamically counted down
  totalDurationSeconds: number;
  distanceRemainingMeters: number;
  status: "dispatched" | "en_route" | "approaching" | "arrived" | "evacuating";
  dispatchedAt: string;
  contact: string;
  corridorId: string;
  trail: { lat: number; lng: number }[];
}

export interface FieldDispatch {
  id: string | number;
  senderName: string;
  type: "water" | "crack" | "sound" | "other";
  note: string;
  time: string;
  lat?: number;
  lng?: number;
  hasVoice?: boolean;
  aiClassification?: string;
  corridorId?: string;
}

export interface SystemAdvisory {
  id: string | number;
  corridorId: string;
  tier: "Low" | "Moderate" | "High" | "Critical";
  messageEn: string;
  messageNe: string;
  smsDraft: string;
  issuedAt: string;
  issuedBy: string;
}

interface UserRoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  userProfile: UserProfile;
  distressBeacons: DistressBeacon[];
  fieldDispatches: FieldDispatch[];
  systemAdvisories: SystemAdvisory[];
  dispatchedTeams: DispatchedRescueTeam[];
  broadcastSOS: (beacon: Omit<DistressBeacon, "id" | "time" | "status">) => DistressBeacon;
  updateBeaconStatus: (id: string | number, status: DistressBeacon["status"], assignedUnit?: string) => void;
  dispatchRescueTeam: (beaconId: string | number, teamName?: string, agency?: string) => DispatchedRescueTeam | null;
  cancelRescueTeam: (teamId: string) => void;
  resetRescueTeams: () => void;
  submitFieldDispatch: (dispatch: Omit<FieldDispatch, "id" | "time">) => FieldDispatch;
  broadcastAdvisory: (advisory: Omit<SystemAdvisory, "id" | "issuedAt">) => SystemAdvisory;
  clearResolvedBeacons: () => void;
  resetBeaconsToDefault: () => void;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const PRESET_PROFILES: Record<UserRole, UserProfile> = {
  civilian: {
    id: "civ_0921",
    name: "Pasang Sherpa",
    role: "civilian",
    email: "pasang.sherpa@langtang.guide",
    phone: "+977 9841-892100",
    organization: "Trekker & Mountain Resident",
    station: "Kyanjin Gompa (3,870m)",
  },
  rescuer: {
    id: "sar_4402",
    name: "Inspector Bikram Thapa",
    role: "rescuer",
    email: "b.thapa@apf.gov.np",
    phone: "+977 9851-224400",
    organization: "APF Himalayan Search & Rescue Base 3",
    station: "Dhunche Helipad Command Post",
    callSign: "EAGLE-SAR-3",
  },
  admin: {
    id: "adm_0012",
    name: "Dr. Ramesh Adhikari",
    role: "admin",
    email: "r.adhikari@ndrrma.gov.np",
    phone: "+977 1-4200100",
    organization: "NDRRMA Emergency Operations Center (NEOC)",
    station: "Singha Durbar, Kathmandu",
  },
};

const INITIAL_DISTRESS_BEACONS: DistressBeacon[] = [
  {
    id: "sos-101",
    name: "Trekker Group (4 Pax) — Lama Hotel Gorge",
    lat: 28.1670,
    lng: 85.4520,
    altitude: 2470,
    detail: "Suspension bridge swept away by sudden river surge. Group isolated on north gravel terrace; heavy rain continuing.",
    priority: 96,
    time: "12 mins ago",
    status: "dispatched",
    assignedUnit: "Nepal Army Kalidatta Air SAR Wing",
    contact: "+977 9801-445522 (Guide Lakpa)",
    corridorId: "langtang",
    civilianId: "civ_0921",
  },
  {
    id: "sos-102",
    name: "Pemba Tenzing (Porter) — Ghodatabela Bluff",
    lat: 28.1920,
    lng: 85.4850,
    altitude: 3020,
    detail: "Sprained ankle during rockfall. Sheltered in traditional stone lodge. Unable to navigate steep muddy descent.",
    priority: 84,
    time: "28 mins ago",
    status: "pending",
    contact: "+977 9813-909012",
    corridorId: "langtang",
  },
  {
    id: "sos-103",
    name: "Solo Trekker — Rimche Ridge Trail",
    lat: 28.1565,
    lng: 85.4010,
    altitude: 2150,
    detail: "Lost main trail in heavy canyon mist. Whistle signaling active; battery at 18%.",
    priority: 72,
    time: "45 mins ago",
    status: "pending",
    contact: "Garmin InReach: #8821-LGT",
    corridorId: "langtang",
  },
  {
    id: "sos-mardi-1",
    name: "Stranded Trekkers (2 Pax) — Upper Mardi Gorge",
    lat: 28.3671,
    lng: 83.8819,
    altitude: 1720,
    detail: "Water surge overtopped trail bridge downstream of Siding. Sheltered on upper terrace boulders.",
    priority: 91,
    time: "15 mins ago",
    status: "pending",
    contact: "+977 9846-123490",
    corridorId: "mardi",
  },
  {
    id: "sos-poonhill-1",
    name: "Hiker with Hypothermia — Nangethanti Forest",
    lat: 28.3842,
    lng: 83.7103,
    altitude: 2450,
    detail: "Severely hypothermic trekker unable to ascend to Ghorepani pass in intense monsoon downpour.",
    priority: 88,
    time: "20 mins ago",
    status: "pending",
    contact: "+977 9867-889900",
    corridorId: "poonhill",
  },
  {
    id: "sos-abc-1",
    name: "Injured Guide (Rockfall) — Deurali Chasm",
    lat: 28.4975,
    lng: 83.8983,
    altitude: 3200,
    detail: "Traumatic leg fracture from scree slide. Requires emergency high-altitude helicopter sling evacuation.",
    priority: 95,
    time: "18 mins ago",
    status: "pending",
    contact: "+977 9856-778899",
    corridorId: "abc",
  },
];

const INITIAL_DISPATCHED_TEAMS: DispatchedRescueTeam[] = [
  {
    id: "team-langtang-1",
    name: "Nepal Army Kalidatta Air SAR Wing",
    agency: "Nepal Army",
    vehicleType: "helicopter",
    callSign: "EAGLE-SAR-3",
    targetBeaconId: "sos-101",
    targetCivilianName: "Trekker Group (4 Pax) — Lama Hotel Gorge",
    civilianId: "civ_0921",
    startBaseName: "Nepal Army Kalidatta Battalion Outpost",
    startPosition: { lat: 28.1550, lng: 85.3350 },
    targetPosition: { lat: 28.1670, lng: 85.4520 },
    currentPosition: { lat: 28.1585, lng: 85.3690 },
    progress: 0.28,
    speedKmH: 180,
    etaSeconds: 420,
    totalDurationSeconds: 80,
    distanceRemainingMeters: 8400,
    status: "en_route",
    dispatchedAt: "10 mins ago",
    contact: "Nepal Army SAR VHF 142.5 MHz",
    corridorId: "langtang",
    trail: [
      { lat: 28.1550, lng: 85.3350 },
      { lat: 28.1565, lng: 85.3500 },
      { lat: 28.1585, lng: 85.3690 },
    ],
  },
];

const INITIAL_FIELD_DISPATCHES: FieldDispatch[] = [
  {
    id: "rep-201",
    senderName: "Dawa Guide",
    type: "water",
    note: "Langtang Khola color turned dark brownish-grey with rapid surge in last 30 minutes.",
    time: "8 mins ago",
    lat: 28.1750,
    lng: 85.4600,
    hasVoice: true,
    aiClassification: "HIGH HAZARD: Turbid flash surge detected",
    corridorId: "langtang",
  },
  {
    id: "rep-202",
    senderName: "Chhiring Lodge",
    type: "crack",
    note: "Upper trail fissure opened ~15cm wide near Chhona landslide bluff.",
    time: "35 mins ago",
    lat: 28.2140,
    lng: 85.4950,
    hasVoice: false,
    aiClassification: "MODERATE HAZARD: Ground creep indicator",
    corridorId: "langtang",
  },
];

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    try {
      return (localStorage.getItem("himalsanket_user_role") as UserRole) || "admin";
    } catch (_) {
      return "admin";
    }
  });

  const [distressBeacons, setDistressBeacons] = useState<DistressBeacon[]>(() => {
    try {
      const stored = localStorage.getItem("himalsanket_distress_beacons");
      if (stored) {
        const parsed: DistressBeacon[] = JSON.parse(stored);
        if (parsed.length > 12) {
          localStorage.setItem("himalsanket_distress_beacons", JSON.stringify(INITIAL_DISTRESS_BEACONS));
          return INITIAL_DISTRESS_BEACONS;
        }
        return parsed;
      }
      return INITIAL_DISTRESS_BEACONS;
    } catch (_) {
      return INITIAL_DISTRESS_BEACONS;
    }
  });

  const [dispatchedTeams, setDispatchedTeams] = useState<DispatchedRescueTeam[]>(() => {
    try {
      const stored = localStorage.getItem("himalsanket_dispatched_teams");
      if (stored) {
        const parsed: DispatchedRescueTeam[] = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      }
      return INITIAL_DISPATCHED_TEAMS;
    } catch (_) {
      return INITIAL_DISPATCHED_TEAMS;
    }
  });

  const [fieldDispatches, setFieldDispatches] = useState<FieldDispatch[]>(() => {
    try {
      const stored = localStorage.getItem("himalsanket_field_dispatches");
      return stored ? JSON.parse(stored) : INITIAL_FIELD_DISPATCHES;
    } catch (_) {
      return INITIAL_FIELD_DISPATCHES;
    }
  });

  const [systemAdvisories, setSystemAdvisories] = useState<SystemAdvisory[]>(() => {
    try {
      const stored = localStorage.getItem("himalsanket_system_advisories");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_user_role", currentRole);
    } catch (_) {}
  }, [currentRole]);

  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_distress_beacons", JSON.stringify(distressBeacons));
    } catch (_) {}
  }, [distressBeacons]);

  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_dispatched_teams", JSON.stringify(dispatchedTeams));
    } catch (_) {}
  }, [dispatchedTeams]);

  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_field_dispatches", JSON.stringify(fieldDispatches));
    } catch (_) {}
  }, [fieldDispatches]);

  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_system_advisories", JSON.stringify(systemAdvisories));
    } catch (_) {}
  }, [systemAdvisories]);

  // LIVE MOVEMENT SIMULATION ENGINE (Ticks every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setDispatchedTeams((prevTeams) => {
        if (!prevTeams || prevTeams.length === 0) return prevTeams;

        let hasMoved = false;
        const updated = prevTeams.map((team) => {
          if (team.status === "arrived" || team.status === "evacuating") {
            return team;
          }

          hasMoved = true;
          // Step progress: advance smoothly (total duration ~70-90s)
          const duration = team.totalDurationSeconds || 75;
          const step = 1 / duration;
          const nextProgress = Math.min(1.0, team.progress + step);

          // Interpolated coordinate
          const lat = team.startPosition.lat + (team.targetPosition.lat - team.startPosition.lat) * nextProgress;
          const lng = team.startPosition.lng + (team.targetPosition.lng - team.startPosition.lng) * nextProgress;

          // Distance remaining in meters
          const distRemaining = Math.round(
            getDistanceMeters(lat, lng, team.targetPosition.lat, team.targetPosition.lng)
          );

          // Dynamic ETA seconds: realistic flight ETA representation (proportional to distance remaining)
          const nextEta = Math.max(0, Math.round((1 - nextProgress) * (duration * 6.5)));

          let nextStatus: DispatchedRescueTeam["status"] = team.status;
          if (nextProgress >= 1.0 || distRemaining <= 40) {
            nextStatus = "arrived";
          } else if (nextProgress >= 0.85 || distRemaining < 450) {
            nextStatus = "approaching";
          } else {
            nextStatus = "en_route";
          }

          return {
            ...team,
            progress: nextProgress,
            currentPosition: { lat, lng },
            distanceRemainingMeters: distRemaining,
            etaSeconds: nextEta,
            status: nextStatus,
            trail: [...team.trail.slice(-30), { lat, lng }],
          };
        });

        return hasMoved ? updated : prevTeams;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
  }, []);

  const broadcastSOS = useCallback(
    (beaconData: Omit<DistressBeacon, "id" | "time" | "status">): DistressBeacon => {
      const userProfile = PRESET_PROFILES.civilian;
      const newBeacon: DistressBeacon = {
        ...beaconData,
        id: `sos-${Date.now()}`,
        time: "Just now",
        status: "pending",
        civilianId: userProfile.id,
      };
      setDistressBeacons((prev) => {
        if (
          prev.length > 0 &&
          Math.abs(prev[0].lat - newBeacon.lat) < 0.0001 &&
          Math.abs(prev[0].lng - newBeacon.lng) < 0.0001
        ) {
          return [newBeacon, ...prev.slice(1)];
        }
        return [newBeacon, ...prev];
      });
      return newBeacon;
    },
    []
  );

  const updateBeaconStatus = useCallback(
    (id: string | number, status: DistressBeacon["status"], assignedUnit?: string) => {
      setDistressBeacons((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status, assignedUnit: assignedUnit || b.assignedUnit } : b))
      );
    },
    []
  );

  const dispatchRescueTeam = useCallback(
    (beaconId: string | number, customTeamName?: string, customAgency?: string): DispatchedRescueTeam | null => {
      const beacon = distressBeacons.find((b) => b.id === beaconId);
      if (!beacon) return null;

      const corridorBases =
        CORRIDOR_RESCUE_BASES[beacon.corridorId || "langtang"] ||
        CORRIDOR_RESCUE_BASES.langtang ||
        [];

      let base = corridorBases[0] || {
        name: "Mountain SAR Forward Command Base",
        agency: "APF",
        lat: beacon.lat - 0.025,
        lng: beacon.lng - 0.035,
        contact: "VHF Ch 16 (156.800 MHz)",
      };

      if (corridorBases.length > 1) {
        let minD = Infinity;
        for (const b of corridorBases) {
          const d = getDistanceMeters(b.lat, b.lng, beacon.lat, beacon.lng);
          if (d < minD) {
            minD = d;
            base = b;
          }
        }
      }

      const dist = getDistanceMeters(base.lat, base.lng, beacon.lat, beacon.lng);
      const agency = customAgency || base.agency || "APF";
      const isArmy = agency.includes("Army");
      const teamName =
        customTeamName ||
        (isArmy ? "Nepal Army High-Altitude Air SAR Wing" : "APF Himalayan Quick Response Squad 1");

      const callSign = `SAR-${agency.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 8 + 1)}`;
      const totalDur = 75; // 75 seconds for realistic, visually dynamic flight

      const newTeam: DispatchedRescueTeam = {
        id: `team-${Date.now()}`,
        name: teamName,
        agency,
        vehicleType: "helicopter",
        callSign,
        targetBeaconId: beacon.id,
        targetCivilianName: beacon.name,
        civilianId: beacon.civilianId || (currentRole === "civilian" ? PRESET_PROFILES.civilian.id : undefined),
        startBaseName: base.name,
        startPosition: { lat: base.lat, lng: base.lng },
        targetPosition: { lat: beacon.lat, lng: beacon.lng },
        currentPosition: { lat: base.lat, lng: base.lng },
        progress: 0.0,
        speedKmH: 180,
        etaSeconds: Math.max(120, Math.round(dist / 35)),
        totalDurationSeconds: totalDur,
        distanceRemainingMeters: dist,
        status: "dispatched",
        dispatchedAt: "Just now",
        contact: base.contact || "VHF Ch 16 (156.800 MHz)",
        corridorId: beacon.corridorId || "langtang",
        trail: [{ lat: base.lat, lng: base.lng }],
      };

      // Mark the beacon as dispatched
      updateBeaconStatus(beacon.id, "dispatched", newTeam.name);

      setDispatchedTeams((prev) => {
        const remaining = prev.filter((t) => t.targetBeaconId !== beacon.id);
        return [newTeam, ...remaining];
      });

      return newTeam;
    },
    [distressBeacons, updateBeaconStatus, currentRole]
  );

  const cancelRescueTeam = useCallback((teamId: string) => {
    setDispatchedTeams((prev) => prev.filter((t) => t.id !== teamId));
  }, []);

  const resetRescueTeams = useCallback(() => {
    setDispatchedTeams(INITIAL_DISPATCHED_TEAMS);
    try {
      localStorage.setItem("himalsanket_dispatched_teams", JSON.stringify(INITIAL_DISPATCHED_TEAMS));
    } catch (_) {}
  }, []);

  const submitFieldDispatch = useCallback(
    (dispatchData: Omit<FieldDispatch, "id" | "time">): FieldDispatch => {
      const newDispatch: FieldDispatch = {
        ...dispatchData,
        id: `rep-${Date.now()}`,
        time: "Just now",
      };
      setFieldDispatches((prev) => [newDispatch, ...prev]);
      return newDispatch;
    },
    []
  );

  const broadcastAdvisory = useCallback(
    (advisoryData: Omit<SystemAdvisory, "id" | "issuedAt">): SystemAdvisory => {
      const newAdvisory: SystemAdvisory = {
        ...advisoryData,
        id: `adv-${Date.now()}`,
        issuedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSystemAdvisories((prev) => [newAdvisory, ...prev]);
      return newAdvisory;
    },
    []
  );

  const clearResolvedBeacons = useCallback(() => {
    setDistressBeacons((prev) => prev.filter((b) => b.status !== "rescued"));
  }, []);

  const resetBeaconsToDefault = useCallback(() => {
    setDistressBeacons(INITIAL_DISTRESS_BEACONS);
    setDispatchedTeams(INITIAL_DISPATCHED_TEAMS);
    try {
      localStorage.setItem("himalsanket_distress_beacons", JSON.stringify(INITIAL_DISTRESS_BEACONS));
      localStorage.setItem("himalsanket_dispatched_teams", JSON.stringify(INITIAL_DISPATCHED_TEAMS));
    } catch (_) {}
  }, []);

  const userProfile = PRESET_PROFILES[currentRole];

  return (
    <UserRoleContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        userProfile,
        distressBeacons,
        fieldDispatches,
        systemAdvisories,
        dispatchedTeams,
        broadcastSOS,
        updateBeaconStatus,
        dispatchRescueTeam,
        cancelRescueTeam,
        resetRescueTeams,
        submitFieldDispatch,
        broadcastAdvisory,
        clearResolvedBeacons,
        resetBeaconsToDefault,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
