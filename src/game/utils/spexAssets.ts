// SPEX Character Visual Assets Map for Adventure Game and 3D Research Station
import { 
  SPEX_HERO_IMAGE, 
  SPEX_WAVING_HERO, 
  SPEX_AVATAR_GREETING, 
  SPEX_AVATAR_INVESTIGATOR,
  SPEXMood,
} from '../../spex/spexAssets';

export const SPEX_IMAGES = {
  normal: SPEX_HERO_IMAGE,
  proudSuccess: SPEX_HERO_IMAGE,
  explaining: SPEX_AVATAR_INVESTIGATOR,
  friendlyGreeting: SPEX_AVATAR_GREETING,
  thinking: SPEX_AVATAR_INVESTIGATOR,
  curious: SPEX_AVATAR_GREETING,
  eureka: SPEX_AVATAR_INVESTIGATOR,
  happy: SPEX_AVATAR_GREETING,
  confused: SPEX_AVATAR_INVESTIGATOR,
  error: SPEX_AVATAR_INVESTIGATOR,
  success: SPEX_HERO_IMAGE,
  waving: SPEX_WAVING_HERO,
};

export type SpexMoodKey = keyof typeof SPEX_IMAGES;
