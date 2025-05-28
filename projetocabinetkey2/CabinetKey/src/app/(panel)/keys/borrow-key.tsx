import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

type Key = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  user_id: string | null;
  borrower_name: string | null;
  borrower_email: string | null;
  borrower_avatar: string | null;
  created_at: string;
};

export default function BorrowKey() {
  // Estados
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowing, setBorrowing] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'borrowed' | 'favorites'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState<Key | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Formatação de data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Carrega usuário e chaves
  const loadUserAndKeys = async () => {
    setLoading(true);
    try {
      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from('usuario')
          .select('tipo_usuario')
          .eq('id', user.id)
          .single();
        setIsAdmin(userData?.tipo_usuario === 'administrador');
      }

      // Carregar chaves
      const { data: keys, error } = await supabase
        .from('keys')
        .select(`
          id,
          name,
          description,
          status,
          user_id,
          created_at,
          usuario:user_id(nome, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Dados brutos do Supabase:', JSON.stringify(keys, null, 2)); // Depuração

      const formattedKeys = keys.map((key: any) => {
        console.log(`Mapeando chave ${key.id}:`, JSON.stringify(key, null, 2)); // Depuração detalhada
        return {
          id: key.id,
          name: key.name,
          description: key.description,
          status: key.status,
          user_id: key.user_id,
          borrower_name: key.user_id && key.usuario?.nome ? key.usuario.nome : null,
          borrower_email: key.user_id && key.usuario?.email ? key.usuario.email : null,
          borrower_avatar: key.user_id && key.usuario?.avatar_url ? key.usuario.avatar_url : null,
          created_at: key.created_at,
        };
      });

      console.log('Chaves formatadas:', JSON.stringify(formattedKeys, null, 2)); // Depuração
      setKeys(formattedKeys);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as chaves.');
      console.error('Erro ao carregar chaves:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega favoritos
  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('favorites')
          .select('key_id')
          .eq('user_id', user.id);
        if (error) throw error;
        setFavorites(data?.map(fav => fav.key_id) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  // Efeito para carregar dados inicialmente
  useEffect(() => {
    loadUserAndKeys();
    loadFavorites();
  }, []);

  // Função para pegar uma chave
  const handleBorrowKey = async (keyId: string) => {
    setBorrowing(keyId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login primeiro');

      const { error } = await supabase
        .from('keys')
        .update({
          status: 'borrowed',
          user_id: user.id,
        })
        .eq('id', keyId)
        .eq('status', 'available');

      if (error) throw error;

      const { error: loanError } = await supabase
        .from('loans')
        .insert({
          key_id: keyId,
          user_id: user.id,
          status: 'active',
          borrowed_at: new Date().toISOString(),
        });

      if (loanError) throw loanError;

      Alert.alert('Sucesso', 'Chave reservada para você!');
      loadUserAndKeys();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Chave já foi pega');
    } finally {
      setBorrowing(null);
    }
  };

  // Função para devolver uma chave
  const handleReturnKey = async (keyId: string, keyName: string) => {
    setReturning(keyId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: key, error: keyError } = await supabase
        .from('keys')
        .select('id, name, status, user_id')
        .eq('id', keyId)
        .single();

      if (keyError) throw new Error(`Falha ao verificar chave: ${keyError.message}`);
      if (key.user_id !== user.id) {
        throw new Error('Você não pode devolver esta chave, pois não é o usuário que a pegou.');
      }

      Alert.alert(
        'Confirmação',
        `Tem certeza que deseja devolver a chave "${key.name || 'sem nome'}"?`,
        [
          { text: 'Não', style: 'cancel', onPress: () => setReturning(null) },
          {
            text: 'Sim',
            onPress: async () => {
              const { error: updateError } = await supabase
                .from('keys')
                .update({ status: 'available', user_id: null })
                .eq('id', keyId);

              if (updateError) throw new Error(`Falha ao atualizar chave: ${updateError.message}`);

              const { error: loanError } = await supabase
                .from('loans')
                .update({ status: 'returned', returned_at: new Date().toISOString() })
                .eq('key_id', keyId)
                .eq('user_id', user.id)
                .eq('status', 'active');

              if (loanError) throw new Error(`Falha ao atualizar empréstimo: ${loanError.message}`);

              Alert.alert('Sucesso', `A chave "${key.name || 'sem nome'}" foi devolvida com sucesso!`);
              loadUserAndKeys();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao devolver a chave.');
    } finally {
      setReturning(null);
    }
  };

  // Função para deletar uma chave (apenas admin)
  const handleDeleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase.from('keys').delete().eq('id', keyId);
      if (error) throw new Error(`Falha ao excluir chave: ${error.message}`);
      Alert.alert('Sucesso', 'Chave excluída com sucesso!');
      loadUserAndKeys();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao excluir a chave.');
    }
  };

  // Função para editar uma chave (apenas admin)
  const handleEditKey = async () => {
    if (!editKey) return;

    try {
      const { error } = await supabase
        .from('keys')
        .update({
          name: newName || editKey.name,
          description: newDescription || editKey.description,
        })
        .eq('id', editKey.id);

      if (error) throw new Error(`Falha ao atualizar chave: ${error.message}`);

      Alert.alert('Sucesso', 'Chave atualizada com sucesso!');
      setIsEditing(false);
      loadUserAndKeys();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao atualizar a chave.');
    }
  };

  // Função para favoritar/desfavoritar
  const toggleFavorite = async (keyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const isFavorited = favorites.includes(keyId);
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('key_id', keyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, key_id: keyId });
        if (error) throw error;
      }

      setFavorites(prev =>
        isFavorited ? prev.filter(id => id !== keyId) : [...prev, keyId]
      );
      Alert.alert('Sucesso', isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao atualizar favoritos.');
    }
  };

  // Filtra as chaves conforme seleção e busca
  const filteredKeys = keys.filter((key) => {
    const matchesFilter =
      filter === 'favorites' ? favorites.includes(key.id) :
      filter === 'all' ? true :
      key.status === filter;

    const matchesSearch = searchQuery === '' ||
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (key.description && key.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (key.borrower_name && key.borrower_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (key.borrower_email && key.borrower_email.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Renderiza cada item da lista de chaves
  const renderKeyItem = ({ item }: { item: Key }) => {
    const isOwner = userId === item.user_id;
    const statusColor = item.status === 'available' ? colors.neon.aqua : colors.slate[500];
    const isBorrowable = !isOwner && item.status === 'available' && borrowing !== item.id;
    const isReturnable = isOwner && item.status === 'borrowed' && returning !== item.id;

    return (
      <View style={styles.keyCard}>
        <View style={[styles.keyCardContent, {
          backgroundColor: item.status === 'available' ? colors.slate[700] : colors.slate[600]
        }]}>
          <Ionicons
            name={item.status === 'available' ? 'key' : 'lock-closed'}
            size={32}
            color={colors.pearl}
          />

          <View style={styles.keyInfo}>
            <Text style={styles.keyName}>{item.name}</Text>
            {item.description && <Text style={styles.keyDescription}>{item.description}</Text>}
            <Text style={[styles.keyStatus, { color: statusColor }]}>
              Status: {item.status === 'available' ? 'Disponível' :
                isOwner ? 'A chave foi pega por você' :
                `Em posse de ${item.borrower_name || 'Usuário desconhecido'} (${item.borrower_email || 'Email não disponível'})`}
            </Text>
            <Text style={styles.keyRegistered}>
              Registrada em: {formatDate(item.created_at)}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {borrowing === item.id || returning === item.id ? (
              <ActivityIndicator color={colors.pearl} />
            ) : (
              <>
                {isBorrowable && (
                  <TouchableOpacity onPress={() => handleBorrowKey(item.id)}>
                    <Ionicons name="swap-horizontal" size={24} color={colors.neon.aqua} />
                  </TouchableOpacity>
                )}
                {isReturnable && (
                  <TouchableOpacity onPress={() => handleReturnKey(item.id, item.name)}>
                    <Ionicons name="return-up-back" size={24} color={colors.neon.aqua} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <Ionicons
                    name={favorites.includes(item.id) ? 'heart' : 'heart-outline'}
                    size={24}
                    color={favorites.includes(item.id) ? colors.neon.aqua : colors.slate[500]}
                  />
                </TouchableOpacity>
                {isAdmin && (
                  <>
                    <TouchableOpacity onPress={() => {
                      setEditKey(item);
                      setNewName(item.name || '');
                      setNewDescription(item.description || '');
                      setIsEditing(true);
                    }}>
                      <Ionicons name="create" size={24} color={colors.slate[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Confirmação', 'Deseja mesmo excluir esta chave?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', onPress: () => handleDeleteKey(item.id) },
                      ]);
                    }}>
                      <Ionicons name="trash-bin" size={24} color={colors.slate[500]} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.pearl} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Empréstimo de Chave</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchButton}>
          <Ionicons name={showSearch ? "close" : "search"} size={24} color={colors.pearl} />
        </TouchableOpacity>
      </View>

      {/* Modo edição */}
      {isEditing ? (
        <View style={styles.editForm}>
          <Text style={styles.editTitle}>Editar Chave</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da chave"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor={colors.slate[500]}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descrição da chave"
            value={newDescription}
            onChangeText={setNewDescription}
            placeholderTextColor={colors.slate[500]}
            multiline
          />
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={handleEditKey}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Barra de busca */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar chave..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.slate[500]}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <Ionicons name="close" size={20} color={colors.pearl} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Filtros */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              onPress={() => setFilter('all')}
              style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('available')}
              style={[styles.filterButton, filter === 'available' && styles.activeFilterButton]}
            >
              <Text style={[styles.filterText, filter === 'available' && styles.activeFilterText]}>Disponíveis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('borrowed')}
              style={[styles.filterButton, filter === 'borrowed' && styles.activeFilterButton]}
            >
              <Text style={[styles.filterText, filter === 'borrowed' && styles.activeFilterText]}>Emprestadas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('favorites')}
              style={[styles.filterButton, filter === 'favorites' && styles.activeFilterButton]}
            >
              <Text style={[styles.filterText, filter === 'favorites' && styles.activeFilterText]}>Favoritas</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de chaves */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.neon.aqua} size="large" />
            </View>
          ) : (
            <FlatList
              data={filteredKeys}
              renderItem={renderKeyItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="key-outline" size={50} color={colors.slate[500]} />
                  <Text style={styles.emptyListText}>
                    {searchQuery ? 'Nenhuma chave encontrada' : 'Nenhuma chave disponível'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

// Estilos (mantidos como estavam)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[900],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.slate[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  backButton: {
    padding: 5,
  },
  searchButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.pearl,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.slate[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.slate[700],
    color: colors.pearl,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.slate[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: colors.slate[700],
  },
  filterText: {
    color: colors.slate[400],
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterText: {
    color: colors.neon.aqua,
  },
  keyCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  keyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  keyInfo: {
    flex: 1,
    marginLeft: 15,
  },
  keyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.pearl,
    marginBottom: 4,
  },
  keyDescription: {
    fontSize: 14,
    color: colors.slate[300],
    marginBottom: 6,
  },
  keyStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  keyRegistered: {
    fontSize: 12,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyListText: {
    color: colors.slate[400],
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  editForm: {
    padding: 20,
    backgroundColor: colors.slate[800],
    margin: 15,
    borderRadius: 12,
  },
  editTitle: {
    fontSize: 18,
    color: colors.pearl,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: colors.slate[600],
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: colors.pearl,
    backgroundColor: colors.slate[700],
    borderRadius: 8,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: colors.neon.aqua,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  saveButtonText: {
    color: colors.slate[900],
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.slate[600],
    flex: 1,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: colors.pearl,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});