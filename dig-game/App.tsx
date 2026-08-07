import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GameWebView from './src/components/GameWebView';
import UIOverlay from './src/components/UIOverlay';
import LevelModal from './src/components/LevelModal';
import { useGameLogic } from './src/hooks/useGameLogic';
import { LEVELS } from './src/constants/levels';

export default function App() {
  const { webViewRef, gameState, handleMessage, restart, nextLevel, totalLevels } =
    useGameLogic();

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <GameWebView webViewRef={webViewRef} onMessage={handleMessage} />

        <UIOverlay
          currentLevel={gameState.currentLevel}
          totalLevels={totalLevels}
          onRestart={restart}
        />

        <LevelModal
          visible={gameState.isWon}
          levelNumber={gameState.currentLevel + 1}
          isLastLevel={gameState.currentLevel === LEVELS.length - 1}
          onNextLevel={nextLevel}
          onRestart={restart}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#130B2E',
  },
});
