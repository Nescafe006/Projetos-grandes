import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/contexts/AuthContext';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

export default function Profile() {
    const { setAuth, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        avatarUrl: null,
        role: 'user'
    });

    
    const handleSignout = useCallback(async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                throw error;
            }
            
            setAuth(null);
           
            router.replace('/(auth)/signin/page'); 
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
            // 1. Verificação robusta de sessão
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                console.error('Falha na autenticação:', authError);
                throw new Error(authError?.message || 'Sessão inválida');
            }
    
            // 2. Obter perfil com fallback
            let profileData = {
                full_name: '',
                avatar_url: '',
                username: ''
            };
    
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url, username')
                    .eq('user_id', user.id)
                    .single();
    
                if (!profileError || profileError.code === 'PGRST116') { // "No rows found"
                    profileData = profile || profileData;
                }
            } catch (dbError) {
                console.warn('Não foi possível carregar perfil:', dbError);
            }
    
            // 3. Preparar parâmetros com fallbacks
            const params = {
                currentName: profileData.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'Usuário',
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
                [{ text: 'OK', onPress: () => router.push('/(panel)/profile/page') }] // Redireciona se for erro de auth
            );
        }
    };



    const handleContactSupport = async () => { /* ... */ };

    // Novas funcionalidades
    const handleCheckKeys = () => {
        setActiveTab('keys');
    };

    const handleViewReports = () => {
        setActiveTab('reports');
    };

    const handleGoHome = () => {
        router.replace('/(panel)/profile/page');
    };


    
        return (
            <View style={styles.container}>
                {/* Header com Gradiente */}
                <LinearGradient
                    colors={colors.gradients.cyberpunk}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <TouchableOpacity onPress={handleGoHome} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Meu Perfil</Text>
                </LinearGradient>
    
                {/* Área do Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarWrapper}>
                        {userDetails.avatarUrl ? (
                            <Image 
                                source={{ uri: userDetails.avatarUrl }} 
                                style={styles.avatar}
                            />
                        ) : (
                            <LinearGradient
                                colors={colors.gradients.tropical}
                                style={styles.avatarPlaceholder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="person" size={48} color={colors.pearl} />
                            </LinearGradient>
                        )}
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={20} color={colors.noir} />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.userName}>{userDetails.fullName || 'Usuário'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
    
                {/* Cards de Informação */}
                <View style={styles.infoCard}>
                    <View style={styles.infoItem}>
                        <Ionicons name="id-card" size={20} color={colors.neon.aqua} />
                        <Text style={styles.infoText}>ID: {user?.id}</Text>
                    </View>
                    
                    <View style={styles.infoItem}>
                        <Ionicons name="shield-checkmark" size={20} color={colors.neon.aqua} />
                        <Text style={styles.infoText}>Conta {userDetails.role === 'admin' ? 'Administrador' : 'Padrão'}</Text>
                    </View>
                </View>
    
                {/* Menu de Ações */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleEditProfile}
                    >
                        <LinearGradient
                            colors={colors.gradients.tropical}
                            style={styles.menuIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="create" size={20} color={colors.noir} />
                        </LinearGradient>
                        <Text style={styles.menuItemText}>Editar Perfil</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.slate[500]} />
                    </TouchableOpacity>
    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleCheckKeys}
                    >
                        <LinearGradient
                            colors={colors.gradients.sunset}
                            style={styles.menuIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="key" size={20} color={colors.noir} />
                        </LinearGradient>
                        <Text style={styles.menuItemText}>Minhas Chaves</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.slate[500]} />
                    </TouchableOpacity>
    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleContactSupport}
                    >
                        <LinearGradient
                            colors={colors.gradients.cyberpunk}
                            style={styles.menuIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="help-circle" size={20} color={colors.noir} />
                        </LinearGradient>
                        <Text style={styles.menuItemText}>Suporte</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.slate[500]} />
                    </TouchableOpacity>
                </View>
    
                {/* Botão de Logout */}
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
    
    // Estilos atualizados
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.slate[900], // Fundo escuro
        },
        header: {
            paddingTop: Platform.OS === 'ios' ? 50 : 30,
            paddingBottom: 30,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.slate[900], // Header escuro
            borderBottomWidth: 1,
            borderBottomColor: colors.slate[700], // Borda sutil
        },
        backButton: {
            marginRight: 15,
        },
        headerTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.pearl, // Texto branco perolado
            textShadowColor: colors.glow.blue,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
        },
        avatarContainer: {
            alignItems: 'center',
            marginTop: 20, // Ajuste de posição
            marginBottom: 20,
        },
        avatarWrapper: {
            position: 'relative',
        },
        avatar: {
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 3,
            borderColor: colors.neon.aqua, // Borda neon ao invés de branco
        },
        avatarPlaceholder: {
            width: 120,
            height: 120,
            borderRadius: 60,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: colors.neon.aqua,
            backgroundColor: colors.slate[700], // Fundo escuro
        },
        editAvatarButton: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: colors.neon.gold,
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.slate[700], // Borda mais escura
        },
        userName: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.pearl, // Texto claro
            marginTop: 10,
        },
        userEmail: {
            fontSize: 16,
            color: colors.slate[300], // Texto cinza claro
            marginTop: 4,
        },
        infoCard: {
            backgroundColor: colors.slate[700], // Card escuro
            borderRadius: 16,
            padding: 20,
            marginHorizontal: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.slate[700], // Borda sutil
        },
        infoItem: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
        },
        infoText: {
            fontSize: 14,
            color: colors.slate[300], // Texto cinza claro
            marginLeft: 10,
        },
        menuContainer: {
            backgroundColor: colors.slate[700], // Menu escuro
            borderRadius: 16,
            marginHorizontal: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.slate[700],
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 18,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.slate[700], // Divisória escura
        },
        menuIconContainer: {
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            backgroundColor: colors.slate[700], // Fundo do ícone
        },
        menuItemText: {
            flex: 1,
            fontSize: 16,
            fontWeight: '600',
            color: colors.pearl, // Texto branco
        },
        logoutButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.state.error,
            paddingVertical: 16,
            borderRadius: 12,
            marginHorizontal: 20,
            marginBottom: 30,
            shadowColor: colors.glow.pink,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
        },
        logoutButtonText: {
            color: colors.pearl,
            fontSize: 16,
            fontWeight: '600',
            marginLeft: 10,
        },
    });