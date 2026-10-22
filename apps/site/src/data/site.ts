export const SITE = {
  name: 'HealthMate',
  title: 'HealthMate, your health history in one place',
  headline: 'Your health history, in one place.',
  description:
    'Symptoms, doctor visits, lab results and the changes you try, on one timeline that you control. Ask about any of it and see the entries behind every answer.',
  status: 'Coming soon',
  repoUrl: 'https://github.com/brian-rey-development/healthmate',
  author: 'Brian Rey',
  disclaimer: 'HealthMate is not a medical device and does not give medical advice.',
} as const;

export type Illustration = 'headache' | 'journal' | 'lab-report' | 'review' | 'laptop' | 'thermometer';

export type Feature = {
  readonly title: string;
  readonly body: string;
  readonly illustration: Illustration;
};

export const FEATURES: readonly Feature[] = [
  {
    title: 'Log symptoms as they happen',
    body: 'Send a text or a voice note in Telegram, or use a form on the web. HealthMate drafts the entry and asks only for what is missing.',
    illustration: 'headache',
  },
  {
    title: 'Before and after every visit',
    body: 'Write down your questions before an appointment and what the doctor said after. Take a short summary to the next one.',
    illustration: 'journal',
  },
  {
    title: 'Lab results, value by value',
    body: 'Upload a lab report, check each value against the page it came from, and follow it across reports.',
    illustration: 'lab-report',
  },
  {
    title: 'See what changed',
    body: 'Start a supplement or a new routine and compare before and after. HealthMate tells you when there is not enough data to say anything.',
    illustration: 'review',
  },
  {
    title: 'Ask about your history',
    body: 'Ask in plain language. Every answer links to the entries it came from, and nothing is saved without your confirmation.',
    illustration: 'laptop',
  },
  {
    title: 'Never a diagnosis',
    body: 'HealthMate does not diagnose or recommend treatment. It shows your data and leaves the decisions to you and your doctor.',
    illustration: 'thermometer',
  },
];
