
import React, { useState, useMemo } from 'react';
import { Scene, StoryboardData, Character, StoryConfig } from '../types';
import { generateSceneImage } from '../services/geminiService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

interface BackupData {
  version: string;
  exportDate: string;
  storyConfig: StoryConfig;
  characters: Character[];
  storyboard: StoryboardData;
}

interface Props {
  data: StoryboardData;
  characters: Character[];
  songConfig: StoryConfig;
  onReset: () => void;
  onSave: (scenes: Scene[], silent?: boolean) => void;
  onRestore?: (backup: BackupData) => void;
}

const CueSheet: React.FC<Props> = ({ data, characters, songConfig, onReset, onSave, onRestore }) => {
  const [scenes, setScenes] = useState<Scene[]>(data.scenes);
  const [selectedModel, setSelectedModel] = useState<'nano' | 'pro'>('nano');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedAct, setSelectedAct] = useState<'all' | '1' | '2' | '3'>('all');
  const [copiedSceneId, setCopiedSceneId] = useState<number | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Get unique acts from scenes
  const acts = useMemo(() => {
    const actSet = new Set<string>();
    scenes.forEach(s => {
      if (s.act.includes('1')) actSet.add('1');
      else if (s.act.includes('2')) actSet.add('2');
      else if (s.act.includes('3')) actSet.add('3');
    });
    return Array.from(actSet).sort();
  }, [scenes]);

  // Filter scenes by selected act
  const filteredScenes = useMemo(() => {
    if (selectedAct === 'all') return scenes;
    return scenes.filter(s => s.act.includes(selectedAct));
  }, [scenes, selectedAct]);

  const handleGenerateImage = async (sceneId: number, type: 'concept' | 'storyboard') => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    const updatedScenes = [...scenes];
    if (type === 'concept') updatedScenes[sceneIndex].isGeneratingImage = true;
    else updatedScenes[sceneIndex].isGeneratingStoryboard = true;
    setScenes(updatedScenes);

    const scene = scenes[sceneIndex];
    const involvedCharNames = scene.charactersInvolved || [];
    const involvedChars = characters.filter(c =>
        involvedCharNames.some(name => c.name.includes(name) || name.includes(c.name))
    );

    if (involvedChars.length === 0) {
        const main = characters.find(c => c.name === songConfig.mainCharacterName);
        if (main) involvedChars.push(main);
    }

    const charRefs: string[] = [];
    const charDescriptions: string[] = [];

    involvedChars.forEach(c => {
        if (c.imageUrl) charRefs.push(c.imageUrl);
        charDescriptions.push(`Name: ${c.name}, Appearance: ${c.description}`);
    });

    const modelName = selectedModel === 'nano' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

    let promptToUse = scene.visualDescription;

    if (type === 'storyboard') {
        promptToUse = `
          SCENE ID: ${scene.id} (Act: ${scene.act})
          ACTION: ${scene.visualDescription}
          CAMERA: ${scene.cameraAngle}
          ATMOSPHERE: ${songConfig.backgroundSetting}
          CHARACTERS: ${involvedCharNames.join(', ')}

          This is a storyboard panel for a 3D animated film.
        `;
    }

    try {
      const imageUrl = await generateSceneImage(
        promptToUse,
        modelName,
        'anime',
        charRefs,
        charDescriptions,
        songConfig.aspectRatio,
        type === 'storyboard'
      );

      const finalScenes = [...scenes];
      if (type === 'concept') {
          finalScenes[sceneIndex].generatedImageUrl = imageUrl;
          finalScenes[sceneIndex].isGeneratingImage = false;
      } else {
          finalScenes[sceneIndex].storyboardImageUrl = imageUrl;
          finalScenes[sceneIndex].isGeneratingStoryboard = false;
      }
      setScenes(finalScenes);
      onSave(finalScenes, true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "이미지 생성에 실패했습니다.");

      const finalScenes = [...scenes];
      if (type === 'concept') finalScenes[sceneIndex].isGeneratingImage = false;
      else finalScenes[sceneIndex].isGeneratingStoryboard = false;
      setScenes(finalScenes);
    }
  };

  // Batch generate all images for filtered scenes
  const handleBatchGenerate = async () => {
    // Get scenes to generate (only those without images)
    const scenesToGenerate = filteredScenes.filter(s => !s.generatedImageUrl);

    if (scenesToGenerate.length === 0) {
      alert('생성할 이미지가 없습니다. 모든 씬에 이미지가 있습니다.');
      return;
    }

    const confirmMessage = selectedAct === 'all'
      ? `전체 ${scenesToGenerate.length}개 씬의 이미지를 생성하시겠습니까?`
      : `${getActLabel(selectedAct)} ${scenesToGenerate.length}개 씬의 이미지를 생성하시겠습니까?`;

    if (!confirm(confirmMessage)) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: scenesToGenerate.length });

    const modelName = selectedModel === 'nano' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

    for (let i = 0; i < scenesToGenerate.length; i++) {
      const scene = scenesToGenerate[i];
      setBatchProgress({ current: i + 1, total: scenesToGenerate.length });

      const sceneIndex = scenes.findIndex(s => s.id === scene.id);
      if (sceneIndex === -1) continue;

      // Mark as generating
      setScenes(prev => {
        const updated = [...prev];
        updated[sceneIndex].isGeneratingImage = true;
        return updated;
      });

      const involvedCharNames = scene.charactersInvolved || [];
      const involvedChars = characters.filter(c =>
        involvedCharNames.some(name => c.name.includes(name) || name.includes(c.name))
      );

      if (involvedChars.length === 0) {
        const main = characters.find(c => c.name === songConfig.mainCharacterName);
        if (main) involvedChars.push(main);
      }

      const charRefs: string[] = [];
      const charDescriptions: string[] = [];
      involvedChars.forEach(c => {
        if (c.imageUrl) charRefs.push(c.imageUrl);
        charDescriptions.push(`Name: ${c.name}, Appearance: ${c.description}`);
      });

      try {
        const imageUrl = await generateSceneImage(
          scene.visualDescription,
          modelName,
          'anime',
          charRefs,
          charDescriptions,
          songConfig.aspectRatio,
          false
        );

        setScenes(prev => {
          const updated = [...prev];
          updated[sceneIndex].generatedImageUrl = imageUrl;
          updated[sceneIndex].isGeneratingImage = false;
          return updated;
        });

        // Save after each successful generation
        onSave(scenes.map((s, idx) =>
          idx === sceneIndex ? { ...s, generatedImageUrl: imageUrl, isGeneratingImage: false } : s
        ), true);

      } catch (e: any) {
        console.error(`Scene ${scene.id} generation failed:`, e);
        setScenes(prev => {
          const updated = [...prev];
          updated[sceneIndex].isGeneratingImage = false;
          return updated;
        });
      }

      // Small delay to avoid rate limiting
      if (i < scenesToGenerate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsBatchGenerating(false);
    setBatchProgress({ current: 0, total: 0 });
    alert('이미지 생성이 완료되었습니다!');
  };

  // Download images as ZIP
  const handleDownloadZip = async () => {
    const scenesWithImages = filteredScenes.filter(s => s.generatedImageUrl);

    if (scenesWithImages.length === 0) {
      alert('다운로드할 이미지가 없습니다.');
      return;
    }

    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const folderName = selectedAct === 'all' ? '전체' : `${selectedAct}막`;

      for (const scene of scenesWithImages) {
        const imageUrl = scene.generatedImageUrl!;

        // Convert base64 to blob
        const base64Data = imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const fileName = `scene_${String(scene.id).padStart(2, '0')}_${scene.act.replace(/\s/g, '_')}.png`;
        zip.file(fileName, byteArray);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${songConfig.title}_${folderName}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      console.error('ZIP download error:', e);
      alert('ZIP 다운로드 실패: ' + e.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadImage = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string, sceneId?: number) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (sceneId !== undefined) {
        setCopiedSceneId(sceneId);
        setTimeout(() => setCopiedSceneId(null), 2000);
      }
    } catch (err) {
      console.error('복사 실패:', err);
      alert('복사에 실패했습니다. 직접 텍스트를 선택하여 복사해주세요.');
    }
  };

  const downloadPDF = async () => {
    setIsDownloadingPdf(true);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        // Helper: Create temp container and capture as image
        const captureSection = async (html: string, width: number = 760): Promise<string> => {
            const container = document.createElement('div');
            container.style.cssText = `
              position: fixed;
              left: -9999px;
              top: 0;
              width: ${width}px;
              background: #0f172a;
              font-family: 'Noto Sans KR', sans-serif;
              color: #e2e8f0;
              padding: 30px;
            `;
            container.innerHTML = html;
            document.body.appendChild(container);

            // Wait for images
            const images = container.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              });
            }));

            const canvas = await html2canvas(container, {
              scale: 2,
              backgroundColor: '#0f172a',
              useCORS: true,
              logging: false,
              windowWidth: width
            });

            document.body.removeChild(container);
            return canvas.toDataURL('image/png');
        };

        // Helper: Fill page background
        const fillPageBackground = () => {
            pdf.setFillColor(14, 23, 42); // #0e172a
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        };

        // Helper: Add image to PDF with page management
        const addImageToPdf = async (imgData: string, isFirstPage: boolean = false) => {
            if (!isFirstPage) pdf.addPage();
            fillPageBackground();

            const img = new Image();
            img.src = imgData;
            await new Promise(resolve => { img.onload = resolve; });

            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (img.height * imgWidth) / img.width;

            // If image fits on one page
            if (imgHeight <= pageHeight - (margin * 2)) {
                pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
            } else {
                // Split across multiple pages
                let remainingHeight = imgHeight;
                let sourceY = 0;
                let isFirst = true;

                while (remainingHeight > 0) {
                    if (!isFirst) {
                        pdf.addPage();
                        fillPageBackground();
                    }

                    const availableHeight = pageHeight - (margin * 2);
                    const sliceHeight = Math.min(remainingHeight, availableHeight);
                    const sourceHeight = (sliceHeight / imgHeight) * img.height;

                    // Create canvas for this slice
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = img.width;
                    sliceCanvas.height = sourceHeight;
                    const ctx = sliceCanvas.getContext('2d')!;
                    ctx.drawImage(img, 0, sourceY, img.width, sourceHeight, 0, 0, img.width, sourceHeight);

                    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, sliceHeight);

                    sourceY += sourceHeight;
                    remainingHeight -= sliceHeight;
                    isFirst = false;
                }
            }
        };

        // Fill first page background
        fillPageBackground();

        // ========== 1. COVER PAGE ==========
        const coverHtml = `
          <div style="height: 800px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ec4899, #8b5cf6); border-radius: 20px; margin-bottom: 30px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px; font-weight: bold; color: white;">3D</span>
            </div>
            <h1 style="font-size: 42px; font-weight: bold; color: white; margin-bottom: 16px;">${songConfig.title || '제목 없음'}</h1>
            <p style="font-size: 18px; color: #94a3b8; margin-bottom: 40px;">3D Animation Storyboard</p>
            <div style="color: #64748b; font-size: 14px;">
              <p style="margin-bottom: 8px;">총 ${scenes.length}개 씬 | ${characters.length}명의 캐릭터</p>
              <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        `;
        const coverImg = await captureSection(coverHtml);
        await addImageToPdf(coverImg, true);

        // ========== 2. STORY SETUP PAGE ==========
        const storyHtml = `
          <div style="padding: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #ec4899;">
              <div style="width: 6px; height: 32px; background: #ec4899; border-radius: 3px; margin-right: 12px;"></div>
              <h2 style="font-size: 28px; font-weight: bold; color: white;">스토리 설정</h2>
            </div>

            <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600; width: 140px; vertical-align: top;">주인공</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.mainCharacterName} - ${songConfig.mainCharacterDescription}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600; vertical-align: top;">구해야 할 대상</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.targetToSave} - ${songConfig.targetToSaveDescription || ''}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600;">위험 요소 (위협)</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.dangerThreat}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600;">위험 요소 (도구)</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.dangerTool}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600;">위험 장소</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.dangerLocation}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600;">배경 설정</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.backgroundSetting}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #06b6d4; font-weight: 600;">화면 비율</td>
                  <td style="padding: 12px 0; color: #e2e8f0;">${songConfig.aspectRatio}</td>
                </tr>
              </table>
            </div>

            ${songConfig.additionalCharacters && songConfig.additionalCharacters.length > 0 ? `
              <div style="background: #1e293b; border-radius: 12px; padding: 24px;">
                <h3 style="color: #06b6d4; font-weight: 600; margin-bottom: 16px; font-size: 16px;">조연 캐릭터</h3>
                ${songConfig.additionalCharacters.map((char, idx) => `
                  <div style="padding: 8px 0; border-bottom: 1px solid #334155; color: #e2e8f0;">${idx + 1}. ${char.name} - ${char.description}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
        const storyImg = await captureSection(storyHtml);
        await addImageToPdf(storyImg);

        // ========== 3. CHARACTER CASTING PAGE ==========
        const characterHtml = `
          <div style="padding: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #a855f7;">
              <div style="width: 6px; height: 32px; background: #a855f7; border-radius: 3px; margin-right: 12px;"></div>
              <h2 style="font-size: 28px; font-weight: bold; color: white;">캐릭터 캐스팅</h2>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              ${characters.map(char => `
                <div style="background: #1e293b; border-radius: 12px; padding: 16px; display: flex; gap: 16px;">
                  ${char.imageUrl ? `<img src="${char.imageUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : '<div style="width: 100px; height: 100px; background: #334155; border-radius: 8px; flex-shrink: 0;"></div>'}
                  <div style="flex: 1; min-width: 0;">
                    <h3 style="font-size: 16px; font-weight: bold; color: white; margin-bottom: 8px;">${char.name}</h3>
                    <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">${char.description || ''}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        const charImg = await captureSection(characterHtml);
        await addImageToPdf(charImg);

        // ========== 4. CUE SHEET - BY ACT ==========
        const actGroups = [
          { act: '1', label: '1막: 위기 발견', color: '#d97706', scenes: scenes.filter(s => s.act.includes('1')) },
          { act: '2', label: '2막: 추격과 반전', color: '#dc2626', scenes: scenes.filter(s => s.act.includes('2')) },
          { act: '3', label: '3막: 화해와 감동', color: '#16a34a', scenes: scenes.filter(s => s.act.includes('3')) },
        ];

        for (const actGroup of actGroups) {
          if (actGroup.scenes.length === 0) continue;

          const actHtml = `
            <div style="padding: 20px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid ${actGroup.color};">
                <div style="width: 6px; height: 32px; background: ${actGroup.color}; border-radius: 3px; margin-right: 12px;"></div>
                <h2 style="font-size: 28px; font-weight: bold; color: white;">${actGroup.label}</h2>
                <span style="margin-left: auto; background: ${actGroup.color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${actGroup.scenes.length}개 씬</span>
              </div>

              ${actGroup.scenes.map(scene => `
                <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; gap: 16px; border-left: 4px solid ${actGroup.color};">
                  ${scene.generatedImageUrl ? `<img src="${scene.generatedImageUrl}" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : '<div style="width: 140px; height: 90px; background: #334155; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 11px;">이미지 없음</div>'}
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="font-size: 18px; font-weight: bold; color: white;">Scene #${scene.id}</span>
                      <span style="font-size: 11px; color: #06b6d4; background: #0e7490; padding: 2px 8px; border-radius: 4px;">${scene.duration}s</span>
                      <span style="font-size: 11px; color: #94a3b8;">${scene.cameraAngle}</span>
                    </div>
                    ${scene.charactersInvolved && scene.charactersInvolved.length > 0 ? `
                      <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">👤 ${scene.charactersInvolved.join(', ')}</div>
                    ` : ''}
                    <p style="font-size: 12px; color: #e2e8f0; line-height: 1.5; margin-bottom: 8px;">${scene.visualDescription}</p>
                    <div style="background: #0f172a; border-radius: 6px; padding: 8px; border: 1px solid #334155;">
                      <p style="font-size: 9px; color: #c084fc; line-height: 1.4; word-break: break-all; margin: 0;"><strong>Prompt:</strong> ${scene.videoPrompt}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
          const actImg = await captureSection(actHtml);
          await addImageToPdf(actImg);
        }

        pdf.save(`${songConfig.title || 'storyboard'}_complete.pdf`);
    } catch (e: any) {
        console.error(e);
        alert(`PDF 생성 실패: ${e.message}`);
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  // JSON Backup Download
  const handleBackupDownload = () => {
    const backupData: BackupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      storyConfig: songConfig,
      characters: characters,
      storyboard: {
        ...data,
        scenes: scenes
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${songConfig.title}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // JSON Restore Upload
  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string) as BackupData;

        // Validate backup structure
        if (!backupData.storyConfig || !backupData.characters || !backupData.storyboard) {
          throw new Error('유효하지 않은 백업 파일입니다.');
        }

        if (confirm(`"${backupData.storyConfig.title}" 프로젝트를 복원하시겠습니까?\n(현재 작업 내용이 덮어씌워집니다)`)) {
          if (onRestore) {
            onRestore(backupData);
          }
        }
      } catch (err: any) {
        alert('백업 파일을 읽는데 실패했습니다: ' + err.message);
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getActColor = (act: string) => {
    if (act === '1') return { bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500' };
    if (act === '2') return { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' };
    return { bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' };
  };

  const getActLabel = (act: string) => {
    if (act === '1') return '1막: 위기 발견';
    if (act === '2') return '2막: 추격과 반전';
    return '3막: 화해와 감동';
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-700 px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
         <div className="flex items-center gap-3">
             <button
               onClick={onReset}
               className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
               title="나가기"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
               </svg>
             </button>
             <div>
                 <h2 className="font-bold text-base flex items-center gap-2 text-white">
                     {songConfig.title}
                     <span className="text-[10px] bg-pink-900/50 border border-pink-500/30 px-1.5 py-0.5 rounded text-pink-300">{scenes.length}프레임</span>
                 </h2>
                 <p className="text-[10px] text-slate-500">
                    주인공: {songConfig.mainCharacterName} • 테마: 감동적인 동물 구조 이야기
                 </p>
             </div>
         </div>

         <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-500">모델:</span>
             <select
               value={selectedModel}
               onChange={(e) => setSelectedModel(e.target.value as 'nano' | 'pro')}
               className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-cyan-500"
             >
                 <option value="nano">Flash (빠름)</option>
                 <option value="pro">Pro (고품질)</option>
             </select>

             <div className="h-4 w-px bg-slate-700 mx-1"></div>

             {/* Backup Upload */}
             <input
               ref={fileInputRef}
               type="file"
               accept=".json"
               onChange={handleBackupUpload}
               className="hidden"
             />
             <button
               onClick={() => fileInputRef.current?.click()}
               className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-md border border-slate-700 transition-colors"
               title="백업 복원"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
               </svg>
             </button>

             {/* Backup Download */}
             <button
               onClick={handleBackupDownload}
               className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-md text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
               title="JSON 백업"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
               </svg>
               저장
             </button>

             {/* PDF Download */}
             <button
               onClick={downloadPDF}
               disabled={isDownloadingPdf}
               className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-md font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
               </svg>
               {isDownloadingPdf ? "생성중..." : "PDF"}
             </button>
         </div>
      </div>

      {/* Act Tabs */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedAct('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            selectedAct === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          전체 ({scenes.length})
        </button>
        {acts.map(act => {
          const colors = getActColor(act);
          const count = scenes.filter(s => s.act.includes(act)).length;
          return (
            <button
              key={act}
              onClick={() => setSelectedAct(act as '1' | '2' | '3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedAct === act
                  ? `${colors.bg} text-white`
                  : `text-slate-400 hover:${colors.text} hover:bg-slate-800`
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${colors.bg}`}></span>
              {getActLabel(act)} ({count})
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Batch Generate Button */}
        <button
          onClick={handleBatchGenerate}
          disabled={isBatchGenerating || isDownloadingZip}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBatchGenerating ? (
            <>
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{batchProgress.current}/{batchProgress.total} 생성중...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
              <span>{selectedAct === 'all' ? '전체' : getActLabel(selectedAct)} 이미지 생성</span>
            </>
          )}
        </button>

        {/* ZIP Download Button */}
        <button
          onClick={handleDownloadZip}
          disabled={isDownloadingZip || isBatchGenerating || filteredScenes.filter(s => s.generatedImageUrl).length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloadingZip ? (
            <>
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>압축중...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>ZIP 다운로드</span>
            </>
          )}
        </button>
      </div>

      {/* Scene Grid */}
      <div id="cuesheet-content" className="flex-1 p-3 overflow-y-auto">
         {/* Summary View for "All" */}
         {selectedAct === 'all' ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
             {filteredScenes.map((scene) => {
               const actColor = scene.act.includes('1') ? 'bg-amber-600' : (scene.act.includes('2') ? 'bg-red-600' : 'bg-green-600');
               const actBorder = scene.act.includes('1') ? 'border-amber-600/50' : (scene.act.includes('2') ? 'border-red-600/50' : 'border-green-600/50');

               return (
                 <div
                   key={scene.id}
                   onClick={() => setSelectedAct(scene.act.includes('1') ? '1' : scene.act.includes('2') ? '2' : '3')}
                   className={`bg-slate-900 border ${actBorder} rounded-lg p-2 cursor-pointer hover:bg-slate-800 transition-all group`}
                 >
                   <div className="flex items-center gap-1.5 mb-1.5">
                     <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${actColor} text-white`}>
                       {scene.act.replace('Act ', '')}
                     </span>
                     <span className="text-xs font-bold text-white">#{scene.id}</span>
                     <span className="text-[9px] text-cyan-400 font-mono ml-auto">{scene.duration}s</span>
                   </div>
                   <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                     {scene.visualDescription}
                   </p>
                   {scene.generatedImageUrl && (
                     <div className="mt-1.5 aspect-video rounded overflow-hidden">
                       <img src={scene.generatedImageUrl} className="w-full h-full object-cover" alt="" />
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         ) : (
           /* Detailed View for individual Acts */
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
             {filteredScenes.map((scene) => {
               const actColor = scene.act.includes('1') ? 'bg-amber-600' : (scene.act.includes('2') ? 'bg-red-600' : 'bg-green-600');

               return (
                 <div
                   key={scene.id}
                   id={`scene-${scene.id}`}
                   className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors"
                 >
                   {/* Act Label */}
                   <div className={`absolute top-0 left-0 px-2 py-0.5 text-[9px] font-bold uppercase ${actColor} text-white rounded-br-md z-10`}>
                       {scene.act}
                   </div>

                   {/* Scene Header */}
                   <div className="flex items-center justify-between mb-2 pt-4">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-white">Scene #{scene.id}</span>
                       <span className="text-[10px] text-cyan-400 font-mono">{scene.duration}s</span>
                       <span className="bg-slate-700 text-white text-[9px] px-1.5 py-0.5 rounded">{scene.cameraAngle}</span>
                     </div>
                     <div className="flex gap-1">
                       {scene.charactersInvolved?.slice(0, 2).map((charName, i) => (
                         <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded truncate max-w-[60px]">
                           {charName}
                         </span>
                       ))}
                     </div>
                   </div>

                   {/* Content Grid */}
                   <div className="grid grid-cols-3 gap-2">
                     {/* Image */}
                     <div className="col-span-1">
                       <div className="aspect-video bg-black rounded-md overflow-hidden relative border border-slate-700">
                         {scene.generatedImageUrl ? (
                           <>
                             <img src={scene.generatedImageUrl} className="w-full h-full object-cover" alt="Concept" />
                             <button
                               onClick={(e) => handleDownloadImage(e, scene.generatedImageUrl!, `${songConfig.title}_scene${scene.id}.png`)}
                               className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-0.5 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75v10.5m0 0L7.5 15.75M12 20.25l4.5-4.5M3 16.5V2.25" />
                               </svg>
                             </button>
                           </>
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950">
                             <span className="text-[9px]">이미지</span>
                           </div>
                         )}
                         <button
                           onClick={() => handleGenerateImage(scene.id, 'concept')}
                           disabled={scene.isGeneratingImage}
                           className={`absolute inset-0 flex items-center justify-center transition-opacity text-white font-bold text-[10px] ${scene.generatedImageUrl ? 'bg-black/60 opacity-0 hover:opacity-100' : 'bg-transparent hover:bg-black/30'}`}
                         >
                           {scene.isGeneratingImage ? "생성중..." : (scene.generatedImageUrl ? "재생성" : "생성")}
                         </button>
                       </div>
                     </div>

                     {/* Description & Prompt */}
                     <div className="col-span-2 flex flex-col gap-2">
                       {/* Visual Description */}
                       <div>
                         <p className="text-[11px] text-slate-300 leading-relaxed">
                           {scene.visualDescription}
                         </p>
                       </div>

                       {/* Prompt - Full display */}
                       <div className="flex-1">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-bold text-purple-400">프롬프트</span>
                           <button
                             onClick={() => copyToClipboard(scene.videoPrompt, scene.id)}
                             className={`text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-all ${
                               copiedSceneId === scene.id
                                 ? 'text-green-400 bg-green-900/30'
                                 : 'text-slate-500 hover:text-white hover:bg-slate-700'
                             }`}
                           >
                             {copiedSceneId === scene.id ? '복사됨' : '복사'}
                           </button>
                         </div>
                         <div className="text-[10px] text-purple-300 font-mono bg-slate-950 p-2 rounded border border-purple-900/30 select-all cursor-text break-words leading-relaxed">
                           {scene.videoPrompt}
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         )}
      </div>

          </div>
  );
};

export default CueSheet;
