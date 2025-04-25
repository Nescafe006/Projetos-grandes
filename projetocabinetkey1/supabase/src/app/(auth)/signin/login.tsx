import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { router, Stack } from 'expo-router';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { navigateAfterLogin } from '@/lib/navigation';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

const CustomAlert = ({
  visible,
  title,
  message,
  type,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) => {
  if (!visible) return null;

  return (
    <Animated.View 
      style={[styles.alertContainer, type === 'success' ? styles.alertSuccess : styles.alertError]}
      entering={FadeInUp.duration(300)}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <Ionicons 
            name={type === 'success' ? 'checkmark-circle' : 'close-circle'} 
            size={24} 
            color={type === 'success' ? colors.green[400] : colors.red[400]} 
          />
        </View>
        <Text style={styles.alertTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.alertCloseButton}>
          <Ionicons name="close" size={20} color={colors.slate[400]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.alertMessage}>{message}</Text>
    </Animated.View>
  );
};

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [userType, setUserType] = useState<'usuario' | 'administrador'>('usuario');
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error'>('success');
    
    const AnimatedView = Animated.View;
    const AnimatedText = Animated.Text;
    
    const showAlert = (title: string, message: string, type: 'success' | 'error') => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setAlertVisible(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    };

    const hideAlert = () => {
      setAlertVisible(false);
    };

    async function handleSignIn() {
        if (!email || !password) {
            showAlert('Erro', 'Por favor, preencha todos os campos', 'error');
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
                .select('id, tipo_usuario, avatar_url')
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
                            avatar_url: null,
                        });

                    if (insertError) throw new Error('Não foi possível criar o perfil');

                    showAlert('Login realizado', 'Você entrou com sucesso. Seja bem-vindo!', 'success')
                    return proceedWithLogin({ tipo_usuario: userType, avatar_url: null }, userType, router, user.id);
                }
                throw new Error('Erro ao buscar perfil: ' + profileError.message);
            }

            showAlert('Login realizado', 'Você entrou com sucesso. Seja bem-vindo!', 'success')
            return proceedWithLogin(profile, userType, router, user.id);
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Erro', error instanceof Error ? error.message : 'Falha no login', 'error');
        } finally {
            setLoading(false);
        }
    }

    function proceedWithLogin(
        profile: { tipo_usuario: string, avatar_url: string | null },
        selectedUserType: string,
        router: any,
        userId: string
    ) {
        if (selectedUserType === 'administrador' && profile.tipo_usuario !== 'administrador') {
            throw new Error('Você não tem permissões de administrador');
        }

        if (selectedUserType === 'usuario' && profile.tipo_usuario === 'administrador') {
            showAlert('Aviso', 'Você está logando como usuário normal. Selecione "Admin" para acessar o painel administrativo.', 'error');
        }

        navigateAfterLogin(profile.tipo_usuario as 'usuario' | 'administrador', router, userId);
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.background} />

            <AnimatedView
                entering={SlideInRight.duration(500)}
                style={styles.card}
            >
                <View style={styles.cardHeader}>
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <AnimatedText
                        entering={FadeInUp.duration(600)}
                        style={styles.slogan}
                    >
                        Cabinet key
                    </AnimatedText>
                    <AnimatedText
                        entering={FadeInUp.duration(600).delay(100)}
                        style={styles.subtitle}
                    >
                        Acesse sua conta
                    </AnimatedText>
                </View>

                <View style={styles.form}>
                    <AnimatedView
                        entering={FadeInDown.duration(600).delay(200)}
                        style={styles.inputContainer}
                    >
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
                    </AnimatedView>

                    <AnimatedView
                        entering={FadeInDown.duration(600).delay(300)}
                        style={styles.inputContainer}
                    >
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
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
                                    color={colors.neon.aqua}
                                />
                            </TouchableOpacity>
                        </View>
                    </AnimatedView>

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
            </AnimatedView>

            <CustomAlert 
              visible={alertVisible}
              title={alertTitle}
              message={alertMessage}
              type={alertType}
              onClose={hideAlert}
            />
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
    logo: {
        width: 200,
        height: 80,
        marginBottom: 12,
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
    eyeIcon: {
        padding: 8,
        marginLeft: 8,
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
    linksContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: colors.neon.aqua,
        fontSize: 14,
        marginBottom: 12,
    },
    signupContainer: {
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.slate[600],
        width: '100%',
    },
    signupText: {
        color: colors.slate[400],
        fontSize: 14,
    },
    signupLink: {
        color: colors.neon.aqua,
        fontWeight: '600',
        fontSize: 14,
        marginTop: 6,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    },
    userTypeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 12,
    },
    userTypeButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.slate[600],
        backgroundColor: colors.slate[700],
    },
    userTypeActive: {
        backgroundColor: colors.neon.aqua,
        borderColor: colors.neon.aqua,
    },
    userTypeText: {
        color: colors.slate[300],
        fontWeight: '600',
    },
    userTypeActiveText: {
        color: colors.noir,
        fontWeight: '700',
    },
    alertContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.slate[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 100,
    },
    alertSuccess: {
        backgroundColor: colors.blue[800],
        borderLeftWidth: 4,
        borderLeftColor: colors.green[400],
    },
    alertError: {
        backgroundColor: colors.blue[800],
        borderLeftWidth: 4,
        borderLeftColor: colors.red[400],
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertIconContainer: {
        marginRight: 10,
    },
    alertTitle: {
        color: colors.pearl,
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    alertCloseButton: {
        padding: 4,
    },
    alertMessage: {
        color: colors.slate[300],
        fontSize: 14,
        lineHeight: 20,
    },
});