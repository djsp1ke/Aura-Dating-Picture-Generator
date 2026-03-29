import React, { useState } from 'react';
import { AppView, Event, Participant } from './types';
import { getEventByCode, joinEvent, createEvent } from './services/eventService';
import LandingScreen from './components/LandingScreen';
import JoinScreen from './components/JoinScreen';
import GuestView from './components/GuestView';
import DJView from './components/DJView';
import VenueScreen from './components/VenueScreen';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

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
        }
      } else {
        const { event: newEvent } = await createEvent('DJ Night', 'My Venue');
        setEvent(newEvent);
        setView('dj');
      }
    } catch (err: any) {
      console.error('DJ login error:', err);
    }
  };

  const handleEventUpdate = (updatedEvent: Event) => {
    setEvent(updatedEvent);
  };

  switch (view) {
    case 'landing':
      return <LandingScreen onNavigate={setView} onDJLogin={handleDJLogin} />;
    case 'join':
      return (
        <JoinScreen
          onJoin={handleJoin}
          onBack={() => setView('landing')}
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
      return <VenueScreen onBack={() => setView('landing')} />;
    default:
      return <LandingScreen onNavigate={setView} onDJLogin={handleDJLogin} />;
  }
}
