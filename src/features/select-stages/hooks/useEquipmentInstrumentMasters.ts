import { useCallback, useRef, useState } from "react";
import { getEquipments, getInstruments } from "../../master-data/api/equipmentInstrument.api";
import type { EquipmentRow, InstrumentRow } from "../../master-data/api/masterData.types";
import { isMasterDataError } from "../../master-data/api/masterData.errors";

/**
 * Restricts the equipment master list to rows belonging to the current
 * Select-Stage stage. Equipment master rows carry the stage they belong to
 * in `stage` (e.g. "granulation") - this is the one place that field is
 * read for filtering, so no dropdown component needs its own copy of this
 * logic.
 */
export function filterEquipmentForStage(rows: EquipmentRow[], stageKey: string): EquipmentRow[] {
  return rows.filter((row) => row.stage === stageKey);
}

/**
 * Restricts the instrument master list to rows belonging to the current
 * Select-Stage stage. Instruments record their stage in `location`
 * (e.g. "granulation"), NOT `stage` - `stage` on an instrument row is a
 * free-text display field (e.g. "Dispensing area-1"), never the filter key.
 */
export function filterInstrumentsForStage(rows: InstrumentRow[], stageKey: string): InstrumentRow[] {
  return rows.filter((row) => row.location === stageKey);
}

export interface EquipmentInstrumentMastersController {
  equipment: EquipmentRow[];
  instruments: InstrumentRow[];
  isLoading: boolean;
  error: string | null;
  /** Loads both master lists once and caches them; safe to call repeatedly. */
  ensureLoaded: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Fetches the Equipment and Instrument master lists once and shares them
 * across every stage's Equipment & Instrument step - reused so switching
 * between stages (or between the parameter and equipment screens) never
 * re-fetches the same master data.
 */
export function useEquipmentInstrumentMasters(): EquipmentInstrumentMastersController {
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setIsLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const [equipmentRows, instrumentRows] = await Promise.all([
          getEquipments(),
          getInstruments(),
        ]);
        setEquipment(equipmentRows);
        setInstruments(instrumentRows);
        loadedRef.current = true;
      } catch (err) {
        const message = isMasterDataError(err)
          ? err.message
          : "Unable to load equipment and instrument master data.";
        setError(message);
        loadedRef.current = false;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) {
      return;
    }
    await load();
  }, [load]);

  return {
    equipment,
    instruments,
    isLoading,
    error,
    ensureLoaded,
    reload: load,
  };
}
