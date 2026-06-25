
export interface VideoAsset {
  id: string;
  url: string;
  /** display name (filename or user label) */
  name: string;
  /** optional note */
  note?: string;
  thumbnail?: string;
  duration?: number;
  status: 'pending' | 'ready' | 'error';
  /** preserved from source clip; not required for this portfolio build */
  aspectRatio?: '16:9' | '9:16';
}

export interface AudioAsset {
  id: string;
  name: string;
  url: string;
  duration?: number;
}

export interface TimelineTrack {
  id: string;
  assetId: string;
  startTime?: number;
  endTime?: number;
}

export interface GenerationProgress {
  message: string;
  status: 'idle' | 'generating' | 'polling' | 'fetching';
}
