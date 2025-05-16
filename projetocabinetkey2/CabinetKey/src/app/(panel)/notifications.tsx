import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/contexts/AuthContext';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { Stack, useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOverdueLoans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('loans')
                .select(`
                    id,
                    status,
                    borrowed_at,
                    key:keys(id, name),
                    user:usuario(id, nome, email)
                `)
                .eq('status', 'overdue')
                .order('borrowed_at', { ascending: false });

            if (error) throw error;
            setOverdueLoans(data || []);
        } catch (error) {
            console.error('Erro ao buscar empréstimos atrasados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverdueLoans();
        
        const channel = supabase
            .channel('overdue-loans')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'loans'
            }, () => fetchOverdueLoans())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOverdueLoans();
        setRefreshing(false);
    };

    const handleKeyPress = (keyId: string) => {
        router.push(`/(panel)/keys/borrow-key?id=${keyId}`);
    };

    const renderItem = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.notificationItem}
            onPress={() => handleKeyPress(item.key.id)}
        >
            <View style={styles.notificationIcon}>
                <Ionicons name="warning" size={24} color={colors.state.error} />
            </View>
            <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                    Chave não devolvida: {item.key.name}
                </Text>
                <Text style={styles.notificationText}>
                    Usuário: {item.user.nome} ({item.user.email})
                </Text>
                <Text style={styles.notificationTime}>
                    Empréstimo em: {new Date(item.borrowed_at).toLocaleString('pt-BR')}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
        </TouchableOpacity>
    ), []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Notificações',
                headerTitleStyle: { color: colors.pearl },
                headerStyle: { backgroundColor: colors.slate[800] },
                headerTintColor: colors.pearl,
            }} />
            
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.neon.aqua} />
                </View>
            ) : overdueLoans.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.neon.aqua} />
                    <Text style={styles.emptyText}>Nenhum alerta pendente</Text>
                </View>
            ) : (
                <FlatList
                    data={overdueLoans}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: colors.pearl,
        marginTop: 16,
        fontSize: 16,
    },
    listContainer: {
        padding: 16,
    },
    notificationItem: {
        backgroundColor: colors.slate[700],
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationIcon: {
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        color: colors.pearl,
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    notificationText: {
        color: colors.slate[300],
        fontSize: 14,
        marginBottom: 4,
    },
    notificationTime: {
        color: colors.slate[400],
        fontSize: 12,
    },
});