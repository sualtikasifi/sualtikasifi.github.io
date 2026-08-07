import React, { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface Props {
  visible: boolean;
  levelNumber: number;
  isLastLevel: boolean;
  onNextLevel: () => void;
  onRestart: () => void;
}

const LevelModal = memo(
  ({ visible, levelNumber, isLastLevel, onNextLevel, onRestart }: Props) => (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.title}>Tebrikler!</Text>
          <Text style={styles.subtitle}>Bölüm {levelNumber} tamamlandı</Text>

          {!isLastLevel ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onNextLevel}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Sonraki Bölüm →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnGold]}
              onPress={onRestart}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Baştan Oyna ↺</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onRestart}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Bu bölümü tekrar et</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ),
);

LevelModal.displayName = 'LevelModal';

export default LevelModal;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1C1155',
    borderRadius: 26,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: width * 0.80,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
  },
  star: {
    fontSize: 52,
    color: '#FFD700',
    marginBottom: 6,
    textShadowColor: 'rgba(255,200,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 30,
    letterSpacing: 0.3,
  },
  primaryBtn: {
    backgroundColor: '#0CB4E4',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#0CB4E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryBtnGold: {
    backgroundColor: '#E6A800',
    shadowColor: '#E6A800',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
