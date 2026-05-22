import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { AppConfig, isMockMode, isSupabaseConfigured } from '@/constants/config';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function SignInScreen() {
  const { theme } = useTheme();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState(isSupabaseConfigured() ? '' : 'dev@gumloop.local');
  const [password, setPassword] = useState(isSupabaseConfigured() ? '' : 'demo1234');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const message = (e as Error).message ?? 'Sign-in failed.';
      setError(message);
      Alert.alert('Sign-in failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Palette.brand[600], Palette.brand[500], theme.background]}
        locations={[0, 0.35, 1]}
        style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', padding: Spacing[4] }}>
          <View style={{ alignItems: 'flex-start', marginBottom: Spacing[6], gap: Spacing[2] }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#FFFFFF22',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="layers-outline" color="#FFFFFF" size={22} />
            </View>
            <Text variant="display" style={{ color: '#FFFFFF' }}>
              Gumloop{'\n'}Native
            </Text>
            <Text variant="body" style={{ color: '#FFFFFFCC' }}>
              Mobile supervision for your enterprise automations.
            </Text>
          </View>
          <Card style={{ gap: Spacing[4] }}>
            <View>
              <Text variant="h1">Sign in</Text>
              <Text variant="caption" tone="muted">
                Continue to {AppConfig.appName}
              </Text>
            </View>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              leftIcon="mail-outline"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              autoCapitalize="none"
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            {error ? (
              <Text variant="caption" tone="danger">
                {error}
              </Text>
            ) : null}
            <Button
              label="Sign in"
              onPress={onSubmit}
              loading={submitting || loading}
              fullWidth
              size="lg"
            />
            {isMockMode() || !isSupabaseConfigured() ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: Spacing[2],
                  alignItems: 'flex-start',
                  padding: Spacing[3],
                  backgroundColor: theme.primarySubtle,
                  borderRadius: 8,
                }}>
                <Ionicons name="flask-outline" color={theme.primary} size={16} />
                <Text variant="caption" tone="brand" style={{ flex: 1 }}>
                  Dev mode: any email + password works. Replace mock providers in
                  src/constants/config.ts when credentials are ready.
                </Text>
              </View>
            ) : null}
          </Card>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}
