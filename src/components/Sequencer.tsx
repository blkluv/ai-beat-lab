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
    const url = `<span class="math-inline">\{window\.location\.origin\}</span>{window.location.pathname}?beat=${encoded}`;

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
        }),
      })

      const data = await result.json();

      const pianoSequence = {
        "C5": data.object.C5 || [],
        "B4": data.object.B4 || [],
        "A4": data.object.A4 || [],
        "G4": data.object.G4 || [],
        "F4": data.object.F4 || [],
        "E4": data.object.E4 || [],
        "D4": data.object.D4 || [],
        "C4": data.object.C4 || [],
        'B3': data.object.B3 || [],
        'A3': data.object.A3 || [],
        'G3': data.object.G3 || [],
      };

      const drumSequence = {
        "Kick": data.object.Kick || [],
        "Snare": data.object.Snare || [],
        "HiHat": data.object?.['HiHat'] || [],
        "Clap": data.object.Clap || [],
        "OpenHat": data.object['OpenHat'] || [],
        "Tom": data.object.Tom || [],
        "Crash": data.object.Crash || [],
        "Ride": data.object.Ride || [],
        "Shaker": data.object.Shaker || [],
        "Cowbell": data.object.Cowbell || [],
      };

      setDrumSequence(drumSequence);
      setPianoSequence(pianoSequence);
      stopSequence();
    } catch (error) {
      console.error('Error generating sequence:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playSequence = () => {
    const ctx = getAudioContext();
    ctx.resume();

    setIsPlaying(true);
    setCurrentStep(0);

    const stepDuration = (60 / JERSEY_CLUB_PRESETS[tempo].bpm) * 1000 / 4; // Use Jersey Club tempo


    sequencerInterval.current = window.setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % STEPS;

        Object.entries(pianoSequence).forEach(([note, steps]) => {
          if (steps.includes(prev)) {
            playNoteByName(note);
          }
        });

        Object.entries(drumSequence).forEach(([sound, steps]) => {
          if (steps.includes(prev)) {
            playDrumSound(sound);
          }
        });

        return nextStep;
      });
    }, stepDuration);
  };

  const stopSequence = () => {
    if (sequencerInterval.current) {
      clearInterval(sequencerInterval.current);
      sequencerInterval.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const isMobile = useIsMobile();

  return (
    <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-4 md:p-8 shadow-xl animate-slide-in w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Music2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI Beat Laboratory
            </h1>
            <p className="text-xs md:text-sm text-primary/70">Where AI drops beats and humans drop jaws</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={tempo}
            onValueChange={(value: keyof typeof JERSEY_CLUB_PRESETS) => {
              setTempo(value);
              if (isPlaying) {
                stopSequence();
                playSequence();
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select tempo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(JERSEY_CLUB_PRESETS).map(([key, { label, bpm }]) => (
                <SelectItem key={key} value={key}>
                  {label} ({bpm} BPM)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExportMidi({ toast, tempo, pianoSequence, drumSequence })}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-primary/20"
            title="Export MIDI"
          >
            <Download className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-primary/20"
            title="Share beat"
          >
            <Share2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isPlaying ? stopSequence() : playSequence()}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-primary/20"
          >
            {isPlaying ?
              <Pause className="h-5 w-5 md:h-6 md:w-6 text-primary" /> :
              <Play className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            }
          </Button>
          {isPlaying && (
            <Button
              variant="ghost"
              size="icon"
              onClick={stopSequence}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-primary/20"
            >
              <Square className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </Button>
          )}
        </div>
      </div>
