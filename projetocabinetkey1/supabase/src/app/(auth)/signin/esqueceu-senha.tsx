import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

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
                
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <TouchableOpacity 
                            style={styles.backButton}
                            onPress={() => router.replace('/(auth)/signin/login')}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                        </TouchableOpacity>
                        <Text style={styles.slogan}>Cabinet key</Text>
                        <Text style={styles.subtitle}>Recuperar senha</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Digite seu email"
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

                        <TouchableOpacity 
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handlePasswordReset}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.noir} />
                            ) : (
                                <Text style={styles.buttonText}>Enviar link</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.loginLink}
                            onPress={() => router.replace('/(auth)/signin/login')}
                        >
                            <Text style={styles.loginText}>Lembrou a senha? <Text style={styles.loginLinkText}>Volte ao login</Text></Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
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
        marginBottom: 24,
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
});