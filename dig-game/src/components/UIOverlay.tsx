import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  currentLevel: number;
  totalLevels: number;
  onRestart: () => void;
}

const UIOverlay = memo(({ currentLevel, totalLevels, onRestart }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 6) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>
            Bölüm {currentLevel + 1}/{totalLevels}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.restartBtn}
          onPress={onRestart}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.restartIcon}>↺</Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

UIOverlay.displayName = 'UIOverlay';

export default UIOverlay;

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    zIndex: 20,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  levelText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  restartBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  restartIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
});
