import { useRef, useState, useCallback } from 'react';
import WebView from 'react-native-webview';
import { LEVELS, LevelData } from '../constants/levels';

interface GameState {
  currentLevel: number;
  isWon: boolean;
  isReady: boolean;
}

interface WebViewMessage {
  type: 'READY' | 'LEVEL_COMPLETE';
}

export function useGameLogic() {
  const webViewRef = useRef<WebView>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentLevel: 0,
    isWon: false,
    isReady: false,
  });

  const sendToGame = useCallback((fn: string, arg?: unknown) => {
    const js =
      arg !== undefined
        ? `window['${fn}'](${JSON.stringify(arg)}); true;`
        : `window['${fn}'](); true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg: WebViewMessage = JSON.parse(event.nativeEvent.data);

        if (msg.type === 'READY') {
          setGameState(prev => ({ ...prev, isReady: true }));
          sendToGame('loadLevel', LEVELS[0]);
        } else if (msg.type === 'LEVEL_COMPLETE') {
          setGameState(prev => ({ ...prev, isWon: true }));
        }
      } catch (_) {}
    },
    [sendToGame],
  );

  const loadLevelByIndex = useCallback(
    (index: number) => {
      const safeIndex = ((index % LEVELS.length) + LEVELS.length) % LEVELS.length;
      const level: LevelData = LEVELS[safeIndex];
      setGameState(prev => ({ ...prev, currentLevel: safeIndex, isWon: false }));
      sendToGame('loadLevel', level);
    },
    [sendToGame],
  );

  const restart = useCallback(() => {
    setGameState(prev => ({ ...prev, isWon: false }));
    sendToGame('restartLevel');
  }, [sendToGame]);

  const nextLevel = useCallback(() => {
    loadLevelByIndex(gameState.currentLevel + 1);
  }, [gameState.currentLevel, loadLevelByIndex]);

  return {
    webViewRef,
    gameState,
    handleMessage,
    restart,
    nextLevel,
    totalLevels: LEVELS.length,
  };
}
