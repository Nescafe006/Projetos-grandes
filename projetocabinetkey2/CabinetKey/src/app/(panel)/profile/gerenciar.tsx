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


// Definição de tipos
type UserProfile = {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: 'usuario' | 'administrador';
  ativo: boolean;
  bio?: string;
  website?: string;
  avatar_url?: string;
  criado_em: string;
  atualizado_em?: string;
};

// Função para gerar logs estruturados
const logEvent = (event: string, details: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    details,
  }, null, 2));
};

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; nome: string; email: string } | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserAndKeys = async () => {
  setLoading(true);
  setRefreshing(true);

  try {
    logEvent('load_users_start', { message: 'Iniciando carregamento de usuários' });

    // 1. Obter o usuário atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logEvent('load_users_error', { error: authError?.message || 'Usuário não autenticado', step: 'get_user' });
      throw new Error('Usuário não autenticado');
    }

    logEvent('load_users_info', { user_id: user.id, email: user.email });

    // 2. Verificar se o usuário é administrador
    const { data: currentUser, error: userError } = await supabase
      .from('usuario')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single();

    if (userError) {
      logEvent('load_users_error', { error: userError.message, step: 'check_admin' });
      throw new Error('Erro ao verificar permissões de administrador');
    }

    if (currentUser?.tipo_usuario !== 'administrador') {
      logEvent('load_users_denied', { user_id: user.id, message: 'Usuário não é administrador' });
      Alert.alert('Acesso Negado', 'Apenas administradores podem visualizar todos os usuários');
      setUsers([]);
      return;
    }

    // 3. Sincronizar auth.users com a tabela usuario
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_auth_users_to_usuario');
    if (syncError) {
      logEvent('load_users_sync_error', { error: syncError.message });
      Alert.alert('Aviso', 'Falha ao sincronizar usuários. Alguns usuários podem não estar visíveis.');
    } else {
      logEvent('load_users_sync_success', {
        message: 'Sincronização de usuários concluída',
        synced_users: syncResult?.length || 0,
        synced_user_ids: syncResult?.map((u: any) => u.id) || [],
      });
    }

    // 4. Buscar usuários da tabela usuario
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuario')
      .select('*')
      .order('criado_em', { ascending: false });

    if (usuarioError) {
      logEvent('load_users_error', { error: usuarioError.message, step: 'fetch_usuarios' });
      throw usuarioError;
    }

    logEvent('load_users_success', {
      user_count: usuarios.length,
      step: 'fetch_usuarios',
      users: usuarios.map((u: any) => ({ id: u.id, email: u.email, tipo_usuario: u.tipo_usuario })),
    });

    if (usuarios.length < 3) {
      logEvent('load_users_warning', {
        message: 'Menos usuários encontrados do que o esperado',
        expected: 3,
        found: usuarios.length,
      });
      Alert.alert('Aviso', `Apenas ${usuarios.length} usuário(s) encontrado(s). Verifique a sincronização com auth.users.`);
    }

    setUsers(usuarios as UserProfile[]);

  } catch (error: any) {
    logEvent('load_users_critical_error', {
      error: error.message,
      stack: error.stack,
    });
    Alert.alert('Erro', `Falha ao carregar usuários: ${error.message}`);
    setUsers([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
    logEvent('load_users_end', { message: 'Carregamento de usuários finalizado' });
  }
};

  useEffect(() => {
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
      minute: '2-digit',
    });
  };

  // Atualiza o status do usuário (ativo/inativo)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      logEvent('toggle_user_status_start', { user_id: id, current_status: currentStatus });
      const { error } = await supabase
        .from('usuario')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.map(user =>
        user.id === id ? { ...user, ativo: !currentStatus } : user
      ));

      logEvent('toggle_user_status_success', { user_id: id, new_status: !currentStatus });
      Alert.alert('Sucesso', `Usuário ${currentStatus ? 'desativado' : 'reativado'}!`);
    } catch (error: any) {
      logEvent('toggle_user_status_error', { user_id: id, error: error.message });
      Alert.alert('Erro', `Falha ao ${currentStatus ? 'desativar' : 'reativar'} usuário: ${error.message}`);
    }
  };

  // Edita um usuário
  const handleEditUser = async () => {
    if (!editingUser) return;
    setRefreshing(true);

    try {
      logEvent('edit_user_start', { user_id: editingUser.id, new_name: newUserName, new_email: newUserEmail });
      const { error } = await supabase
        .from('usuario')
        .update({
          nome: newUserName || editingUser.nome,
          email: newUserEmail || editingUser.email,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      logEvent('edit_user_success', { user_id: editingUser.id });
      Alert.alert('Sucesso', 'Usuário atualizado com sucesso!');
      setIsEditingUser(false);
      loadUserAndKeys();
    } catch (error: any) {
      logEvent('edit_user_error', { user_id: editingUser.id, error: error.message });
      Alert.alert('Erro', `Falha ao atualizar o usuário: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Renderiza cada item da lista
  const renderItem = useCallback(
    ({ item, index }: { item: UserProfile; index: number }) => {
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
              opacity: item.ativo ? 1 : 0.7,
            },
          ]}
        >
          <View style={[
            styles.card,
            !item.ativo && { borderColor: colors.red[500] },
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
                  !item.ativo && styles.inactiveBadge,
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
                  item.ativo ? styles.deleteButton : styles.activateButton,
                ]}
                onPress={() => {
                  Alert.alert(
                    'Confirmar',
                    `Deseja ${item.ativo ? 'desativar' : 'reativar'} ${item.nome || 'este usuário'}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: item.ativo ? 'Desativar' : 'Reativar',
                        onPress: () => handleToggleStatus(item.id, item.ativo),
                      },
                    ]
                  );
                }}
              >
                <Ionicons
                  name={item.ativo ? 'trash' : 'refresh'}
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

// Estilos permanecem iguais
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