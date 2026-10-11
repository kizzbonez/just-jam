"use client";

import { useCallback, useEffect, useState } from "react";
import { listDevices, type DeviceList } from "@/features/studio/engine/client/capture";

const EMPTY: DeviceList = { inputs: [], outputs: [], labelled: false };

/** The audio interfaces the browser can see, kept current as they come and go. */
export function useDevices(): { devices: DeviceList; refresh: () => void } {
  const [devices, setDevices] = useState<DeviceList>(EMPTY);

  const refresh = useCallback(() => {
    listDevices()
      .then(setDevices)
      .catch(() => setDevices(EMPTY));
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [refresh]);

  return { devices, refresh };
}
