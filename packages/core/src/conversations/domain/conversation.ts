export const CHANNELS = ['telegram', 'web'] as const;

export type Channel = (typeof CHANNELS)[number];

export type Conversation = { readonly id: string; readonly userId: string; readonly channel: Channel };
