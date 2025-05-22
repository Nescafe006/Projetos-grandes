import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Animated, Image, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { Stack, router } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.5;
const CARD_MARGIN = 20;
const CARD_WIDTH = width * 0.85;
const SNAP_INTERVAL = CARD_HEIGHT + CARD_MARGIN;

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: string, nome: string, email: string} | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Carrega todos os usuários (ativos e inativos)
 const loadUserAndKeys = async () => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nome, email, avatar_url, criado_em, ativo, tipo_usuario')
      .order('criado_em', { ascending: false }); // Remove todos os filtros para trazer todos os usuários

    if (error) throw error;
    setUsers(data || []);
  } catch (error) {
    Alert.alert('Erro', 'Falha ao carregar usuários');
    console.error('Erro ao carregar usuários:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};


  useEffect(() => {
    setLoading(true);
    loadUserAndKeys();
  }, []);

  // Formata a data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Atualiza o status do usuário (ativo/inativo)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, ativo: !currentStatus } : user
      ));
      
      Alert.alert('Sucesso', `Usuário ${currentStatus ? 'desativado' : 'reativado'}!`);
    } catch (error) {
      Alert.alert('Erro', `Falha ao ${currentStatus ? 'desativar' : 'reativar'} usuário`);
    }
  };

  // Edita um usuário
  const handleEditUser = async () => {
    if (!editingUser) return;
    setRefreshing(true);

    try {
      const { error } = await supabase
        .from('usuario')
        .update({
          nome: newUserName || editingUser.nome,
          email: newUserEmail || editingUser.email,
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      Alert.alert('Sucesso', 'Usuário atualizado com sucesso!');
      setIsEditingUser(false);
      loadUserAndKeys();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar o usuário');
    } finally {
      setRefreshing(false);
    }
  };

  // Renderiza cada item da lista
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const inputRange = [
        (index - 1) * SNAP_INTERVAL,
        index * SNAP_INTERVAL,
        (index + 1) * SNAP_INTERVAL,
      ];
      const scale = scrollY.interpolate({
        inputRange,
        outputRange: [0.95, 1, 0.95],
        extrapolate: 'clamp',
      });
      const opacity = scrollY.interpolate({
        inputRange,
        outputRange: [0.8, 1, 0.8],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View 
          style={[
            styles.cardContainer,
            { 
              transform: [{ scale }], 
              
              marginVertical: CARD_MARGIN / 2,
              opacity: item.ativo ? 1 : 0.7
            }
          ]}
        >
          <View style={[
            styles.card,
            !item.ativo && { borderColor: colors.red[500] }
          ]}>
            <View style={styles.cardContent}>
              <View style={styles.avatarContainer}>
                {item.avatar_url ? (
                  <Image 
                    source={{ uri: item.avatar_url }} 
                    style={styles.avatar} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={36} color={colors.neon.aqua} />
                  </View>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.nome || item.email.split('@')[0]}
                </Text>
                
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
                
                <View style={[
                  styles.userTypeBadge,
                  item.tipo_usuario === 'administrador' 
                    ? styles.adminBadge 
                    : styles.userBadge,
                  !item.ativo && styles.inactiveBadge
                ]}>
                  <Text style={styles.userTypeText}>
                    {item.tipo_usuario === 'administrador' ? 'Administrador' : 'Usuário'}
                    {!item.ativo && ' (Inativo)'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.dateContainer}>
                <Ionicons name="calendar" size={16} color={colors.slate[400]} />
                <Text style={styles.dateText}>
                  Registrado em: {formatDate(item.criado_em)}
                </Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                onPress={() => {
                  setEditingUser({ id: item.id, nome: item.nome, email: item.email });
                  setNewUserName(item.nome);
                  setNewUserEmail(item.email);
                  setIsEditingUser(true);
                }}
                style={[styles.actionButton, styles.editButton]}
              >
                <Ionicons name="pencil" size={18} color={colors.pearl} />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  item.ativo ? styles.deleteButton : styles.activateButton
                ]}
                onPress={() => {
                  Alert.alert(
                    'Confirmar',
                    `Deseja ${item.ativo ? 'desativar' : 'reativar'} ${item.nome || 'este usuário'}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: item.ativo ? 'Desativar' : 'Reativar', 
                        onPress: () => handleToggleStatus(item.id, item.ativo) }
                    ]
                  );
                }}
              >
                <Ionicons 
                  name={item.ativo ? "trash" : "refresh"} 
                  size={18} 
                  color={colors.pearl} 
                />
                <Text style={styles.actionButtonText}>
                  {item.ativo ? 'Desativar' : 'Reativar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      );
    },
    [scrollY]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.pearl} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neon.aqua} />
        </View>
      ) : (
        <Animated.FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.listContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadUserAndKeys}
              colors={[colors.neon.aqua]}
              tintColor={colors.neon.aqua}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={48} color={colors.slate[500]} />
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          }
        />
      )}

      {/* Modal de Edição */}
      <Modal
        visible={isEditingUser}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditingUser(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Editar Usuário</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nome"
              value={newUserName}
              onChangeText={setNewUserName}
              placeholderTextColor={colors.slate[500]}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              placeholderTextColor={colors.slate[500]}
              keyboardType="email-address"
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setIsEditingUser(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleEditUser}
                disabled={!newUserName || !newUserEmail}
              >
                {refreshing ? (
                  <ActivityIndicator color={colors.pearl} />
                ) : (
                  <Text style={styles.modalButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.pearl,
    textShadowColor: colors.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  listContainer: {
    paddingTop: 15,
    paddingBottom: height * 0.3,
    paddingHorizontal: (width - CARD_WIDTH) / 2,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: CARD_MARGIN,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.slate[700],
    borderWidth: 1,
    borderColor: colors.slate[600],
    shadowColor: colors.glow.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.neon.aqua,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.slate[800],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neon.aqua,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.pearl,
    marginBottom: 5,
    textAlign: 'center',
    maxWidth: '100%',
  },
  userEmail: {
    fontSize: 14,
    color: colors.slate[300],
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: '100%',
  },
  userTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  adminBadge: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.neon.aqua,
  },
  userBadge: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.slate[500],
  },
  inactiveBadge: {
    borderColor: colors.red[500],
    opacity: 0.7,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.pearl,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.slate[800],
    borderRadius: 8,
    marginBottom: 15,
  },
  dateText: {
    fontSize: 12,
    color: colors.slate[300],
    marginLeft: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.slate[600],
    backgroundColor: colors.slate[700],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: colors.slate[600],
    borderWidth: 1,
    borderColor: colors.neon.aqua,
  },
  deleteButton: {
    backgroundColor: colors.slate[600],
    borderWidth: 1,
    borderColor: colors.red[500],
  },
  activateButton: {
    backgroundColor: colors.slate[600],
    borderWidth: 1,
    borderColor: colors.green[500],
  },
  actionButtonText: {
    color: colors.pearl,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
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
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.slate[500],
    marginTop: 15,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: width * 0.8,
    padding: 20,
    backgroundColor: colors.slate[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[600],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.pearl,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 50,
    backgroundColor: colors.slate[700],
    color: colors.pearl,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.slate[600],
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.slate[600],
    marginRight: 10,
  },
  modalSaveButton: {
    backgroundColor: colors.neon.aqua,
    marginLeft: 10,
  },
  modalButtonText: {
    color: colors.pearl,
    fontWeight: 'bold',
    fontSize: 16,
  },
});