import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { GAME_HTML } from '../game/gameHtml';

interface Props {
  webViewRef: React.RefObject<WebView>;
  onMessage: (event: WebViewMessageEvent) => void;
}

const GameWebView = memo(({ webViewRef, onMessage }: Props) => (
  <WebView
    ref={webViewRef}
    source={{ html: GAME_HTML }}
    style={styles.view}
    originWhitelist={['*']}
    javaScriptEnabled
    domStorageEnabled
    scalesPageToFit={false}
    scrollEnabled={false}
    bounces={false}
    overScrollMode="never"
    showsHorizontalScrollIndicator={false}
    showsVerticalScrollIndicator={false}
    onMessage={onMessage}
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    androidLayerType="hardware"
  />
));

GameWebView.displayName = 'GameWebView';

export default GameWebView;

const styles = StyleSheet.create({
  view: {
    flex: 1,
    backgroundColor: '#130B2E',
  },
});
