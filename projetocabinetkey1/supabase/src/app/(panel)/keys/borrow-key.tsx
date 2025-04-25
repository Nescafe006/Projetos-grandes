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
    user_id: string | null;
    borrower_name?: string | null;
};

export default function BorrowKey() {
    const [keys, setKeys] = useState<Key[]>([]);
    const [loading, setLoading] = useState(false);
    const [borrowing, setBorrowing] = useState<string | null>(null);
    const [returning, setReturning] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [filter, setFilter] = useState<'all' | 'available' | 'borrowed'>('all');
    const [isEditing, setIsEditing] = useState(false);
    const [editKey, setEditKey] = useState<Key | null>(null);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const loadUserAndKeys = async () => {
        setLoading(true);
        try {
            // Obter usuário autenticado
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Erro ao obter usuário:', userError?.message || 'Usuário não encontrado');
                throw new Error('Usuário não autenticado.');
            }
            setUserId(user.id);
            console.log('Usuário autenticado:', user.id);

            // Verificar se o usuário é administrador
            const { data: profile, error: profileError } = await supabase
                .from('usuario')
                .select('tipo_usuario')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Erro ao obter perfil:', profileError.message);
                // Tratar como não-administrador se o perfil não existir
                setIsAdmin(false);
            } else {
                setIsAdmin(profile.tipo_usuario === 'administrador');
                console.log('É administrador:', profile.tipo_usuario === 'administrador');
            }

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

            console.log('Chaves carregadas:', JSON.stringify(formattedKeys, null, 2));
            setKeys(formattedKeys || []);
        } catch (error) {
            console.error('Erro geral ao carregar chaves:', error);
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar as chaves. Verifique sua conexão ou contate o suporte.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserAndKeys();
    }, []);

    const handleBorrowKey = async (keyId: string) => {
        setBorrowing(keyId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { data: key, error: keyError } = await supabase
                .from('keys')
                .select('id, name, status, user_id')
                .eq('id', keyId)
                .single();

            if (keyError) {
                console.error('Erro ao verificar chave:', keyError.message);
                throw new Error(`Falha ao verificar chave: ${keyError.message}`);
            }
            console.log('Chave verificada:', key);
            if (key.status !== 'available' || (key.user_id && key.user_id !== user.id)) {
                throw new Error('Esta chave não está disponível para empréstimo.');
            }

            Alert.alert(
                'Confirmação',
                `Tem certeza que deseja pegar a chave "${key.name || 'sem nome'}"?`,
                [
                    { text: 'Não', style: 'cancel', onPress: () => setBorrowing(null) },
                    {
                        text: 'Sim',
                        onPress: async () => {
                            const { error: updateError } = await supabase
                                .from('keys')
                                .update({ status: 'borrowed', user_id: user.id })
                                .eq('id', keyId);

                            if (updateError) {
                                console.error('Erro ao atualizar chave:', updateError.message);
                                throw new Error(`Falha ao atualizar chave: ${updateError.message}`);
                            }

                            const { error: loanError } = await supabase
                                .from('loans')
                                .insert({
                                    key_id: keyId,
                                    user_id: user.id,
                                    borrowed_at: new Date().toISOString(),
                                    status: 'active',
                                });

                            if (loanError) {
                                console.error('Erro ao registrar empréstimo:', loanError.message);
                                throw new Error(`Falha ao registrar empréstimo: ${loanError.message}`);
                            }

                            Alert.alert('Sucesso', `A chave "${key.name || 'sem nome'}" agora está na sua posse!`);
                            loadUserAndKeys();
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

    const handleReturnKey = async (keyId: string, keyName: string) => {
        setReturning(keyId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            const { data: key, error: keyError } = await supabase
                .from('keys')
                .select('id, name, status, user_id')
                .eq('id', keyId)
                .single();

            if (keyError) {
                console.error('Erro ao verificar chave:', keyError.message);
                throw new Error(`Falha ao verificar chave: ${keyError.message}`);
            }

            if (key.user_id !== user.id) {
                throw new Error('Você não pode devolver esta chave, pois não é o usuário que a pegou.');
            }

            Alert.alert(
                'Confirmação',
                `Tem certeza que deseja devolver a chave "${key.name || 'sem nome'}"?`,
                [
                    { text: 'Não', style: 'cancel', onPress: () => setReturning(null) },
                    {
                        text: 'Sim',
                        onPress: async () => {
                            const { error: updateError } = await supabase
                                .from('keys')
                                .update({ status: 'available', user_id: null })
                                .eq('id', keyId);

                            if (updateError) {
                                console.error('Erro ao atualizar chave:', updateError.message);
                                throw new Error(`Falha ao atualizar chave: ${updateError.message}`);
                            }

                            const { error: loanError } = await supabase
                                .from('loans')
                                .update({ status: 'returned', returned_at: new Date().toISOString() })
                                .eq('key_id', keyId)
                                .eq('user_id', user.id)
                                .eq('status', 'active');

                            if (loanError) {
                                console.error('Erro ao atualizar empréstimo:', loanError.message);
                                throw new Error(`Falha ao atualizar empréstimo: ${loanError.message}`);
                            }

                            Alert.alert('Sucesso', `A chave "${key.name || 'sem nome'}" foi devolvida com sucesso!`);
                            loadUserAndKeys();
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao devolver a chave.');
        } finally {
            setReturning(null);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        try {
            const { error } = await supabase.from('keys').delete().eq('id', keyId);
            if (error) throw new Error(`Falha ao excluir chave: ${error.message}`);
            Alert.alert('Sucesso', 'Chave excluída com sucesso!');
            loadUserAndKeys();
        } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao excluir a chave.');
        }
    };

    const handleEditKey = async () => {
        if (!editKey) return;

        const updatedKey = {
            name: newName || editKey.name,
            description: newDescription || editKey.description,
        };

        try {
            const { error } = await supabase
                .from('keys')
                .update(updatedKey)
                .eq('id', editKey.id);

            if (error) throw new Error(`Falha ao atualizar chave: ${error.message}`);
            Alert.alert('Sucesso', 'Chave atualizada com sucesso!');
            setIsEditing(false);
            loadUserAndKeys();
        } catch (error) {
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao atualizar a chave.');
        }
    };

    const filteredKeys = keys.filter((key) => {
        if (filter === 'all') return true;
        return key.status === filter;
    });

    const renderKeyItem = ({ item }: { item: Key }) => {
        if (!item) return null;
        const isOwner = userId === item.user_id;
        const statusColor = item.status === 'available' ? colors.neon.aqua : colors.slate[500];
        const isBorrowable = !isOwner && item.status === 'available' && borrowing !== item.id;
        const isReturnable = isOwner && item.status === 'borrowed' && returning !== item.id;

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
                        {item.description && (
                            <Text style={styles.keyDescription}>{item.description}</Text>
                        )}
                        <Text style={[styles.keyStatus, { color: statusColor }]}>
                            Status: {item.status === 'available' ? 'Disponível' : isOwner ? 'A chave foi pega por você' : `A chave está na posse do usuário ${item.borrower_name || 'usuário desconhecido'}`}
                        </Text>
                    </View>
                    <View style={styles.actionButtons}>
                        {borrowing === item.id || returning === item.id ? (
                            <ActivityIndicator color={colors.pearl} />
                        ) : (
                            <>
                                {isBorrowable && (
                                    <TouchableOpacity onPress={() => handleBorrowKey(item.id)}>
                                        <Ionicons name="swap-horizontal" size={24} color={colors.neon.aqua} />
                                    </TouchableOpacity>
                                )}
                                {isReturnable && (
                                    <TouchableOpacity onPress={() => handleReturnKey(item.id, item.name)}>
                                        <Ionicons name="return-up-back" size={24} color={colors.neon.aqua} />
                                    </TouchableOpacity>
                                )}
                                {isAdmin && (
                                    <TouchableOpacity onPress={() => {
                                        setEditKey(item);
                                        setNewName(item.name || '');
                                        setNewDescription(item.description || '');
                                        setIsEditing(true);
                                    }}>
                                        <Ionicons name="create" size={24} color={colors.slate[500]} />
                                    </TouchableOpacity>
                                )}
                                {isAdmin && (
                                    <TouchableOpacity onPress={() => {
                                        Alert.alert(
                                            'Confirmação',
                                            'Você tem certeza que deseja excluir esta chave?',
                                            [
                                                { text: 'Cancelar', style: 'cancel' },
                                                { text: 'Excluir', onPress: () => handleDeleteKey(item.id) },
                                            ]
                                        );
                                    }}>
                                        <Ionicons name="trash-bin" size={24} color={colors.slate[500]} />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </View>
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

            {isEditing ? (
                <View style={styles.editForm}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nome da chave"
                        value={newName}
                        onChangeText={setNewName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Descrição da chave"
                        value={newDescription}
                        onChangeText={setNewDescription}
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={handleEditKey}>
                        <Text style={styles.saveButtonText}>Salvar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
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
                </>
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
    editForm: {
        padding: 20,
        backgroundColor: colors.slate[800],
    },
    input: {
        height: 40,
        borderColor: colors.slate[500],
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: colors.pearl,
        backgroundColor: colors.slate[700],
        borderRadius: 5,
    },
    saveButton: {
        backgroundColor: colors.neon.aqua,
        padding: 10,
        borderRadius: 5,
    },
    saveButtonText: {
        color: colors.slate[900],
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 10,
        padding: 10,
        borderRadius: 5,
        backgroundColor: colors.slate[500],
    },
    cancelButtonText: {
        color: colors.pearl,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});