import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const AnimatedView = Animated.View;
  const AnimatedText = Animated.Text;
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  async function handlePasswordReset() {
    if (!email) {
      Alert.alert('Erro', 'Por favor, digite seu e-mail');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'supabase://reset-password',
      });

      if (error) throw error;

      Alert.alert('Pronto!', 'Um link foi enviado pro seu e-mail.');
    } catch (error) {
      Alert.alert('Ops!', (error as Error).message || 'Falha ao enviar o link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.background} />

        <AnimatedView entering={SlideInRight.duration(500)} style={styles.card}>
          <View style={styles.cardHeader}>
           
            <AnimatedText entering={FadeInUp.duration(600)} style={styles.slogan}>
              Cabinet key
            </AnimatedText>
            <AnimatedText entering={FadeInUp.duration(600).delay(100)} style={styles.subtitle}>
              Recuperar senha
            </AnimatedText>
          </View>

          <View style={styles.form}>
            <AnimatedView entering={FadeInDown.duration(600).delay(200)} style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                <TextInput
                  placeholder="Digite seu email"
                  placeholderTextColor={colors.slate[400]}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </AnimatedView>

            <AnimatedTouchableOpacity
     
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePasswordReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.pearl} />
              ) : (
                <Text style={styles.buttonText}>Enviar link</Text>
              )}
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              
              style={styles.loginLink}
              onPress={() => router.replace('/(auth)/signin/login')}
            >
              <Text style={styles.loginText}>
                Lembrou a senha? <Text style={styles.loginLinkText}>Volte ao login</Text>
              </Text>
            </AnimatedTouchableOpacity>
          </View>
        </AnimatedView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.slate[900], // Darker bluish background
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.slate[800], // Softer, darker card background
    borderRadius: 16, // Softer corners
    padding: 24,
    shadowColor: colors.neon.aqua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.slate[700], // Subtle border
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  slogan: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.pearl, // Softer white for logo
    textAlign: 'center',
    textShadowColor: colors.glow.blue, // Bluish glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.slate[400], // Softer gray for subtitle
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[600], // Darker border
    borderRadius: 10,
    backgroundColor: colors.slate[700], // Darker input background
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.pearl,
  },
  button: {
    backgroundColor: colors.neon.aqua, // Bluish button color
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.glow.blue, // Bluish glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.noir, // Dark text for contrast
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: colors.slate[400], // Softer gray
    fontSize: 14,
  },
  loginLinkText: {
    color: colors.neon.aqua, // Bluish link color
    fontWeight: '600',
    textShadowColor: colors.glow.blue, // Bluish glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});