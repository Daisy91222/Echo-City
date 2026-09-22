import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../identity/firebase";
import type { Pet } from "./types";

export function usePet(petId: string | undefined) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!petId) {
      setPet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `pets/${petId}`), (snap) => {
      setPet(snap.exists() ? (snap.val() as Pet) : null);
      setLoading(false);
    });
  }, [petId]);

  return { pet, loading };
}
