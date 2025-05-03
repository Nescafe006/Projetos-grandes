import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function BorrowConfirmation() {
    const { keyId } = useLocalSearchParams<{ keyId: string }>();
    const [returnHour, setReturnHour] = useState<string>('1');
    const [loading, setLoading] = useState(false);

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString()); // 1 a 12 horas

    const handleConfirmBorrow = async () => {
        if (!keyId) {
            console.error('keyId não fornecido');
            Alert.alert('Erro', 'Chave não identificada.');
            return;
        }
    
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('Erro ao obter usuário:', userError);
                throw new Error('Usuário não autenticado.');
            }
    
            console.log('Usuário autenticado:', user.id);
    
            // Verifica se a chave ainda está disponível
            const { data: key, error: keyError } = await supabase
                .from('keys')
                .select('status')
                .eq('id', keyId)
                .eq('user_id', user.id)
                .single();
    
            if (keyError) {
                console.error('Erro ao verificar chave:', keyError);
                throw keyError;
            }
    
            console.log('Status da chave:', key.status); // Log para verificar o status
    
            if (key.status !== 'available') {
                console.log('Chave não está disponível. Status atual:', key.status);
                throw new Error('Esta chave não está mais disponível para empréstimo.');
            }
    
            // Atualiza o status da chave para 'borrowed'
            const { error: updateError } = await supabase
                .from('keys')
                .update({ status: 'borrowed' })
                .eq('id', keyId)
                .eq('user_id', user.id);
    
            if (updateError) {
                console.error('Erro ao atualizar status da chave:', updateError);
                throw updateError;
            }
    
            // Calcula a data/hora de devolução com base na duração escolhida
            const borrowedAt = new Date();
            const returnAt = new Date(borrowedAt.getTime() + parseInt(returnHour) * 60 * 60 * 1000);
    
            // Registra o empréstimo na tabela 'loans'
            const { error: loanError } = await supabase
                .from('loans')
                .insert({
                    key_id: keyId,
                    user_id: user.id,
                    borrowed_at: borrowedAt.toISOString(),
                    expected_return_at: returnAt.toISOString(),
                    status: 'active',
                });
    
            if (loanError) {
                console.error('Erro ao registrar empréstimo:', loanError);
                throw loanError;
            }
    
            Alert.alert('Sucesso', `Você está usando a chave! Devolva até ${returnAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`, [
                { text: 'OK', onPress: () => router.push('/(panel)/keys/page') }
            ]);
        } catch (error) {
            console.error('Erro geral ao confirmar empréstimo:', error);
            Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao solicitar o empréstimo.');
        } finally {
            setLoading(false);
        }
    };

    const renderHourItem = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[styles.hourButton, returnHour === item && styles.hourButtonSelected]}
            onPress={() => setReturnHour(item)}
        >
            <Text style={[styles.hourText, returnHour === item && styles.hourTextSelected]}>
                {item} hora{item === '1' ? '' : 's'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient
                colors={colors.gradients.cyberpunk}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirmar Empréstimo</Text>
            </LinearGradient>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Por quantas horas você vai ficar com a chave?</Text>
                <FlatList
                    data={hours}
                    renderItem={renderHourItem}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hoursList}
                />

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleConfirmBorrow}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.pearl} />
                    ) : (
                        <LinearGradient
                            colors={colors.gradients.tropical}
                            style={styles.submitButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={colors.noir} />
                            <Text style={styles.submitButtonText}>Confirmar Empréstimo</Text>
                        </LinearGradient>
                    )}
                </TouchableOpacity>
            </View>
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
        backgroundColor: colors.slate[900],
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
        textShadowRadius: 10,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.pearl,
        marginBottom: 20,
        textAlign: 'center',
    },
    hoursList: {
        paddingVertical: 10,
    },
    hourButton: {
        backgroundColor: colors.slate[700],
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: colors.slate[700],
    },
    hourButtonSelected: {
        backgroundColor: colors.neon.aqua,
        borderColor: colors.neon.aqua,
    },
    hourText: {
        fontSize: 16,
        color: colors.pearl,
    },
    hourTextSelected: {
        color: colors.noir,
        fontWeight: '600',
    },
    submitButton: {
        borderRadius: 12,
        overflow: 'hidden',
        width: '100%',
        marginTop: 30,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.noir,
        marginLeft: 10,
    },
});