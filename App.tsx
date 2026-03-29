import React, { useState, useEffect } from 'react';
import { AppView, Event, Participant } from './types';
import { getEventByCode, getEventById, joinEvent, createEvent, getParticipantByToken } from './services/eventService';
import LandingScreen from './components/LandingScreen';
import JoinScreen from './components/JoinScreen';
import GuestView from './components/GuestView';
import DJView from './components/DJView';
import VenueScreen from './components/VenueScreen';

const SESSION_KEY = 'djjpp_session';

interface SavedSession {
  view: AppView;
  deviceToken: string | null;
  eventId: string | null;
  djEventCode: string | null;
}

function saveSession(view: AppView, participant: Participant | null, event: Event | null, isDJ: boolean) {
  const session: SavedSession = {
    view,
    deviceToken: participant?.device_token || null,
    eventId: event?.id || null,
    djEventCode: isDJ ? event?.event_code || null : null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const session = loadSession();
      if (!session || session.view === 'landing' || session.view === 'join') {
        setRestoring(false);
        return;
      }

      try {
        if (session.view === 'guest' && session.deviceToken) {
          const p = await getParticipantByToken(session.deviceToken);
          if (p) {
            const ev = await getEventById(p.event_id);
            if (ev && ev.status !== 'ended') {
              setParticipant(p);
              setEvent(ev);
              setView('guest');
              setRestoring(false);
              return;
            }
          }
        }

        if (session.view === 'dj' && session.eventId) {
          const ev = await getEventById(session.eventId);
          if (ev) {
            setEvent(ev);
            setView('dj');
            setRestoring(false);
            return;
          }
        }

        if (session.view === 'venue') {
          setView('venue');
          setRestoring(false);
          return;
        }
      } catch {
        // Restore failed, go to landing
      }

      clearSession();
      setRestoring(false);
    })();
  }, []);

  const handleJoin = async (eventCode: string, nickname: string) => {
    setJoinError(null);
    setJoinLoading(true);
    try {
      const ev = await getEventByCode(eventCode);
      if (!ev) {
        setJoinError('Event not found. Check your code and try again.');
        return;
      }
      if (ev.status === 'ended') {
        setJoinError('This event has already ended.');
        return;
      }
      const p = await joinEvent(ev.id, nickname);
      setEvent(ev);
      setParticipant(p);
      setView('guest');
      saveSession('guest', p, ev, false);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join event');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDJLogin = async (eventCode: string) => {
    try {
      if (eventCode) {
        const ev = await getEventByCode(eventCode);
        if (ev) {
          setEvent(ev);
          setView('dj');
          saveSession('dj', null, ev, true);
        }
      } else {
        const { event: newEvent } = await createEvent('DJ Night', 'My Venue');
        setEvent(newEvent);
        setView('dj');
        saveSession('dj', null, newEvent, true);
      }
    } catch (err: any) {
      console.error('DJ login error:', err);
    }
  };

  const handleEventUpdate = (updatedEvent: Event) => {
    setEvent(updatedEvent);
    saveSession('dj', null, updatedEvent, true);
  };

  const handleNavigate = (v: AppView) => {
    setView(v);
    if (v === 'venue') saveSession('venue', null, null, false);
  };

  const handleBack = () => {
    setView('landing');
    clearSession();
  };

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="text-center">
          <div className="text-4xl mb-4">🎵</div>
          <p className="text-gray-400">Reconnecting...</p>
        </div>
      </div>
    );
  }

  switch (view) {
    case 'landing':
      return <LandingScreen onNavigate={handleNavigate} onDJLogin={handleDJLogin} />;
    case 'join':
      return (
        <JoinScreen
          onJoin={handleJoin}
          onBack={handleBack}
          error={joinError}
          loading={joinLoading}
        />
      );
    case 'guest':
      if (!event || !participant) return null;
      return <GuestView event={event} participant={participant} />;
    case 'dj':
      if (!event) return null;
      return <DJView event={event} onEventUpdate={handleEventUpdate} />;
    case 'venue':
      return <VenueScreen onBack={handleBack} />;
    default:
      return <LandingScreen onNavigate={handleNavigate} onDJLogin={handleDJLogin} />;
  }
}
