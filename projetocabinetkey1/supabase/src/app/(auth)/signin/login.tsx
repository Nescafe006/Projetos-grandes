import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity} from 'react-native';
import { Link, RelativePathString } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { router, Stack } from 'expo-router';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { navigateAfterLogin } from '@/lib/navigation';
import { useAuth } from '@/src/contexts/AuthContext';


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [userType, setUserType] = useState<'usuario' | 'administrador'>('usuario');
   
    

    async function handleSignIn() {
        if (!email || !password) {
          Alert.alert('Erro', 'Por favor, preencha todos os campos');
          return;
        }
      
        setLoading(true);
      
        try {
          const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      
          if (authError || !user) {
            throw new Error(authError?.message || 'Autenticação falhou');
          }
      
          const { data: profile, error: profileError } = await supabase
          .from('usuario')
          .select('id, tipo_usuario')
          .eq('id', user.id)
          .single();
          
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              const { error: insertError } = await supabase
                .from('usuario')
                .insert({
                  id: user.id,
                  nome: user.email?.split('@')[0] || 'Usuário',
                  tipo_usuario: userType,
                  ativo: true,
                });
      
              if (insertError) throw new Error('Não foi possível criar o perfil');
              
              return proceedWithLogin({ tipo_usuario: userType }, userType, router, user.id);
            }
            throw new Error('Erro ao buscar perfil: ' + profileError.message);
          }
      
          return proceedWithLogin(profile, userType, router, user.id);
        } catch (error) {
          console.error('Login error:', error);
          Alert.alert('Erro', error instanceof Error ? error.message : 'Falha no login');
        } finally {
          setLoading(false);
        }
    }
          
    function proceedWithLogin(
        profile: { tipo_usuario: string },
        selectedUserType: string,
        router: any,
        userId: string
      ) {
        if (selectedUserType === 'administrador' && profile.tipo_usuario !== 'administrador') {
          throw new Error('Você não tem permissões de administrador');
        }
      
        if (selectedUserType === 'usuario' && profile.tipo_usuario === 'administrador') {
          Alert.alert('Aviso', 'Você está logando como usuário normal. Selecione "Admin" para acessar o painel administrativo.');
        }
      
        navigateAfterLogin(profile.tipo_usuario as 'usuario' | 'administrador', router, userId);
      }

return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
    >
        <View style={styles.background} />
        
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.slogan}>Cabinet key</Text>
                <Text style={styles.subtitle}>Acesse sua conta</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor={colors.slate[500]}
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.neon.magenta} style={styles.inputIcon} />
                        <TextInput
                            placeholder="Senha"
                            placeholderTextColor={colors.slate[500]}
                            style={styles.input}
                            secureTextEntry={secureTextEntry}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity 
                            onPress={() => setSecureTextEntry(!secureTextEntry)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons 
                                name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
                                size={20} 
                                color={colors.neon.gold} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.userTypeSelector}>
                    <TouchableOpacity
                        style={[styles.userTypeButton, userType === 'usuario' && styles.userTypeActive]}
                        onPress={() => setUserType('usuario')}
                    >
                        <Text style={[styles.userTypeText, userType === 'usuario' && styles.userTypeActiveText]}>
                            Usuário
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.userTypeButton, userType === 'administrador' && styles.userTypeActive]}
                        onPress={() => setUserType('administrador')}
                    >
                        <Text style={[styles.userTypeText, userType === 'administrador' && styles.userTypeActiveText]}>
                            Admin
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSignIn}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.gradients.galaxy[0]} />
                    ) : (
                        <Text style={styles.buttonText}>Acessar</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                    <Link href="/(auth)/signin/esqueceu-senha" asChild>
                        <TouchableOpacity>
                            <Text style={styles.linkText}>Esqueceu sua senha?</Text>
                        </TouchableOpacity>
                    </Link>
                    
                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Ainda não possui uma conta?</Text>
                        <Link href="/(auth)/signup/cadastro" asChild>
                            <TouchableOpacity>
                                <Text style={styles.signupLink}>Cadastre-se</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </View>
    </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
},
background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir,
},
card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.slate[900],
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
},
slogan: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neon.aqua,
    textAlign: 'center',
    textShadowColor: colors.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
    marginBottom: 20,
},
inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[700],
    borderRadius: 12,
    backgroundColor: colors.slate[800],
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
eyeIcon: {
    padding: 8,
    marginLeft: 8,
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
linksContainer: {
    marginTop: 24,
    alignItems: 'center',
},
linkText: {
    color: colors.neon.magenta,
    fontSize: 14,
    marginBottom: 16,
},
signupContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[700],
    width: '100%',
},
signupText: {
    color: colors.slate[500],
    fontSize: 14,
},
signupLink: {
    color: colors.neon.magenta,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
    textShadowColor: colors.glow.pink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
},
userTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
},
userTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[700],
},
userTypeActive: {
    backgroundColor: colors.neon.aqua,
    borderColor: colors.neon.aqua,
},
userTypeText: {
    color: colors.slate[500],
    fontWeight: '600',
},
userTypeActiveText: {
    color: colors.noir,
    fontWeight: '700',
},
});