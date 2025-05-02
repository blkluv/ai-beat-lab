import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Music2, Volume2, Settings2, Loader2, ChevronDown, ChevronUp, Share2, Download, Wand2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import ReactMarkdown from 'react-markdown';
import { playNoteByName, playDrumSound, loadDrumSamples, getAudioContext } from '@/lib/audio';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { JERSEY_CLUB_PRESETS } from './constants'; // Updated import
import { handleExportMidi } from './handleMidi';
import { handleGenerateVariation } from './handleVariation';

const STEPS = 16;
const PIANO_NOTES = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3'];
const DRUM_SOUNDS = ['Kick', 'Snare', 'HiHat', 'Clap', 'OpenHat', 'Tom', 'Crash', 'Ride', 'Shaker', 'Cowbell'];

function getMastraFetchUrl() {
  if (process.env.NODE_ENV === 'production') {
    return 'https://dj.jersey.fm';
  } else {
    return 'http://localhost:4111';
  }
}

export const Sequencer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [reference, setReference] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [tempo, setTempo] = useState<keyof typeof JERSEY_CLUB_PRESETS>('classic'); // Updated tempo presets
  const [pianoSequence, setPianoSequence] = useState<Record<string, number[]>>(
    Object.fromEntries(PIANO_NOTES.map(note => [note, []]))
  );
  const [drumSequence, setDrumSequence] = useState<Record<string, number[]>>(
    Object.fromEntries(DRUM_SOUNDS.map(sound => [sound, []]))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const sequencerInterval = useRef<number | null>(null);
  const [isReferenceExpanded, setIsReferenceExpanded] = useState(true);

  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();


  useEffect(() => {
    const initAudio = async () => {
      await loadDrumSamples();
      setIsAudioInitialized(true);
    };
    initAudio();

    return () => {
      if (sequencerInterval.current) {
        clearInterval(sequencerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadBeatFromUrl = () => {
      const beatData = searchParams.get('beat');
      if (beatData) {
        try {
          const decoded = JSON.parse(atob(beatData));
          setPianoSequence(decoded.piano);
          setDrumSequence(decoded.drum);
          setTempo(decoded.tempo || 'classic'); // Load tempo if available, default to 'classic'
          toast({
            title: "Beat loaded",
            description: "The shared beat has been loaded successfully.",
          });
        } catch (error) {
          console.error('Error loading beat from URL:', error);
          toast({
            title: "Error loading beat",
            description: "Could not load the shared beat. The link might be invalid.",
            variant: "destructive",
          });
        }
      }
    };

    loadBeatFromUrl();
  }, [searchParams, toast]);


  const handleShare = () => {
    const beatData = {
      piano: pianoSequence,
      drum: drumSequence,
      tempo: tempo,
    };

    const encoded = btoa(JSON.stringify(beatData));
    const url = `${window.location.origin}${window.location.pathname}?beat=${encoded}`;

    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Share this link with others to let them play your beat.",
      });
    }).catch(() => {
      toast({
        title: "Couldn't copy link",
        description: "Please try again or copy the URL manually.",
        variant: "destructive",
      });
    });
  };

  const togglePianoStep = (note: string, step: number) => {
    setPianoSequence(prev => ({
      ...prev,
      [note]: prev[note].includes(step)
        ? prev[note].filter(s => s !== step)
        : [...prev[note], step],
    }));
    playNoteByName(note);
  };

  const toggleDrumStep = (sound: string, step: number) => {
    setDrumSequence(prev => ({
      ...prev,
      [sound]: prev[sound].includes(step)
        ? prev[sound].filter(s => s !== step)
        : [...prev[sound], step],
    }));
    playDrumSound(sound);
  };

  const handleGenerateSequence = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    try {
      const ctx = getAudioContext();
      ctx.resume();

      const refAgent = getMastraFetchUrl() + '/api/agents/musicReferenceAgent/generate';
      const response = await window.fetch(refAgent, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [`Please analyze the users request "${prompt}"`],
        })
      });

      const d = await response.json();
      setReference(d.text);

      const uri = getMastraFetchUrl() + '/api/agents/musicAgent/generate';
      const result = await window.fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [`Please make me a Jersey Club beat based on this information: ${d.text}`], // Updated prompt
          output: {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "additionalProperties": false,
            "required": [
              "Kick",
              "Snare",
              "HiHat",
              "Clap",
              "OpenHat",
              "Tom",
              "Crash",
              "Ride",
              "Shaker",
              "Cowbell",
              "C5",
              "B4",
              "A4",
              "G4",
              "F4",
              "E4",
              "D4",
              "C4",
              "B3",
              "A3",
              "G3",
            ],
            "properties": {
              "C5": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "B4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "A4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "G4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "F4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "E4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "D4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "C4": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "B3": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "A3": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "G3": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Kick": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Snare": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "HiHat": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Clap": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "OpenHat": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Tom": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Crash": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Ride": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Shaker": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "Cowbell": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              }
            }
          }
        })
      });
      const generated = await result.json();
      setPianoSequence(generated);
      setDrumSequence(generated);
    } catch (error) {
      console.error('Error generating sequence:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    if (!isPlaying) {
      sequencerInterval.current = window.setInterval(() => {
        setCurrentStep(prev => (prev + 1) % STEPS);
      }, (60 / 120) * 1000); // Change 120 to whatever tempo you want
    } else {
      if (sequencerInterval.current) {
        clearInterval(sequencerInterval.current);
      }
    }
  };

  return (
    <div className="sequencer-container">
      <div className="controls">
        <Button onClick={togglePlay}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button onClick={handleGenerateSequence} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate Beat'}
        </Button>
      </div>
      <div className="sequencer-grid">
        {PIANO_NOTES.map((note, index) => (
          <div key={note}>
            <h3>{note}</h3>
            {Array.from({ length: STEPS }).map((_, stepIndex) => (
              <Button
                key={stepIndex}
                onClick={() => togglePianoStep(note, stepIndex)}
                variant={pianoSequence[note].includes(stepIndex) ? 'outline' : 'default'}
              />
            ))}
          </div>
        ))}
        {DRUM_SOUNDS.map((sound) => (
          <div key={sound}>
            <h3>{sound}</h3>
            {Array.from({ length: STEPS }).map((_, stepIndex) => (
              <Button
                key={stepIndex}
                onClick={() => toggleDrumStep(sound, stepIndex)}
                variant={drumSequence[sound].includes(stepIndex) ? 'outline' : 'default'}
              />
            ))}
          </div>
        ))}
      </div>
      {!isAudioInitialized && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-yellow-100/10 border border-yellow-400/20 rounded-lg text-yellow-200">
          Initializing audio...
        </div>
      )}
    </div>
  );
};

export default Sequencer;
