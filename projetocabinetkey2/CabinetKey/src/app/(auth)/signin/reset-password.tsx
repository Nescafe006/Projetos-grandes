import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token, type } = useLocalSearchParams(); // Captura parâmetros da URL
  const AnimatedView = Animated.View;
  const AnimatedText = Animated.Text;
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  // Verifica o token ao carregar a página
  useEffect(() => {
    if (type === 'recovery' && token) {
      // O token será processado ao atualizar a senha
      console.log('Token de recuperação recebido:', token);
    } else {
      setError('Link de recuperação inválido ou expirado.');
    }
  }, [token, type]);

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Atualiza a senha usando o Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Sua senha foi atualizada com sucesso!');
      router.replace('/(auth)/signin/login');
    } catch (error) {
      Alert.alert('Erro', (error as Error).message || 'Falha ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.background} />

        <AnimatedView entering={FadeInDown.duration(500)} style={styles.card}>
          <View style={styles.cardHeader}>
            <AnimatedText entering={FadeInUp.duration(600)} style={styles.slogan}>
              Cabinet key
            </AnimatedText>
            <AnimatedText entering={FadeInUp.duration(600).delay(100)} style={styles.subtitle}>
              Redefinir Senha
            </AnimatedText>
          </View>

          {error ? (
            <AnimatedText entering={FadeInUp.duration(600)} style={styles.errorText}>
              {error}
            </AnimatedText>
          ) : (
            <View style={styles.form}>
              <AnimatedView entering={FadeInDown.duration(600).delay(200)} style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Nova senha"
                    placeholderTextColor={colors.slate[400]}
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </AnimatedView>

              <AnimatedView entering={FadeInDown.duration(600).delay(300)} style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={colors.slate[400]}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </AnimatedView>

              <AnimatedTouchableOpacity
                entering={FadeInDown.duration(600).delay(400)}
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.pearl} />
                ) : (
                  <Text style={styles.buttonText}>Atualizar Senha</Text>
                )}
              </AnimatedTouchableOpacity>

              <AnimatedTouchableOpacity
                entering={FadeInDown.duration(600).delay(500)}
                style={styles.loginLink}
                onPress={() => router.replace('/(auth)/signin/login')}
              >
                <Text style={styles.loginText}>
                  Voltar ao <Text style={styles.loginLinkText}>Login</Text>
                </Text>
              </AnimatedTouchableOpacity>
            </View>
          )}
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
    backgroundColor: colors.slate[900],
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.slate[800],
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.neon.aqua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  slogan: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.pearl,
    textAlign: 'center',
    textShadowColor: colors.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.slate[400],
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
    borderColor: colors.slate[600],
    borderRadius: 10,
    backgroundColor: colors.slate[700],
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
    backgroundColor: colors.neon.aqua,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.glow.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.noir,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: colors.slate[400],
    fontSize: 14,
  },
  loginLinkText: {
    color: colors.neon.aqua,
    fontWeight: '600',
    textShadowColor: colors.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  errorText: {
    color: colors.slate[300],
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
});