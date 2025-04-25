import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';

type Key = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    user_id: string | null;
    borrower_name?: string | null;
};

export default function KeyHistory() {
    const [keys, setKeys] = useState<Key[]>([]);
    const [loading, setLoading] = useState(false);

    const loadKeys = async () => {
        setLoading(true);
        try {
            // Carregar todas as chaves
            const { data: keysData, error: keysError } = await supabase
                .from('keys')
                .select('id, name, description, status, user_id')
                .order('created_at', { ascending: false });

            if (keysError) {
                console.error('Erro ao carregar chaves:', keysError.message);
                throw new Error(`Falha ao carregar chaves: ${keysError.message}`);
            }

            // Obter nomes dos usuários para chaves emprestadas
            const userIds = [...new Set(keysData.filter(key => key.user_id).map(key => key.user_id))] as string[];
            let userNames: { [key: string]: string | null } = {};

            if (userIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('usuario')
                    .select('id, nome')
                    .in('id', userIds);

                if (usersError) {
                    console.error('Erro ao carregar nomes de usuários:', usersError.message);
                    // Continuar sem nomes, usando fallback
                } else {
                    userNames = Object.fromEntries(usersData.map(user => [user.id, user.nome]));
                }
            }

            // Mapear chaves com nomes dos usuários
            const formattedKeys = keysData.map((key) => ({
                ...key,
                borrower_name: key.user_id ? userNames[key.user_id] || 'usuário desconhecido' : null,
            }));

            console.log('Chaves carregadas:', formattedKeys);
            setKeys(formattedKeys || []);
        } catch (error) {
            console.error('Erro geral ao carregar chaves:', error);
            Alert.alert('Ops!', (error as Error).message || 'Falha ao carregar chaves.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKeys();
    }, []);

    const renderKeyItem = ({ item }: { item: Key }) => {
        const statusColor = item.status === 'available' ? colors.neon.aqua : colors.slate[500];

        return (
            <View style={styles.keyCard}>
                <View style={[styles.keyCardContent, { backgroundColor: item.status === 'available' ? colors.slate[700] : colors.slate[600] }]}>
                    <Ionicons
                        name={item.status === 'available' ? 'key' : 'lock-closed'}
                        size={32}
                        color={colors.pearl}
                    />
                    <View style={styles.keyInfo}>
                        <Text style={styles.keyName}>{item.name}</Text>
                        {item.description && <Text style={styles.keyDescription}>{item.description}</Text>}
                        <Text style={[styles.keyStatus, { color: statusColor }]}>
                            Status: {item.status === 'available' ? 'Disponível' : `Em posse de ${item.borrower_name || 'usuário desconhecido'}`}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Histórico de Chaves</Text>
            </View>

            {loading ? (
                <ActivityIndicator color={colors.pearl} size="large" />
            ) : (
                <FlatList
                    data={keys}
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
        padding: 20,
        backgroundColor: colors.slate[800],
    },
    headerTitle: {
        fontSize: 24,
        color: colors.pearl,
        fontWeight: 'bold',
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
