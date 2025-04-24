import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
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
    const [filter, setFilter] = useState<'all' | 'available' | 'borrowed'>('all');

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
                .or(`user_id.eq.${user.id},status.eq.available`) // Ajuste na consulta
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

    // Filtra as chaves com base no filtro
    const filteredKeys = keys.filter((key) => {
        if (filter === 'all') return true;
        return key.status === filter;
    });

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
                <View style={[styles.keyCardContent, { backgroundColor: item.status === 'available' ? colors.slate[700] : colors.slate[600] }]} >
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
                        <Text style={[styles.keyStatus, { color: statusColor }]}>{item.status === 'available' ? 'Disponível' : 'Emprestada por você'}</Text>
                    </View>
                    {borrowing === item.id ? (
                        <ActivityIndicator color={colors.pearl} />
                    ) : (
                        item.status === 'available' && (
                            <Ionicons name="swap-horizontal" size={24} color={colors.neon.aqua} />
                        )
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

            <View style={styles.filterContainer}>
                <TouchableOpacity onPress={() => setFilter('all')}>
                    <Text style={[styles.filterText, filter === 'all' && styles.activeFilter]}>Todas</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilter('available')}>
                    <Text style={[styles.filterText, filter === 'available' && styles.activeFilter]}>Disponíveis</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilter('borrowed')}>
                    <Text style={[styles.filterText, filter === 'borrowed' && styles.activeFilter]}>Emprestadas</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color={colors.pearl} size="large" />
            ) : (
                <FlatList
                    data={filteredKeys}
                    renderItem={renderKeyItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
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
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.slate[800],
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        color: colors.pearl,
        fontWeight: 'bold',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: colors.slate[800],
    },
    filterText: {
        color: colors.pearl,
        fontSize: 16,
        fontWeight: '600',
    },
    activeFilter: {
        color: colors.neon.aqua,
        textDecorationLine: 'underline',
    },
    keyCard: {
        padding: 15,
        margin: 10,
        backgroundColor: colors.slate[700],
        borderRadius: 8,
    },
    keyCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    keyInfo: {
        flex: 1,
        marginLeft: 15,
    },
    keyName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.pearl,
    },
    keyDescription: {
        fontSize: 14,
        color: colors.pearl,
    },
    keyStatus: {
        fontSize: 14,
    },
    listContainer: {
        paddingBottom: 20,
    },
});
