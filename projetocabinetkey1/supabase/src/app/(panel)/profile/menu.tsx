import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, ImageBackground, Platform, Modal } from 'react-native';
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/contexts/AuthContext';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeInUp, SlideInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Stack } from 'expo-router';

export default function Profile() {
    const { setAuth, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        avatarUrl: null as string | null,
        role: 'admin',
    });
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        type: 'success' as 'success' | 'error',
        title: '',
        message: '',
        errorDetails: null as any,
    });
    const AnimatedView = Animated.View;
    const AnimatedText = Animated.Text;
    const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    const animatedModalStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 100 }) }],
        opacity: withSpring(opacity.value, { damping: 20, stiffness: 100 }),
    }));

    const showAlert = (type: 'success' | 'error', title: string, message: string, errorDetails?: any) => {
        setAlertConfig({ type, title, message, errorDetails });
        setAlertVisible(true);
        scale.value = 1;
        opacity.value = 1;
        if (errorDetails) {
            console.log('Detalhes do erro no CustomAlert:', errorDetails);
        }
    };

    const hideAlert = () => {
        scale.value = 0;
        opacity.value = 0;
        setTimeout(() => setAlertVisible(false), 300); // Wait for animation to finish
    };

    const CustomAlert = () => (
        <Modal
            transparent
            visible={alertVisible}
            animationType="none"
            onRequestClose={hideAlert}
        >
            <View style={styles.modalOverlay}>
                <AnimatedView style={[styles.alertCard, animatedModalStyle]}>
                    <Ionicons
                        name={alertConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                        size={40}
                        color={alertConfig.type === 'success' ? colors.neon.aqua : colors.state.error}
                        style={styles.alertIcon}
                    />
                    <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                    <Text style={styles.alertMessage}>{alertConfig.message}</Text>
                    <TouchableOpacity style={styles.alertButton} onPress={hideAlert}>
                        <Text style={styles.alertButtonText}>Fechar</Text>
                    </TouchableOpacity>
                </AnimatedView>
            </View>
        </Modal>
    );

    const handleSignout = useCallback(async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw new Error(error.message);
    
            setAuth(null);
    
            // Garante que a navegação ocorra apenas após o estado ser limpo
            router.push('/(auth)/signin/login');
    
          
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao sair da conta. Tente novamente!';
            showAlert('error', 'Ops, algo deu errado!', errorMessage);
            console.error('Erro ao deslogar:', err);
        } finally {
            setLoading(false);
        }
    }, [setAuth, router]);
    
    const uploadAvatar = async (uri: string) => {
        if (!user?.id) throw new Error('Usuário não autenticado');

        console.log('Tentando fazer upload do avatar com URI:', uri);

        const timestamp = Date.now();
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}-${timestamp}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            if (!uri || (!uri.startsWith('file:') && !uri.startsWith('content:') && !uri.startsWith('http'))) {
                throw new Error('URI da imagem inválida');
            }

            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Falha ao buscar a imagem: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log('Blob criado com sucesso, tamanho:', blob.size);

            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                });

          

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            console.log('URL pública obtida:', data.publicUrl);

            if (!data.publicUrl) {
                throw new Error('Falha ao obter a URL pública do avatar');
            }

            return data.publicUrl;
        } catch (error: any) {
            console.error('Erro detalhado no uploadAvatar:', {
                message: error.message,
                code: error.code,
                status: error.status,
                details: error.details,
                hint: error.hint,
            });
            throw error;
        }
    };

    const handleAvatarChange = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            showAlert('error', 'Permissão negada', 'Precisamos de acesso à sua galeria para mudar a foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            console.log('Imagem selecionada com URI:', uri);
            setLoading(true);

            try {
                const avatarUrl = await uploadAvatar(uri);
                const { error } = await supabase
                    .from('usuario')
                    .update({ avatar_url: avatarUrl })
                    .eq('id', user?.id);

                if (error) {
                    console.error('Erro ao atualizar avatar_url:', error);
                    throw error;
                }

                setUserDetails((prev) => ({ ...prev, avatarUrl }));
                showAlert('success', 'Foto atualizada!', 'Sua nova foto de perfil está incrível!');
            } catch (error: any) {
                const errorMessage = error.message || 'Não foi possível atualizar sua foto. Tente novamente!';
                showAlert('error', 'Erro ao atualizar', errorMessage, error);
            } finally {
                setLoading(false);
            }
        }
    };

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
                    .eq('id', user.id)
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
                currentAvatar: profileData.avatar_url || user.user_metadata?.avatar_url || '',
                userId: user.id,
            };

            console.log('Navegando com params:', params);
            router.push({ pathname: '/(panel)/profile/edit-profile', params });
        } catch (error) {
            showAlert('error', 'Erro crítico', error instanceof Error ? error.message : 'Falha ao carregar perfil.', error);
        }
    };

    const handleContactSupport = async () => {
        showAlert('info', 'Suporte', 'Estamos trabalhando nisso! Em breve você poderá contatar nosso suporte.');
    };

    const handleCheckKeys = () => {
        router.push('/(panel)/keys/page');
    };

    const handleGoHome = () => {
        router.push('/(panel)/profile/menu');
    };

    useEffect(() => {
        const fetchUserDetails = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('usuario')
                        .select('nome, avatar_url, tipo_usuario')
                        .eq('id', user.id)
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
        <ImageBackground
          
            style={styles.container}
            resizeMode="cover"
        >
            <View style={styles.backgroundOverlay} />
            <Stack.Screen options={{ headerShown: false }} />
            <CustomAlert />
            <AnimatedView
                entering={FadeInUp.duration(600)}
                style={styles.header}
            >
     
                <AnimatedText
                    entering={FadeInDown.duration(600).delay(200)}
                    style={styles.headerTitle}
                >
                    Meu Perfil
                </AnimatedText>
            </AnimatedView>

            <AnimatedView
                entering={FadeInDown.duration(600).delay(300)}
                style={styles.avatarContainer}
            >
                <View style={styles.avatarWrapper}>
                    {userDetails.avatarUrl ? (
                        <AnimatedView entering={FadeInUp.duration(600).delay(400)}>
                            <Image
                                source={{ uri: userDetails.avatarUrl }}
                                style={styles.avatar}
                            />
                        </AnimatedView>
                    ) : (
                        <AnimatedView entering={FadeInUp.duration(600).delay(400)}>
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={48} color={colors.neon.aqua} />
                            </View>
                        </AnimatedView>
                    )}
                  
                </View>
                <AnimatedText
                    entering={FadeInDown.duration(600).delay(600)}
                    style={styles.userName}
                >
                    {userDetails.fullName}
                </AnimatedText>
                <AnimatedText
                    entering={FadeInDown.duration(600).delay(700)}
                    style={styles.userEmail}
                >
                    {user?.email}
                </AnimatedText>
            </AnimatedView>

            <AnimatedView
                entering={SlideInRight.duration(600).delay(800)}
                style={styles.infoCard}
            >
                <View style={styles.infoItem}>
                    <Ionicons name="id-card" size={20} color={colors.neon.aqua} />
                    <Text style={styles.infoText}>ID: {user?.id}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.neon.aqua} />
                    <Text style={styles.infoText}>Conta {userDetails.role === 'admin' ? 'Usuário' : 'Padrão'}</Text>
                </View>
            </AnimatedView>

            <AnimatedView
                entering={SlideInRight.duration(600).delay(900)}
                style={styles.menuContainer}
            >
                <AnimatedTouchableOpacity
                    entering={FadeInDown.duration(600).delay(1000)}
                    style={styles.menuItem}
                    onPress={handleEditProfile}
                >
                    <Ionicons name="create" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Editar Perfil</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </AnimatedTouchableOpacity>

                <AnimatedTouchableOpacity
                  
                    style={styles.menuItem}
                    onPress={handleCheckKeys}
                >
                    <Ionicons name="key" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Minhas Chaves</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </AnimatedTouchableOpacity>

                <AnimatedTouchableOpacity
                  
                    style={styles.menuItem}
                    onPress={handleContactSupport}
                >
                    <Ionicons name="help-circle" size={20} color={colors.neon.aqua} />
                    <Text style={styles.menuItemText}>Suporte</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
                </AnimatedTouchableOpacity>
            </AnimatedView>

            <AnimatedTouchableOpacity
              
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
            </AnimatedTouchableOpacity>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.slate[900],
        opacity: 0.7,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertCard: {
        backgroundColor: colors.slate[800],
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: colors.neon.aqua,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.slate[700],
    },
    alertIcon: {
        marginBottom: 12,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.pearl,
        textAlign: 'center',
        marginBottom: 8,
    },
    alertMessage: {
        fontSize: 16,
        color: colors.slate[300],
        textAlign: 'center',
        marginBottom: 20,
    },
    alertButton: {
        backgroundColor: colors.neon.aqua,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.glow.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    alertButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.noir,
    },
});