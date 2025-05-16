import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SupportPage() {
    const contactEmail = "jo4ovitor4004@gmail.com";
    
    const handleEmailPress = () => {
        const subject = "Suporte Cabinet Key";
        const body = "Olá, preciso de ajuda com...";
        Linking.openURL(`mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: false,
                title: 'Suporte',
                headerStyle: {
                    backgroundColor: colors.slate[800],
                },
                headerTintColor: colors.pearl,
            }} />
            
            {/* Header com botão de voltar */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Suporte Cabinet Key</Text>
            </View>

            {/* Conteúdo principal */}
            <View style={styles.content}>
                {/* Seção Como Funciona */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Como Funciona o Sistema</Text>
                    
                    <View style={styles.featureCard}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="key" size={24} color={colors.neon.aqua} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Gerenciamento de Chaves</Text>
                            <Text style={styles.featureDescription}>
                                Controle completo de todas as chaves físicas da sua organização. 
                                Registre, rastreie e gerencie quem tem acesso a cada chave.
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.featureCard}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="time" size={24} color={colors.neon.aqua} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Histórico de Acesso</Text>
                            <Text style={styles.featureDescription}>
                                Todas as retiradas e devoluções de chaves são registradas com data, 
                                hora e responsável, criando um histórico completo para auditoria.
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.featureCard}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="notifications" size={24} color={colors.neon.aqua} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Alertas Inteligentes</Text>
                            <Text style={styles.featureDescription}>
                                Receba notificações quando chaves estiverem emprestadas por muito tempo 
                                ou quando houver tentativas de acesso não autorizado.
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.featureCard}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="people" size={24} color={colors.neon.aqua} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>Controle de Permissões</Text>
                            <Text style={styles.featureDescription}>
                                Defina níveis de acesso para diferentes usuários. Administradores têm 
                                controle total, enquanto outros usuários podem ter acesso restrito.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Seção de Contato */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contato</Text>
                    <Text style={styles.contactText}>
                        Precisa de ajuda ou tem dúvidas sobre o sistema? Entre em contato através do email abaixo:
                    </Text>
                    
                    <TouchableOpacity 
                        style={styles.emailContainer}
                        onPress={handleEmailPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="mail" size={20} color={colors.neon.aqua} />
                        <Text style={styles.emailText}>{contactEmail}</Text>
                        <Ionicons name="open-outline" size={16} color={colors.slate[400]} />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[900],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: colors.slate[800],
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[700],
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.pearl,
        textShadowColor: colors.glow.blue,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.neon.aqua,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[600],
        paddingBottom: 8,
    },
    featureCard: {
        flexDirection: 'row',
        backgroundColor: colors.slate[700],
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.slate[600],
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.slate[800],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: colors.neon.aqua,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.pearl,
        marginBottom: 5,
    },
    featureDescription: {
        fontSize: 14,
        color: colors.slate[300],
        lineHeight: 20,
    },
    contactText: {
        fontSize: 15,
        color: colors.slate[300],
        marginBottom: 15,
        lineHeight: 22,
    },
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[700],
        borderRadius: 8,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.slate[600],
    },
    emailText: {
        flex: 1,
        fontSize: 16,
        color: colors.pearl,
        marginLeft: 10,
        marginRight: 10,
    },
});