export type PromoScene = {
  id: string;
  durationSec: number;
  visual: {
    type: 'screenshot' | 'logo' | 'text' | 'broll';
    source?: string;
    notes: string;
  };
  onScreenText?: string[];
  voiceOver: string;
  sfx?: string[];
};

export type PromoScript = {
  title: string;
  totalDurationSec: number;
  format: '9:16' | '16:9' | '1:1';
  musicDirection: string;
  brandNotes: string;
  scenes: PromoScene[];
  endCard: {
    onScreenText: string[];
    voiceOver: string;
  };
};

export const advancedCreditEducationPromoScript: PromoScript = {
  title: 'Advanced Credit Education (ACE) — Program Promo',
  totalDurationSec: 60,
  format: '9:16',
  musicDirection:
    'Modern, confident, clean (no hype). 92–104 BPM. Light percussion + warm synth bed. Lower volume under VO.',
  brandNotes:
    'Use Western Credit Institute logo as an opening/closing bug. Keep colors consistent with the app UI: deep navy, teal/green accents, white text. Use subtle parallax on screenshots and quick punch-in zooms for energy.',
  scenes: [
    {
      id: 'S1',
      durationSec: 4,
      visual: {
        type: 'logo',
        source: 'Use company logo from attachments (centered), subtle animated reveal.',
        notes:
          'Background: dark navy gradient with soft glass circles (match app aesthetic).',
      },
      onScreenText: ['Western Credit Institute', 'Advanced Credit Education (ACE)'],
      voiceOver:
        "Welcome to Western Credit Institute’s Advanced Credit Education program — built to help you understand credit and take action with confidence.",
      sfx: ['Soft whoosh on logo reveal'],
    },
    {
      id: 'S2',
      durationSec: 6,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: Home dashboard (shows Advanced Credit Education + tiles: My Courses, Wallet, Refer & Earn, Support).',
        notes:
          'Slow vertical pan + slight zoom. Add highlight ring around “My Courses” tile.',
      },
      onScreenText: ['Everything in one place', 'Courses • Tools • Support'],
      voiceOver:
        'Your learning, your tools, and your progress — all in one simple app experience.',
      sfx: ['Tap/click micro sounds as tiles highlight'],
    },
    {
      id: 'S3',
      durationSec: 7,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: Course detail screen — “Advanced Credit Repair (ACE-1)” with weeks, lessons, and progress bar.',
        notes:
          'Punch-in on title, then drift to “Your Progress”.',
      },
      onScreenText: ['Structured learning', 'Clear progress tracking'],
      voiceOver:
        'ACE is structured, step-by-step education with clear progress tracking so you always know what’s next.',
    },
    {
      id: 'S4',
      durationSec: 7,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: “Credit Repair Tools” grid (AI Credit Repair Agent, Dispute Tracker, Lawsuit Assistant, Interactive Coach).',
        notes:
          'Animate a subtle glow around each tile as it’s mentioned.',
      },
      onScreenText: ['AI-powered tools', 'Built into your learning'],
      voiceOver:
        'And when you’re ready to take action, ACE includes AI-powered tools that turn knowledge into momentum.',
      sfx: ['Four quick UI pops as tiles highlight'],
    },
    {
      id: 'S5',
      durationSec: 9,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: AI Dispute Assistant — step flow (Upload → Select → Questions → Generate → Track).',
        notes:
          'Use animated callouts over each step number. Keep it fast and clear.',
      },
      onScreenText: ['AI Dispute Assistant', 'Upload • Answer • Generate • Track'],
      voiceOver:
        'Use the AI Dispute Assistant to upload your credit report, answer a few guided questions, generate dispute-ready outputs, and track progress in one place.',
    },
    {
      id: 'S6',
      durationSec: 7,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: Cloud Dispute Tracker screen (analytics cards + search + add button).',
        notes:
          'Zoom to analytics row, then to the + button.',
      },
      onScreenText: ['Cloud Dispute Tracker', 'Stay organized. Stay consistent.'],
      voiceOver:
        'Stay organized with the Cloud Dispute Tracker — see what’s pending, what’s working, and what to follow up on next.',
    },
    {
      id: 'S7',
      durationSec: 8,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: Lawsuit Assistant intro screen (Get Started button visible).',
        notes:
          'Keep disclaimer visible. Add a subtle underline animation on “educational purposes only”.',
      },
      onScreenText: ['Lawsuit Assistant', 'Educational guidance & organization'],
      voiceOver:
        'Need help organizing a credit reporting violation case? The Lawsuit Assistant walks you through the information to collect and how to stay prepared.',
    },
    {
      id: 'S8',
      durationSec: 6,
      visual: {
        type: 'screenshot',
        source:
          'Attachment: AI Credit Repair Coach screen (human video with “Chat now” button).',
        notes:
          'Animate a small pulse on “Chat now”.',
      },
      onScreenText: ['Interactive Coach', 'Get answers fast'],
      voiceOver:
        'And when you get stuck, the Interactive Coach helps you move forward with quick, guided support.',
    },
    {
      id: 'S9',
      durationSec: 6,
      visual: {
        type: 'text',
        notes:
          'Text-only moment over blurred app background. Use bold typography + generous spacing.',
      },
      onScreenText: [
        'Learn the system.',
        'Build a plan.',
        'Take action — with confidence.',
      ],
      voiceOver:
        'This is more than information — it’s a system: learn, plan, and take action with confidence.',
      sfx: ['Soft riser into the end card'],
    },
  ],
  endCard: {
    onScreenText: [
      'Advanced Credit Education (ACE)',
      'Western Credit Institute',
      'Start today',
    ],
    voiceOver:
      'Start your Advanced Credit Education journey today with Western Credit Institute.',
  },
};
