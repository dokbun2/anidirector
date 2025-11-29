
import { Type } from "@google/genai";

export enum AppStep {
  SETUP_STORY = 0,
  ASSIGN_CHARACTERS = 1,
  STORYBOARD = 2
}

export type ViewMode = 'wizard' | 'projects' | 'storyboards';

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null; // Base64
}

export type AspectRatio = '16:9' | '4:3' | '9:16';

export interface StoryConfig {
  title: string;
  // Essential Variables from the Prompt Template
  mainCharacterName: string;   // 주인공 이름 (Text)
  mainCharacterDescription: string; // 주인공 외모 묘사 (Text)
  mainCharacterId?: string | null; // 주인공 ID (Linked after Assignment)
  
  // New: List of other characters (Sidekicks, Villains, Humans)
  additionalCharacters: {
    id?: string; // assigned after casting
    name: string;
    description: string;
  }[];

  targetToSave: string;       // 구해야 할 대상 이름
  targetToSaveDescription: string; // 구해야 할 대상 외모 묘사
  dangerThreat: string;       // 위험 요소 (다가오는 것)
  dangerTool: string;         // 위험 요소 (막는/움직이는 도구)
  dangerLocation: string;     // 위험이 발생하는 장소
  backgroundSetting: string;  // 배경/환경
  
  // Deprecated but kept for compatibility, can be moved to additionalCharacters
  humanCharacter: string;     // 인간 캐릭터/관찰자
  
  aspectRatio: AspectRatio;
}

export interface Scene {
  id: number;
  // Template is fixed to 60s total, structured frames
  startTimeSeconds: number; 
  endTimeSeconds: number;
  duration: number;
  act: string; // 1막, 2막, 3막
  visualDescription: string; // Detailed visual description
  videoPrompt: string;       // Technical prompt
  cameraAngle: string;       // Wide, POV, Close-up etc.
  charactersInvolved: string[]; // Names of characters in this scene
  generatedImageUrl?: string; 
  isGeneratingImage?: boolean;
  storyboardImageUrl?: string;
  isGeneratingStoryboard?: boolean;
}

export interface StoryboardData {
  scenes: Scene[];
  overallVibe: string;
}

export interface User {
  username: string;
  password?: string;
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string;
  characters: Character[]; 
  storyConfig: StoryConfig;
  storyboardData: StoryboardData | null;
  step: AppStep;
}

// Schema for Gemini JSON output matching the 20-frame structure
export const StoryboardSchema = {
  type: Type.OBJECT,
  properties: {
    overallVibe: { type: Type.STRING, description: "A summary of the visual style (Pixar-style 3D animation)." },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          act: { type: Type.STRING, description: "Act 1, Act 2, or Act 3" },
          duration: { type: Type.INTEGER, description: "Duration in seconds (approx 2-3s)" },
          visualDescription: { type: Type.STRING, description: "Detailed narrative description of the scene (Korean)." },
          videoPrompt: { type: Type.STRING, description: "Technical prompt for video generation (English, 3D Animation style). Must include visual details of characters appearing in this scene." },
          cameraAngle: { type: Type.STRING, description: "Camera shot type (Wide, POV, Close-up, etc.)" },
          charactersInvolved: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of character NAMES appearing in this scene." }
        },
        required: ["id", "act", "duration", "visualDescription", "videoPrompt", "cameraAngle", "charactersInvolved"]
      }
    }
  },
  required: ["scenes", "overallVibe"]
};
