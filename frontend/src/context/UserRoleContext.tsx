import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  broadcastSOS: (beacon: Omit<DistressBeacon, "id" | "time" | "status">) => DistressBeacon;
  updateBeaconStatus: (id: string | number, status: DistressBeacon["status"], assignedUnit?: string) => void;
  submitFieldDispatch: (dispatch: Omit<FieldDispatch, "id" | "time">) => FieldDispatch;
  broadcastAdvisory: (advisory: Omit<SystemAdvisory, "id" | "issuedAt">) => SystemAdvisory;
  clearResolvedBeacons: () => void;
  resetBeaconsToDefault: () => void;
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
    assignedUnit: "APF Mountain Rescue Squad 2",
    contact: "+977 9801-445522 (Guide Lakpa)",
    corridorId: "langtang",
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
        // If parsed contains messy spammed items (> 6 items or repeated identical coordinates), reset cleanly
        const duplicateSpam = parsed.filter(b => b.name?.includes("Trekker SOS") || !b.id).length;
        if (duplicateSpam > 2 || parsed.length > 8) {
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

  // Persist state to simulate real-time Firebase syncing
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
      localStorage.setItem("himalsanket_field_dispatches", JSON.stringify(fieldDispatches));
    } catch (_) {}
  }, [fieldDispatches]);

  useEffect(() => {
    try {
      localStorage.setItem("himalsanket_system_advisories", JSON.stringify(systemAdvisories));
    } catch (_) {}
  }, [systemAdvisories]);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
  }, []);

  const broadcastSOS = useCallback(
    (beaconData: Omit<DistressBeacon, "id" | "time" | "status">): DistressBeacon => {
      const newBeacon: DistressBeacon = {
        ...beaconData,
        id: `sos-${Date.now()}`,
        time: "Just now",
        status: "pending",
      };
      setDistressBeacons((prev) => {
        // Prevent duplicate spam within close vicinity
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
    try {
      localStorage.setItem("himalsanket_distress_beacons", JSON.stringify(INITIAL_DISTRESS_BEACONS));
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
        broadcastSOS,
        updateBeaconStatus,
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
