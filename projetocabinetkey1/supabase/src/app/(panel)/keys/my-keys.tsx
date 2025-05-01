import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

type Loan = {
  id: string;
  user: { nome: string; email: string };
  key: { name: string };
  borrowed_at: string;
  returned_at: string | null;
  status: string;
};

export default function LoanHistory() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLoanHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          id,
          borrowed_at,
          returned_at,
          status,
          user:usuario (nome, email),
          key:keys (name)
        `)
        .order('borrowed_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
      setFilteredLoans(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de empréstimos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoanHistory();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredLoans(loans);
    } else {
      const filtered = loans.filter((loan) =>
        loan.key.name.toLowerCase().includes(query.toLowerCase()) ||
        loan.user.nome.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLoans(filtered);
    }
  };

  const renderItem = ({ item }: { item: Loan }) => {
    const statusColor = item.status === 'active' ? colors.slate[500] : colors.neon.aqua;

    return (
      <View style={styles.keyCard}>
        <View style={[styles.keyCardContent, { backgroundColor: item.status === 'active' ? colors.slate[700] : colors.slate[600] }]}>
          <Ionicons
            name={item.status === 'active' ? 'key' : 'lock-closed'}
            size={32}
            color={colors.pearl}
          />
          <View style={styles.keyInfo}>
            <Text style={styles.keyName}>{item.key.name}</Text>
            <Text style={styles.keyUser}>Usuário: {item.user.nome} ({item.user.email})</Text>
            <Text style={[styles.keyStatus, { color: statusColor }]}>
              Status: {item.status === 'active' ? 'Em andamento' : 'Devolvido'}
            </Text>
            <Text>Retirada em: {new Date(item.borrowed_at).toLocaleString()}</Text>
            {item.returned_at && <Text>Devolução em: {new Date(item.returned_at).toLocaleString()}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Empréstimos</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome de chave ou usuário"
          placeholderTextColor={colors.slate[400]}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.pearl} size="large" />
      ) : (
        <FlatList
          data={filteredLoans}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[900],
  },
  header: {
    padding: 20,
    backgroundColor: colors.slate[800],
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    color: colors.pearl,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  searchInput: {
    width: '100%',
    padding: 10,
    backgroundColor: colors.slate[600],
    borderRadius: 8,
    color: colors.pearl,
    fontSize: 16,
  },
  keyCard: {
    padding: 15,
    margin: 10,
    backgroundColor: colors.slate[700],
    borderRadius: 8,
  },
  keyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyInfo: {
    flex: 1,
    marginLeft: 15,
  },
  keyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.pearl,
  },
  keyUser: {
    fontSize: 14,
    color: colors.pearl,
  },
  keyStatus: {
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
});
