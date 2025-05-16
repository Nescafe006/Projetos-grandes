// Adicione este componente em um novo arquivo app/panel/users/edit.tsx

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

export default function EditUserScreen() {
    const { id } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState({
        nome: '',
        email: ''
    });

    // Carrega os dados do usuário
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase
                    .from('usuario')
                    .select('nome, email')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setUser({
                        nome: data.nome || '',
                        email: data.email || ''
                    });
                }
            } catch (error) {
                Alert.alert('Erro', 'Falha ao carregar dados do usuário');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    // Atualiza os dados do usuário
    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuario')
                .update({
                    nome: user.nome,
                    email: user.email
                })
                .eq('id', id);

            if (error) throw error;
            
            Alert.alert('Sucesso', 'Dados do usuário atualizados!');
            router.back();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao atualizar usuário');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.neon.aqua} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: 'Editar Usuário',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                        </TouchableOpacity>
                    ),
                    headerStyle: {
                        backgroundColor: colors.slate[800],
                    },
                    headerTintColor: colors.pearl,
                }} 
            />

            <View style={styles.formContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Nome"
                    value={user.nome}
                    onChangeText={(text) => setUser({...user, nome: text})}
                    placeholderTextColor={colors.slate[500]}
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={user.email}
                    onChangeText={(text) => setUser({...user, email: text})}
                    placeholderTextColor={colors.slate[500]}
                    keyboardType="email-address"
                />
                
                <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.pearl} />
                    ) : (
                        <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[900],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formContainer: {
        padding: 20,
    },
    input: {
        height: 50,
        borderColor: colors.slate[600],
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
        color: colors.pearl,
        backgroundColor: colors.slate[700],
        borderRadius: 8,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: colors.neon.aqua,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: colors.slate[900],
        fontWeight: 'bold',
        fontSize: 16,
    },
});