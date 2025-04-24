import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';

type Key = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    user_id: string | null; // Permitir null para chaves disponíveis
};

export default function BorrowKey() {
    const [keys, setKeys] = useState<Key[]>([]);
    const [loading, setLoading] = useState(false);
    const [borrowing, setBorrowing] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Carrega o usuário autenticado e as chaves
    const loadUserAndKeys = async () => {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Erro ao obter usuário:', userError);
                throw new Error('Usuário não autenticado.');
            }
            setUserId(user.id);
            console.log('Usuário autenticado:', user.id);

            // Carrega chaves do usuário e chaves disponíveis
            const { data, error } = await supabase
                .from('keys')
                .select('id, name, description, status, user_id')
                .or(`user_id.eq.${user.id},status.eq.available`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar chaves:', error);
                throw error;
            }
            console.log('Chaves carregadas:', data);
            setKeys(data || []);
        } catch (error) {
            console.error('Erro geral ao carregar chaves:', error);
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar as chaves.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserAndKeys();
    }, []);

    // Função para solicitar o empréstimo com confirmação
    const handleBorrowKey = async (keyId: string) => {
        setBorrowing(keyId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            // Verifica a disponibilidade da chave
            const { data: key, error: keyError } = await supabase
                .from('keys')
                .select('id, name, status, user_id')
                .eq('id', keyId)
                .single();

            if (keyError) {
                console.error('Erro ao verificar chave:', keyError);
                throw keyError;
            }
            console.log('Chave verificada:', key);
            if (key.status !== 'available' || (key.user_id && key.user_id !== user.id)) {
                throw new Error('Esta chave não está disponível para empréstimo.');
            }

            // Exibe o card de confirmação
            Alert.alert(
                'Confirmação',
                `Tem certeza que deseja pegar a chave "${key.name || 'sem nome'}"?`,
                [
                    { text: 'Não', style: 'cancel', onPress: () => setBorrowing(null) },
                    {
                        text: 'Sim',
                        onPress: async () => {
                            // Atualiza o status e associa ao usuário
                            const { error: updateError } = await supabase
                                .from('keys')
                                .update({ status: 'borrowed', user_id: user.id })
                                .eq('id', keyId);

                            if (updateError) {
                                console.error('Erro ao atualizar chave:', updateError);
                                throw updateError;
                            }

                            // Registra o empréstimo na tabela 'loans'
                            const { error: loanError } = await supabase
                                .from('loans')
                                .insert({
                                    key_id: keyId,
                                    user_id: user.id,
                                    borrowed_at: new Date().toISOString(),
                                    status: 'active',
                                });

                            if (loanError) {
                                console.error('Erro ao registrar empréstimo:', loanError);
                                throw loanError;
                            }

                            Alert.alert('Sucesso', `A chave "${key.name || 'sem nome'}" agora está na sua posse!`);
                            loadUserAndKeys(); // Recarrega as chaves
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao solicitar o empréstimo.');
        } finally {
            setBorrowing(null);
        }
    };

    // Função para devolver a chave
    const handleReturnKey = async (keyId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { data: key, error: keyError } = await supabase
                .from('keys')
                .select('status, user_id')
                .eq('id', keyId)
                .single();

            if (keyError) throw keyError;
            if (key.user_id !== user.id) {
                throw new Error('Você não pode devolver uma chave que não está em sua posse.');
            }

            // Atualiza o status para 'available' e remove o user_id
            const { error: updateError } = await supabase
                .from('keys')
                .update({ status: 'available', user_id: null })
                .eq('id', keyId);

            if (updateError) throw updateError;

            // Marca o empréstimo como retornado na tabela 'loans'
            const { error: loanError } = await supabase
                .from('loans')
                .update({ status: 'returned', returned_at: new Date().toISOString() })
                .eq('key_id', keyId)
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (loanError) throw loanError;

            Alert.alert('Sucesso', 'Chave devolvida com sucesso!');
            loadUserAndKeys(); // Recarrega as chaves
        } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao devolver a chave.');
        }
    };

    const renderKeyItem = ({ item }: { item: Key }) => {
        if (!item) return null;
        const isOwner = userId === item.user_id;
        const statusColor = item.status === 'available' ? colors.neon.aqua : colors.slate[500];
        const isClickable = !isOwner && item.status === 'available' && borrowing !== item.id;

        return (
            <TouchableOpacity
                style={styles.keyCard}
                onPress={() => isClickable && handleBorrowKey(item.id)}
                disabled={!isClickable}
            >
                <View style={[
                    styles.keyCardContent,
                    { backgroundColor: item.status === 'available' ? colors.slate[700] : colors.slate[600] }
                ]}>
                    <Ionicons
                        name={item.status === 'available' ? 'key' : 'lock-closed'}
                        size={32}
                        color={colors.pearl}
                    />
                    <View style={styles.keyInfo}>
                        <Text style={styles.keyName}>{item.name}</Text>
                        {item.description && (
                            <Text style={styles.keyDescription}>{item.description}</Text>
                        )}
                        <Text style={[styles.keyStatus, { color: statusColor }]}>
                            Status: {item.status === 'available' ? 'Disponível' : 'Emprestada por você'}
                        </Text>
                    </View>
                    {borrowing === item.id ? (
                        <ActivityIndicator color={colors.pearl} />
                    ) : isOwner ? (
                        <TouchableOpacity onPress={() => handleReturnKey(item.id)}>
                            <Ionicons name="return-up-back" size={24} color={colors.neon.aqua} />
                        </TouchableOpacity>
                    ) : item.status === 'available' ? (
                        <Ionicons name="swap-horizontal" size={24} color={colors.neon.aqua} />
                    ) : (
                        <Ionicons name="lock-closed" size={24} color={colors.slate[500]} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Empréstimo de Chave</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.neon.aqua} />
                </View>
            ) : keys.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="key-outline" size={48} color={colors.slate[500]} />
                    <Text style={styles.emptyText}>Você ainda não cadastrou nenhuma chave.</Text>
                </View>
            ) : (
                <FlatList
                    data={keys}
                    renderItem={renderKeyItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="key-outline" size={48} color={colors.slate[500]} />
                            <Text style={styles.emptyText}>Você ainda não cadastrou nenhuma chave.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[900],
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 30,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[800],
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[700],
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
        textShadowRadius: 5,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    keyCard: {
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: colors.glow.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    keyCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderWidth: 1,
        borderColor: colors.slate[600],
    },
    keyInfo: {
        flex: 1,
        marginHorizontal: 15,
    },
    keyName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.pearl,
    },
    keyDescription: {
        fontSize: 14,
        color: colors.slate[300],
        marginTop: 5,
    },
    keyStatus: {
        fontSize: 14,
        marginTop: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        color: colors.slate[500],
        textAlign: 'center',
        marginTop: 10,
    },
});