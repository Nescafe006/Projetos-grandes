import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function RegisterKey() {
    const [keyName, setKeyName] = useState('');
    const [keyDescription, setKeyDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegisterKey = async () => {
        if (!keyName) {
            Alert.alert('Erro', 'Por favor, insira o nome da chave.');
            return;
        }
    
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');
    
            const { data, error } = await supabase
                .from('keys')
                .insert({
                    name: keyName,
                    description: keyDescription,
                    user_id: user.id,
                    status: 'available', // Status inicial da chave
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();
    
            if (error) throw error;
    
            console.log('Chave criada:', data); // Log para verificar o status
    
            Alert.alert('Sucesso', 'Chave cadastrada com sucesso!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            setKeyName('');
            setKeyDescription('');
        } catch (error) {
            console.error('Erro ao cadastrar chave:', error);
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao cadastrar a chave.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cadastrar Chave</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Ionicons name="key" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome da Chave"
                        placeholderTextColor={colors.slate[500]}
                        value={keyName}
                        onChangeText={setKeyName}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="document-text" size={20} color={colors.neon.aqua} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Descrição (opcional)"
                        placeholderTextColor={colors.slate[500]}
                        value={keyDescription}
                        onChangeText={setKeyDescription}
                        multiline
                        numberOfLines={4}
                        autoCapitalize="sentences"
                    />
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleRegisterKey}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.pearl} />
                    ) : (
                        <View style={styles.submitButtonContent}>
                            <Ionicons name="add-circle" size={20} color={colors.neon.aqua} />
                            <Text style={styles.submitButtonText}>Cadastrar Chave</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[900], // Fundo escuro principal
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 30,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[800], // Fundo do header mais escuro
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[700], // Borda sutil
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.pearl,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5, // Efeito sutil
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[700],
        borderRadius: 12,
        marginBottom: 20,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: colors.slate[600], // Borda mais clara
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: colors.pearl,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 10,
    },
    submitButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 20,
        backgroundColor: colors.slate[600], // Fundo sólido
        borderWidth: 1,
        borderColor: colors.slate[500], // Borda sutil
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.pearl,
        marginLeft: 10,
    },
});