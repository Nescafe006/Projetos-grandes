import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity} from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    async function handleSignIn() {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) throw error;
            
            router.replace('/(panel)/profile/page');
        } catch (error) {
            Alert.alert('Erro', (error as Error).message || 'Falha ao fazer login. Verifique suas credenciais.');
          } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
               
                <Text style={styles.slogan}>Gerenciamento de chaves inteligente</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Digite seu email"
                                placeholderTextColor={colors.neon.magenta}
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
                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.neon.magenta} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Digite sua senha"
                                placeholderTextColor={colors.neon.magenta}
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

                    <Link href="/(auth)/forgot-password" asChild>
                        <TouchableOpacity>
                            <Text style={styles.forgotPassword}>Esqueceu sua senha?</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Ainda não possui uma conta?</Text>
                    <Link href="/(auth)/signup/page" asChild>
                        <TouchableOpacity>
                            <Text style={styles.signupLink}>Cadastre-se</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.noir,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    slogan: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.neon.aqua,
        textAlign: 'center',
        lineHeight: 36,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    formContainer: {
        flex: 1,
        backgroundColor: colors.slate[900],
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 40,
        paddingHorizontal: 24,
        paddingBottom: 30,
        borderWidth: 1,
        borderColor: colors.slate[700],
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        color: colors.pearl,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.slate[700],
        borderRadius: 12,
        backgroundColor: colors.slate[700],
    },
    inputIcon: {
        marginLeft: 16,
        color: colors.slate[500],
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.pearl,
    },
    eyeIcon: {
        padding: 16,
    },
    button: {
        backgroundColor: colors.neon.lime,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
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
    forgotPassword: {
        color: colors.slate[500],
        textAlign: 'center',
        marginTop: 16,
        fontSize: 14,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.slate[700],
        paddingTop: 24,
        alignItems: 'center',
    },
    footerText: {
        color: colors.slate[500],
        fontSize: 14,
    },
    signupLink: {
        color: colors.neon.magenta,
        fontWeight: '700',
        fontSize: 14,
        marginTop: 4,
        textShadowColor: colors.glow.pink,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
});