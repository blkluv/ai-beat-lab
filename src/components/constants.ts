export const JERSEY_CLUB_PRESETS = {
    classic: { 
        label: 'Classic Jersey', 
        bpm: 132,
        description: 'Original East Coast bounce rhythm'
    },
    modern: { 
        label: 'Modern Club', 
        bpm: 138,
        description: 'Contemporary faster variations'
    },
    chopped: { 
        label: 'Chopped Screwed', 
        bpm: 66, // Half-time feel
        description: 'Slowed-down chopped versions'
    },
    hyper: { 
        label: 'Hyper Jersey', 
        bpm: 150,
        description: 'High-energy fusion style'
    }
} as const;

export function getMastraFetchUrl() {
    if (process.env.NODE_ENV === 'production') {
        return 'https://dj.jersey.fm';
    } else {
        return 'http://localhost:4111';
    }
}
