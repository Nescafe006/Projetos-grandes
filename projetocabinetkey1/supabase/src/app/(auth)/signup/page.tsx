import colors from '@/constants/colors';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Platform } from 'react-native';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSignup = async () => {
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) {
            Alert.alert('Erro', error.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        router.replace('/(auth)/signin/page' as Href);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[900] }}>
            <ScrollView style={{ flex: 1 }}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                        </Pressable>
                        <Text style={styles.logoText}>
                            <Text style={{ color: colors.neon.lime }}>Cabinet key</Text>
                        </Text>
                        <Text style={styles.slogan}>Criar uma conta</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput
                                placeholder="Digite seu nome completo..."
                                placeholderTextColor={colors.slate[500]}
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                placeholder="Digite seu email..."
                                placeholderTextColor={colors.slate[500]}
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Senha</Text>
                            <TextInput
                                placeholder="Digite sua senha..."
                                placeholderTextColor={colors.slate[500]}
                                style={styles.input}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

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
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[900],
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: Platform.OS === 'ios' ? 60 : 40,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 10,
    },
    slogan: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.neon.aqua,
        textAlign: 'center',
        marginBottom: 30,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    formContainer: {
        backgroundColor: colors.slate[700],
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 30,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        color: colors.neon.lime,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.slate[700],
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.pearl,
        borderWidth: 1,
        borderColor: colors.slate[500],
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
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: colors.noir,
        fontSize: 16,
        fontWeight: '800',
    },
    error: {
        color: colors.state.error,
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
    },
});