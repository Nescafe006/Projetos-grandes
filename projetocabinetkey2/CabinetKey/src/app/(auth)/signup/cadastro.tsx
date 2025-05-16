import colors from '@/constants/colors';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { setAuth } = useAuth();

  const AnimatedView = Animated.View;
  const AnimatedText = Animated.Text;
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  const checkAdminLimit = async () => {
    const { count, error } = await supabase
      .from('usuario')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_usuario', 'administrador');

    if (error) {
      console.error('Erro ao verificar limite de administradores:', error.message, error.code, error);
      throw new Error('Falha ao verificar limite de administradores.');
    }

    return count || 0;
  };

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg('Por favor, insira um email válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (role === 'admin') {
        const adminCount = await checkAdminLimit();
        if (adminCount >= 2) {
          setErrorMsg('Limite de administradores atingido. Você só pode se cadastrar como usuário normal.');
          return;
        }
      }

      // Sign up with additional user metadata
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            role: role,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('already exists')) {
          setErrorMsg('Este email já está cadastrado.');
        } else {
          setErrorMsg('Erro ao criar conta: ' + error.message);
        }
        throw error;
      }

      if (data.user) {
        // Wait for the trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update user role if admin
        if (role === 'admin') {
          const { error: updateError } = await supabase
            .from('usuario')
            .update({ tipo_usuario: 'administrador' })
            .eq('id', data.user.id);
            
          if (updateError) throw updateError;
        }

        setSuccessMsg('Cadastro realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          router.replace('/(auth)/signin/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Signup failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.background} />

        <AnimatedView entering={SlideInRight.duration(500)} style={styles.card}>
          <View style={styles.cardHeader}>
            <AnimatedText entering={FadeInUp.duration(600)} style={styles.logoText}>
              Cabinet key
            </AnimatedText>
            <AnimatedText entering={FadeInUp.duration(600).delay(100)} style={styles.subtitle}>
              Criar uma conta
            </AnimatedText>
          </View>

          <View style={styles.form}>
            <AnimatedView entering={FadeInDown.duration(600).delay(200)} style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                <TextInput
                  placeholder="Nome completo"
                  placeholderTextColor={colors.slate[400]}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </AnimatedView>

            <AnimatedView entering={FadeInDown.duration(600).delay(300)} style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={colors.slate[400]}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </AnimatedView>

            <AnimatedView entering={FadeInDown.duration(600).delay(400)} style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                <TextInput
                  placeholder="Senha"
                  placeholderTextColor={colors.slate[400]}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </AnimatedView>

            <AnimatedView entering={FadeInDown.duration(600).delay(500)} style={styles.roleSelector}>
              <AnimatedTouchableOpacity
                style={[styles.roleButton, role === 'user' && styles.roleButtonSelected]}
                onPress={() => setRole('user')}
              >
                <Text style={[styles.roleText, role === 'user' && styles.roleTextSelected]}>Usuário</Text>
              </AnimatedTouchableOpacity>

              <AnimatedTouchableOpacity
                style={[styles.roleButton, role === 'admin' && styles.roleButtonSelected]}
                onPress={() => setRole('admin')}
              >
                <Text style={[styles.roleText, role === 'admin' && styles.roleTextSelected]}>Administrador</Text>
              </AnimatedTouchableOpacity>
            </AnimatedView>

            {errorMsg && (
              <AnimatedText entering={FadeInDown.duration(600).delay(600)} style={styles.error}>
                {errorMsg}
              </AnimatedText>
            )}
            {successMsg && (
              <AnimatedText entering={FadeInDown.duration(600).delay(600)} style={styles.success}>
                {successMsg}
              </AnimatedText>
            )}

            <AnimatedTouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.pearl} />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/(auth)/signin/login')}
            >
              <Text style={styles.loginText}>
                Já possui uma conta? <Text style={styles.loginLinkText}>Faça login</Text>
              </Text>
            </AnimatedTouchableOpacity>
          </View>
        </AnimatedView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.neon.aqua} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    position: 'relative',
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.pearl,
    marginBottom: 8,
    textShadowColor: colors.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: colors.slate[700],
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[600],
  },
  roleButtonSelected: {
    backgroundColor: colors.neon.aqua,
    borderColor: colors.neon.aqua,
  },
  roleText: {
    color: colors.slate[300],
    fontSize: 14,
    fontWeight: '600',
  },
  roleTextSelected: {
    color: colors.noir,
    fontWeight: '700',
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
  error: {
    color: colors.state.error,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  success: {
    color: colors.state.success,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});