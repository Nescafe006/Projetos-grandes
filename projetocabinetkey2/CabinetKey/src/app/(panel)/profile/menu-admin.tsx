import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, Animated } from 'react-native';
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/contexts/AuthContext';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';


export default function Profile() {
    const { setAuth, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        avatarUrl: null,
        role: 'admin'
    });
    const [fadeAnim] = useState(new Animated.Value(0));
    const [notificationCount, setNotificationCount] = useState(0);

    // Função para buscar notificações de chaves atrasadas
    const fetchNotifications = useCallback(async () => {
        if (user?.role === 'administrador') {
            try {
                const { count, error } = await supabase
                    .from('loans')
                    .select('*', { count: 'exact' })
                    .eq('status', 'overdue');
                
                if (error) throw error;
                setNotificationCount(count || 0);
            } catch (error) {
                console.error('Erro ao buscar notificações:', error);
            }
        }
    }, [user]);

    // Configurar real-time para atualizar notificações
    useEffect(() => {
        fetchNotifications();
        
        const channel = supabase
            .channel('overdue-loans')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'loans',
                filter: 'status=eq.overdue'
            }, () => fetchNotifications())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchNotifications]);

    const handleSignout = useCallback(async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setAuth(null);
            router.push('/(auth)/signin/login');
        } catch (error: unknown) {
            if (error instanceof Error) {
                Alert.alert(
                    'Erro',
                    error.message || 'Erro ao sair da conta. Por favor, tente novamente.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    }, [setAuth, router]);

    const handleEditProfile = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.error('Falha na autenticação:', authError);
                throw new Error(authError?.message || 'Sessão inválida');
            }

            let profileData = {
                full_name: '',
                avatar_url: '',
                username: ''
            };

            try {
                const { data: profile, error: profileError } = await supabase
                    .from('usuario')
                    .select('full_name, avatar_url, username')
                    .eq('user_id', user.id)
                    .single();

                if (!profileError || profileError.code === 'PGRST116') {
                    profileData = profile || profileData;
                }
            } catch (dbError) {
                console.warn('Não foi possível carregar perfil:', dbError);
            }

            const params = {
                currentName: profileData.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'Administrador',
                currentAvatar: profileData.avatar_url || 
                             user.user_metadata?.avatar_url || 
                             '',
                currentUsername: profileData.username || '',
                userId: user.id
            };

            console.log('Navegando com params:', params);
            router.push({ pathname: '/(panel)/profile/edit-profile', params });
        } catch (error) {
            console.error('Falha crítica:', error);
            Alert.alert(
                'Erro', 
                error instanceof Error ? error.message : 'Falha desconhecida',
                [{ text: 'OK', onPress: () => router.push('/(panel)/profile/menu-admin') }]
            );
        }
    };

    const handleContactSupport = async () => {
        router.push('/(panel)/profile/suporte');
    };

    const handleCheckKeys = () => {
        router.push('/(panel)/keys/chave-admin');
    };

 useEffect(() => {
    const fetchUserDetails = async () => {
        if (user) {
            try {
                const { data, error } = await supabase
                    .from('usuario')
                    .select('nome, avatar_url, tipo_usuario') // Corrigido: full_name -> nome, role -> tipo_usuario
                    .eq('id', user.id) // Corrigido: user_id -> id
                    .single();

                if (error) {
                    console.warn('Erro ao carregar perfil:', error);
                    setUserDetails({
                        fullName: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                        avatarUrl: user.user_metadata?.avatar_url || null,
                        role: user.user_metadata?.tipo_usuario || 'admin' // Ajustado para tipo_usuario
                    });
                } else {
                    setUserDetails({
                        fullName: data.nome || user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
                        avatarUrl: data.avatar_url || user.user_metadata?.avatar_url || null,
                        role: data.tipo_usuario || 'admin' // Ajustado para tipo_usuario
                    });
                }
            } catch (error) {
                console.error('Erro geral ao carregar detalhes:', error);
                setUserDetails({
                    fullName: user.email?.split('@')[0] || 'Administrador',
                    avatarUrl: null,
                    role: 'admin'
                });
            }
        }
    };

    fetchUserDetails();
}, [user]);
    // Animar a transição de opacidade ao carregar os dados
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [userDetails]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meu Perfil</Text>
                
                {/* Ícone de notificações */}
                {userDetails.role === 'admin' && (
                    <TouchableOpacity 
                        style={styles.notificationIcon}
                        onPress={() => router.push('/(panel)/notifications')}
                    >
                        <Ionicons name="notifications" size={24} color={colors.pearl} />
                      
                         
                        
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.avatarContainer}>
                <View style={styles.avatarWrapper}>
                    {userDetails.avatarUrl ? (
                        <Image 
                            source={{ uri: userDetails.avatarUrl }} 
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={48} color={colors.neon.aqua} />
                        </View>
                    )}
                </View>
                <Text style={styles.userName}>{userDetails.fullName}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                    <Ionicons name="id-card" size={20} color={colors.neon.aqua} />
                    <Text style={styles.infoText}>ID: {user?.id.substring(0, 8)}...</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.neon.aqua} />
                    <Text style={styles.infoText}>Conta {userDetails.role === 'admin' ? 'Administrativa' : 'de Admnistrador'}</Text>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                    <Ionicons name="create" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Editar Perfil</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleCheckKeys}>
                    <Ionicons name="key" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Minhas Chaves</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
                    <Ionicons name="help-circle" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Suporte</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleSignout}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={colors.pearl} />
                ) : (
                    <>
                        <Ionicons name="log-out" size={20} color={colors.pearl} />
                        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
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
        justifyContent: 'center',
        backgroundColor: colors.slate[800],
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[700],
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.pearl,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    notificationIcon: {
        position: 'absolute',
        right: 20,
        top: Platform.OS === 'ios' ? 50 : 30,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
    },
    avatarContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: colors.neon.aqua,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neon.aqua,
        backgroundColor: colors.slate[700],
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.pearl,
        marginTop: 10,
    },
    userEmail: {
        fontSize: 16,
        color: colors.slate[400],
        marginTop: 4,
    },
    infoCard: {
        backgroundColor: colors.slate[700],
        borderRadius: 12,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.slate[600],
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: colors.slate[300],
        marginLeft: 10,
    },
    menuContainer: {
        backgroundColor: colors.slate[700],
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.slate[600],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[600],
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.pearl,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.slate[500],
        paddingVertical: 12,
        borderRadius: 10,
        marginHorizontal: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: colors.state.error,
    },
    logoutButtonText: {
        color: colors.pearl,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});