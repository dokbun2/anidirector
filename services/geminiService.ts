
import { GoogleGenAI, Type } from "@google/genai";
import { Character, StoryConfig, StoryboardData, StoryboardSchema } from "../types";
import { getStoredApiKey } from "../components/ApiKeySetup";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getApiKey = (): string => {
  const key = getStoredApiKey();
  if (!key) {
    throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
  }
  return key;
};

// Schema for Auto-fill Idea
const StoryIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    mainCharacterName: { type: Type.STRING, description: "Name of the hero animal" },
    mainCharacterDescription: { type: Type.STRING, description: "Visual description (e.g., Fluffy white rabbit with blue eyes)" },
    targetToSave: { type: Type.STRING, description: "Name of the being to save (e.g., baby kitten, baby bird)" },
    targetToSaveDescription: { type: Type.STRING, description: "Visual description of the target to save (e.g., small white kitten with blue eyes)" },
    dangerThreat: { type: Type.STRING, description: "The incoming threat (e.g., train, truck, flood)" },
    dangerTool: { type: Type.STRING, description: "Object used to stop the threat (e.g., rock, branch)" },
    dangerLocation: { type: Type.STRING, description: "Where the danger happens (e.g., railway tracks)" },
    backgroundSetting: { type: Type.STRING, description: "Visual setting (e.g., sunset mountains)" },
    additionalCharacterName: { type: Type.STRING, description: "Name of a secondary character (human or animal)" },
    additionalCharacterDescription: { type: Type.STRING, description: "Description of the secondary character" },
  },
  required: ["title", "mainCharacterName", "mainCharacterDescription", "targetToSave", "targetToSaveDescription", "dangerThreat", "dangerTool", "dangerLocation", "backgroundSetting", "additionalCharacterName", "additionalCharacterDescription"]
};

export const generateStoryIdea = async (): Promise<Partial<StoryConfig>> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `
    당신은 3D 애니메이션(픽사 스타일) 시나리오 작가입니다.
    마음이 따뜻해지는 "구조 이야기" 설정을 하나 만들어주세요.
    
    구조: 작은 동물이 도구를 이용해 거대한 위협으로부터 무언가를 구하고, 처음에는 오해하던 다른 캐릭터(인간 등)가 진실을 깨닫는 이야기입니다.
    
    JSON 형식으로 반환하세요.
    - 언어: 한국어 (Key 값 제외)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: StoryIdeaSchema,
        systemInstruction: "당신은 창의적인 스토리 어시스턴트입니다.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 없습니다.");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Auto-fill error:", error);
    throw error;
  }
};

export const generateStoryboardPlan = async (
  storyConfig: StoryConfig
): Promise<StoryboardData> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  // Format character list for the prompt
  let charRoster = `1. 주인공: ${storyConfig.mainCharacterName} (${storyConfig.mainCharacterDescription})\n`;
  if (storyConfig.additionalCharacters && storyConfig.additionalCharacters.length > 0) {
      storyConfig.additionalCharacters.forEach((char, idx) => {
          charRoster += `${idx + 2}. 조연: ${char.name} (${char.description})\n`;
      });
  }
  // Include legacy human character if exists and not in array
  if (storyConfig.humanCharacter) {
       charRoster += `*. 기타 등장인물(인간): ${storyConfig.humanCharacter}\n`;
  }

  // Template Logic
  const prompt = `
    당신은 세계적인 3D 애니메이션 감독(Pixar/Dreamworks 스타일)입니다.
    사용자가 제공한 변수를 바탕으로, 정해진 '20프레임 감동 스토리 템플릿'을 완성해야 합니다.

    [등장인물 정보 - 매우 중요]
    ${charRoster}

    [스토리 설정]
    - 구해야 할 대상: ${storyConfig.targetToSave}
    - 위험 요소(다가오는 것): ${storyConfig.dangerThreat}
    - 위험 요소(막는/움직이는 도구): ${storyConfig.dangerTool}
    - 위험이 발생하는 장소: ${storyConfig.dangerLocation}
    - 배경/환경: ${storyConfig.backgroundSetting}

    [필수 지침]
    - 전체 길이: 60초 (정확히 20개 장면 생성).
    - 스타일: 고품질 3D 애니메이션, Fur texture, Octane Render, Unreal Engine 5 스타일.
    - charactersInvolved 필드에 해당 장면에 등장하는 캐릭터의 이름을 정확히 명시하세요 (예: ["토끼 티코", "기관사"]).
    - videoPrompt는 영어로 작성하며, 장면에 등장하는 캐릭터의 시각적 묘사를 반드시 포함해야 합니다. (예: "A fluffy white rabbit named Tico...")

    [템플릿 구조: 총 20 Scene]
    
    🟠 1막: 위기 발견 (Scene 1-6)
    1. [와이드] 배경/환경 속을 이동 수단/일상 요소가 지나가고, [주인공] 등장.
    2. [POV] [주인공]의 시점. 저 멀리 [위험이 발생하는 장소]에 [구해야 할 대상]의 실루엣이 보임.
    3. [클로즈업] [주인공]이 [위험 요소(도구)]를 움직이기 위해 힘쓰는 장면.
    4. [다이내믹] [위험 요소(도구)]가 [위험 요소(다가오는 것)] 앞에 나타나고, [조연/인간]이 급정거/대응함.
    5. [미디엄] [주인공]이 [조연/인간]을 향해 신호.
    6. [미디엄] [조연/인간]이 화난 표정으로 [주인공]에게 옴 (오해).

    🟡 2막: 추격과 반전 (Scene 7-12)
    7. [다이내믹] [주인공]이 도망가고, [조연/인간]이 뒤쫓음.
    8. [측면] 추격전 중 전환 포인트.
    9. [얼굴 클로즈업] [조연/인간]의 표정이 분노에서 놀람/충격으로 반전.
    10. [POV] [조연/인간]의 시점. [구해야 할 대상] 발견. 진실 공개.
    11. [클로즈업] [구해진 대상]의 상태 확인.
    12. [와이드] 위험했던 상황의 전체적 모습.

    🟢 3막: 화해와 감동 (Scene 13-20)
    13. [미디엄] [조연/인간]이 미안함과 고마움으로 [주인공]을 바라봄.
    14. [미디엄] [조연/인간]이 [주인공]에게 다가가 무릎을 꿇음.
    15. [클로즈업] 쓰다듬거나 포옹. 감동적인 순간.
    16. [클로즈업] [주인공]의 행복한 반응.
    17. [미디엄] [구해진 대상]을 안전한 곳으로 옮김.
    18. [미디엄] [주인공]과 [조연/인간]이 나란히 서서 바라봄.
    19. [미디엄] 평화로운 마무리 인사.
    20. [와이드] 해피엔딩 (노을/따뜻한 빛).

    [출력 포맷]
    JSON으로 출력하세요.
  `;

  const callApi = async (retryCount = 0): Promise<StoryboardData> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: StoryboardSchema,
          systemInstruction: "You are a specialized 3D Animation Storyboard Director.",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      
      const parsed = JSON.parse(text);
      
      // Post-process
      let currentTime = 0;
      parsed.scenes = parsed.scenes.map((s: any) => {
        const start = currentTime;
        const duration = s.duration || 3;
        const end = start + duration;
        currentTime = end;
        
        return {
          ...s,
          startTimeSeconds: start,
          endTimeSeconds: end
        };
      });

      return parsed as StoryboardData;
    } catch (error: any) {
       if (retryCount < 1 && (error.status === 429 || error.message?.includes("RESOURCE_EXHAUSTED"))) {
           await delay(2000);
           return callApi(retryCount + 1);
       }
       throw error;
    }
  };

  return await callApi();
};

export const generateCharacterDesign = async (name: string, description: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `
    Character Design Sheet for 3D Animation (Pixar Style).
    Name: ${name}
    Visual Description: ${description}
    
    Style: Pixar-style 3D animation render, Unreal Engine 5, cute (if animal), expressive, highly detailed texture.
    Composition: Character sheet, white background, multiple angles (front, side, 3/4 view) or a single high-quality hero pose.
    Lighting: Soft studio lighting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("이미지가 생성되지 않았습니다.");
  } catch (error: any) {
    console.error("Character generation error:", error);
    throw new Error(`캐릭터 생성 실패: ${error.message || '알 수 없는 오류'}`);
  }
};

export const generateSceneImage = async (
  fullPrompt: string, 
  modelName: string, 
  style: 'photorealistic' | 'sketch' | 'anime' | 'comic', 
  referenceImages: string[] = [], // Array of base64 strings
  characterDescriptions: string[] = [], // Array of text descriptions for involved characters
  aspectRatio: string = "16:9",
  isStoryboardMode: boolean = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const buildParts = (prompt: string) => {
    const p: any[] = [];
    // Limit reference images if too many (Gemini has limits)
    // We prioritize the first 3 images to cover main and sidekicks
    const refsToUse = referenceImages.slice(0, 3);
    
    for (const imgDataUrl of refsToUse) {
        const matches = imgDataUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            p.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
    }
    p.push({ text: prompt });
    return p;
  };

  // Override style for 3D Animation
  const stylePrompt = "3D Pixar-style animation, Unreal Engine 5 render, highly detailed fur texture (if animal), expressive characters, cinematic lighting, warm color palette, volumetric fog, Octane render.";
  
  // Construct character context prompt
  const charContext = characterDescriptions.length > 0 
      ? `\n\n[CHARACTERS IN SCENE]\n${characterDescriptions.map(d => `- ${d}`).join('\n')}\nMake sure these characters appear as described and match the provided reference images.`
      : "";

  let promptText = "";
  
  if (isStoryboardMode) {
      promptText = `
        **Role**: Professional 3D Animation Storyboard Artist.
        **Task**: Create a storyboard panel for a 3D animated short film.
        
        **INPUT PROMPT**:
        ${fullPrompt}

        ${charContext}

        **GUIDELINES**:
        1. **Style**: ${stylePrompt}
        2. **Layout**: Create 4 distinct panels in a grid showing the sequence of action.
        3. **Consistency**: Use the attached reference images for the Characters.
        4. **Technical**: Add 3D arrows for movement.
        5. **Aspect Ratio**: ${aspectRatio}
      `;
  } else {
      promptText = `
        **Style**: ${stylePrompt}
        **Scene Description**: ${fullPrompt}
        **Aspect Ratio**: ${aspectRatio}
        
        ${charContext}

        Make it look like a high-budget animated movie screenshot.
        ${referenceImages.length > 0 ? "CRITICAL: The characters MUST look like the attached reference images." : ""}
      `;
  }

  const parts = buildParts(promptText);

  try {
    const config: any = {
       aspectRatio: aspectRatio === '4:3' ? '4:3' : (aspectRatio === '16:9' ? '16:9' : (aspectRatio === '9:16' ? '9:16' : '1:1'))
    };
    
    if (modelName === 'gemini-3-pro-image-preview') {
        config.imageSize = '1K'; 
    }

    const response = await ai.models.generateContent({
      model: modelName, 
      contents: { parts },
      config: { imageConfig: config }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("이미지가 생성되지 않았습니다.");
  } catch (error: any) {
    console.error("Image gen error:", error);
    if (error.status === 403 || error.code === 403 || error.message?.includes("PERMISSION_DENIED")) {
        throw new Error("API 키 권한이 거부되었습니다. Google Cloud Project에서 결제가 활성화되어 있는지 확인해주세요.");
    }
    throw new Error(`이미지 생성 실패: ${error.message || "알 수 없는 오류"}`);
  }
};
