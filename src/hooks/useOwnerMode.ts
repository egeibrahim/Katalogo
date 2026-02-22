import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "owner_mode";

function readOwnerMode(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOwnerMode(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
}

export function useOwnerMode() {
  const [ownerMode, setOwnerMode] = useState(false);

  useEffect(() => {
    setOwnerMode(readOwnerMode());
  }, []);

  const api = useMemo(
    () => ({
      ownerMode,
      enableOwnerMode: () => {
        writeOwnerMode(true);
        setOwnerMode(true);
      },
      disableOwnerMode: () => {
        writeOwnerMode(false);
        setOwnerMode(false);
      },
      toggleOwnerMode: () => {
        setOwnerMode((prev) => {
          const next = !prev;
          writeOwnerMode(next);
          return next;
        });
      },
    }),
    [ownerMode]
  );

  return api;
}
