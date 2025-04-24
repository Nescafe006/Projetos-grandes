import colors from '@/constants/colors';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { setAuth } = useAuth();

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
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.pearl} />
            </Pressable>
            <Text style={styles.logoText}>
              <Text style={{ color: colors.neon.lime }}>Cabinet</Text>
              <Text style={{ color: colors.pearl }}> key</Text>
            </Text>
            <Text style={styles.subtitle}>Criar uma conta</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                <TextInput
                  placeholder="Nome completo"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.neon.magenta} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.neon.gold} style={styles.inputIcon} />
                <TextInput
                  placeholder="Senha"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <View style={styles.roleSelector}>
              <Pressable
                style={[styles.roleButton, role === 'user' && styles.roleButtonSelected]}
                onPress={() => setRole('user')}
              >
                <Text style={[styles.roleText, role === 'user' && styles.roleTextSelected]}>
                  Usuário
                </Text>
              </Pressable>
              <Pressable
                style={[styles.roleButton, role === 'admin' && styles.roleButtonSelected]}
                onPress={() => setRole('admin')}
              >
                <Text style={[styles.roleText, role === 'admin' && styles.roleTextSelected]}>
                  Administrador
                </Text>
              </Pressable>
            </View>

            {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
            {successMsg && <Text style={styles.success}>{successMsg}</Text>}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.noir} />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </Pressable>

            <Pressable 
              style={styles.loginLink}
              onPress={() => router.replace('/(auth)/signin/login')}
            >
              <Text style={styles.loginText}>Já possui uma conta? <Text style={styles.loginLinkText}>Faça login</Text></Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.neon.aqua} />
        </View>
      )}
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
    borderRadius: 24,
    padding: 32,
    shadowColor: colors.neon.aqua,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.slate[400],
    fontSize: 16,
    marginBottom: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[700],
    borderRadius: 12,
    backgroundColor: colors.slate[700],
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.pearl,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  roleButton: {
    flex: 1,
    backgroundColor: colors.slate[700],
    borderRadius: 12,
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
    color: colors.pearl,
    fontSize: 14,
    fontWeight: '600',
  },
  roleTextSelected: {
    color: colors.noir,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.neon.lime,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: colors.glow.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.noir,
    fontSize: 16,
    fontWeight: '800',
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
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    color: colors.slate[400],
    fontSize: 14,
  },
  loginLinkText: {
    color: colors.neon.magenta,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});