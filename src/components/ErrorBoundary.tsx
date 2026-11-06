import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, fontFamily, space, type as ty, type Colors } from '../theme';
import { t } from '../i18n';
import { logError } from '../feedback/log';

function Fallback() {
  const { c } = useTheme();
  const s = makeStyles(c);
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.title}>{t('error.title')}</Text>
        <Text style={s.body}>{t('error.body')}</Text>
      </View>
    </SafeAreaView>
  );
}

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No reporter, no PII off-device (canon § Analytics). The on-device
    // diagnostic buffer is the exception the canon carves out: it stays on the
    // device unless the user attaches it to a bug report themselves — and a
    // render crash is precisely the thing that report needs to carry. The
    // component stack is component NAMES only, never props or state.
    logError('render', error, { componentStack: String(info?.componentStack || '').trim() });
    console.warn('Caught render error:', error);
  }

  render() {
    if (this.state.hasError) return <Fallback />;
    return this.props.children;
  }
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.s7,
      gap: space.s4,
    },
    title: {
      ...ty.md,
      fontFamily: fontFamily.sansSemibold,
      color: c.fg,
      textAlign: 'center',
    },
    body: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      textAlign: 'center',
    },
  });
}
