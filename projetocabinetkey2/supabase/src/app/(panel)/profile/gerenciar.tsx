import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { Stack, router } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // ajuste conforme seu path real

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.4;
const CARD_MARGIN = 10;
const SNAP_INTERVAL = CARD_HEIGHT + CARD_MARGIN;

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar usuários:', error);
      } else {
        setUsers(data);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('usuario')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir usuário');
    } else {
      setUsers((prev) => prev.filter((user) => user.id !== id));
      alert('Usuário desativado!');
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
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
        <TouchableOpacity style={styles.card} onPressIn={() => setActiveIndex(index)}>
          <Animated.View style={[styles.cardContent, { transform: [{ scale }], opacity }]}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={48} color={colors.neon.aqua} />
            )}

            <Text style={styles.cardTitle}>{item.nome}</Text>
            <Text style={styles.previewText}>{item.email}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton}>
                {/* Substitua com o caminho real da rota de edição */}
                {/* onPress={() => router.push(`/panel/users/edit/${item.id}`)} */}
                <Ionicons name="pencil" size={20} color={colors.pearl} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash" size={20} color={colors.pearl} />
              </TouchableOpacity>
            </View>
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
        <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
      </View>

      <Animated.FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate={0.9}
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
    paddingTop: (height - CARD_HEIGHT) / 2,
    paddingBottom: (height - CARD_HEIGHT) / 2,
    paddingHorizontal: (width - width * 0.6) / 2,
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
  actions: {
    flexDirection: 'row',
    marginTop: 15,
  },
  actionButton: {
    marginHorizontal: 10,
    padding: 5,
    backgroundColor: colors.slate[600],
    borderRadius: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.neon.aqua,
    resizeMode: 'cover',
  },
});