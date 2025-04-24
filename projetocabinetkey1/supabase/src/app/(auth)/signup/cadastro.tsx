import colors from '@/constants/colors';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
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
      console.error('Erro ao verificar limite de administradores:', error.message, error.code);
      throw new Error('Falha ao verificar limite de administradores.');
    }

    return count || 0;
  };

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg('Por favor, insira um email válido.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (role === 'admin') {
        const adminCount = await checkAdminLimit();
        console.log('Número de administradores:', adminCount);
        if (adminCount >= 2) {
          setErrorMsg('Limite de administradores atingido. Você só pode se cadastrar como usuário normal.');
          setLoading(false);
          return;
        }
      }

      console.log('Iniciando cadastro com email:', email);
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            role: role,
          },
        },
      });

      if (error) {
        console.error('Erro no signUp:', error.message, error.code);
        throw error;
      }

      if (data.user) {
        console.log('Usuário cadastrado, inserindo perfil...');
        const { error: userError } = await supabase
          .from('usuario')
          .insert({
            id: data.user.id,
            nome: name,
            tipo_usuario: role === 'user' ? 'usuario' : 'administrador',
          });

        if (userError) {
          console.error('Erro ao inserir usuário:', userError.message, userError.code);
          throw new Error('Falha ao criar perfil do usuário.');
        }

        setAuth(data.user);

        setSuccessMsg('Cadastro realizado com sucesso!');
        setLoading(true);

        setTimeout(() => {
          router.replace('/(auth)/signin/login');
        }, 1000);
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Falha ao criar a conta.');
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
    logoText: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.pearl, // Softer white for logo
      marginBottom: 8,
      textShadowColor: colors.glow.blue, // Bluish glow
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
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
    roleSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 12,
    },
    roleButton: {
      flex: 1,
      backgroundColor: colors.slate[700], // Darker button background
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.slate[600], // Subtle border
    },
    roleButtonSelected: {
      backgroundColor: colors.neon.aqua, // Bluish active state
      borderColor: colors.neon.aqua,
    },
    roleText: {
      color: colors.slate[300], // Softer gray
      fontSize: 14,
      fontWeight: '600',
    },
    roleTextSelected: {
      color: colors.noir, // Dark text for contrast
      fontWeight: '700',
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
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
  });