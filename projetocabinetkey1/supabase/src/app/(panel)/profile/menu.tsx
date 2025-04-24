import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
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
    const [activeTab, setActiveTab] = useState('profile');
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        avatarUrl: null,
        role: 'admin',
    });

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
                nome: '',
                avatar_url: '',
            };

            try {
                const { data: profile, error: profileError } = await supabase
                    .from('usuario')
                    .select('nome, avatar_url')
                    .eq('id', user.id) // Changed from user_id to id
                    .single();

                if (!profileError || profileError.code === 'PGRST116') {
                    profileData = profile || profileData;
                }
            } catch (dbError) {
                console.warn('Não foi possível carregar perfil:', dbError);
            }

            const params = {
                currentName: profileData.nome ||
                           user.user_metadata?.name ||
                           user.email?.split('@')[0] ||
                           'Administrador',
                           currentAvatar: profileData.avatar_url
                           ? `${profileData.avatar_url}?t=${Date.now()}`
                           : user.user_metadata?.avatar_url
                             ? `${user.user_metadata.avatar_url}?t=${Date.now()}`
                             : '',
                userId: user.id,
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
        Alert.alert('Suporte', 'Funcionalidade em desenvolvimento.');
    };

    const handleCheckKeys = () => {
        router.push('/(panel)/keys/page');
    };

    const handleGoHome = () => {
        router.push('/(panel)/profile/menu');
    };

    // Carregar detalhes do usuário ao montar o componente
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('usuario')
                        .select('nome, avatar_url, tipo_usuario') // Changed full_name to nome, role to tipo_usuario
                        .eq('id', user.id) // Changed from user_id to id
                        .single();

                    if (error) {
                        console.warn('Erro ao carregar perfil:', error);
                        setUserDetails({
                            fullName: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                            avatarUrl: user.user_metadata?.avatar_url || null,
                            role: user.user_metadata?.role || 'admin',
                        });
                    } else {
                        setUserDetails({
                            fullName: data.nome || user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
                            avatarUrl: data.avatar_url || user.user_metadata?.avatar_url || null,
                            role: data.tipo_usuario || 'admin',
                        });
                    }
                } catch (error) {
                    console.error('Erro geral ao carregar detalhes:', error);
                    setUserDetails({
                        fullName: user.email?.split('@')[0] || 'Administrador',
                        avatarUrl: null,
                        role: 'admin',
                    });
                }
            }
        };

        fetchUserDetails();
    }, [user]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoHome} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Meu Perfil</Text>
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
                    <Text style={styles.infoText}>ID: {user?.id}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.neon.aqua} />
                    <Text style={styles.infoText}>Conta {userDetails.role === 'admin' ? 'Usuário' : 'Padrão'}</Text>
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
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.slate[600],
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.slate[700],
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