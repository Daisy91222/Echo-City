import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../identity/firebase";
import type { WorldEvent, WorldEventParticipation } from "./types";

export function useWorldEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<WorldEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `world_events/${eventId}`), (snap) => {
      setEvent(snap.exists() ? (snap.val() as WorldEvent) : null);
      setLoading(false);
    });
  }, [eventId]);

  return { event, loading };
}

export function useMyParticipation(
  eventId: string | undefined,
  participantId: string | undefined
) {
  const [participation, setParticipation] = useState<WorldEventParticipation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !participantId) {
      setParticipation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(
      ref(db, `world_event_participation/${eventId}/${participantId}`),
      (snap) => {
        setParticipation(snap.exists() ? (snap.val() as WorldEventParticipation) : null);
        setLoading(false);
      }
    );
  }, [eventId, participantId]);

  return { participation, loading };
}

// 结算页用：读全场参与记录算排行榜。规则里 world_event_participation/$event_id
// 对所有登录用户只读开放，所以每个客户端都能独立算出同一份排名（见 settlement.ts 注释）。
export function useAllParticipants(eventId: string | undefined) {
  const [participants, setParticipants] = useState<Record<string, WorldEventParticipation>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setParticipants({});
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `world_event_participation/${eventId}`), (snap) => {
      setParticipants(snap.exists() ? (snap.val() as Record<string, WorldEventParticipation>) : {});
      setLoading(false);
    });
  }, [eventId]);

  return { participants, loading };
}
