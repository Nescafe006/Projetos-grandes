import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { Stack, router } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useCallback, useRef } from 'react';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.4; // Altura do card
const CARD_MARGIN = 10; // Margem entre os cards
const SNAP_INTERVAL = CARD_HEIGHT + CARD_MARGIN; // Intervalo para snap

const keyOptions = [
  
    {
        id: '2',
        title: 'Empréstimo de Chave',
        icon: 'swap-horizontal',
        action: () => router.push('/(panel)/keys/borrow-key'),
        preview: 'Faça o empréstimo de uma chave disponível.',
    },
    {
        id: '3',
        title: 'Histórico de chaves',
        icon: 'key',
        action: () => router.push('/(panel)/keys/my-keys'),
        preview: 'Veja o seu histórico de chaves.',
    },
];

export default function KeysDashboard() {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;

    const renderItem = useCallback(
        ({ item, index }: { item: typeof keyOptions[0]; index: number }) => {
            // Interpolação para suavizar a transição de scale e opacity
            const inputRange = [
                (index - 1) * SNAP_INTERVAL,
                index * SNAP_INTERVAL,
                (index + 1) * SNAP_INTERVAL,
            ];
            const scale = scrollY.interpolate({
                inputRange,
                outputRange: [0.9, 1.1, 0.9],
                extrapolate: 'clamp',
            });
            const opacity = scrollY.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
            });

            return (
                <TouchableOpacity
                    style={styles.card}
                    onPress={item.action}
                    onPressIn={() => setActiveIndex(index)}
                >
                    <Animated.View
                        style={[
                            styles.cardContent,
                            { transform: [{ scale }], opacity },
                        ]}
                    >
                        <Ionicons name={item.icon} size={48} color={colors.neon.aqua} />
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.previewText}>{item.preview}</Text>
                    </Animated.View>
                </TouchableOpacity>
            );
        },
        [scrollY]
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.pearl} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Minhas Chaves</Text>
            </View>

            <Animated.FlatList
                data={keyOptions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                vertical
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                decelerationRate={0.9} // Transição mais suave
                contentContainerStyle={styles.listContainer}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            />
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
    listContainer: {
        paddingTop: (height - CARD_HEIGHT) / 2, // Centraliza verticalmente
        paddingBottom: (height - CARD_HEIGHT) / 2,
        paddingHorizontal: (width - (width * 0.6)) / 2, // Centraliza horizontalmente
    },
    card: {
        width: width * 0.6,
        height: CARD_HEIGHT,
        marginVertical: CARD_MARGIN,
        borderRadius: 15,
        backgroundColor: colors.slate[700],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.slate[600],
        shadowColor: colors.glow.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        alignItems: 'center',
        padding: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.pearl,
        marginTop: 15,
        textAlign: 'center',
    },
    previewText: {
        fontSize: 14,
        color: colors.slate[300],
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});