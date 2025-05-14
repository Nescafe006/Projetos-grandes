import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';


type Loan = {
  id: string;
  user: { 
    nome: string | null; 
    email: string | null 
  };
  key: { 
    name: string | null 
  };
  borrowed_at: string;
  returned_at: string | null;
  status: string;
};

export default function LoanHistory() {
  // Estados
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lastResetDates, setLastResetDates] = useState({
    today: new Date().toDateString(),
    week: getMondayOfCurrentWeek(),
    month: new Date().getMonth()
  });

  // Função para obter a segunda-feira da semana atual
  function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para domingo
    return new Date(today.setDate(diff)).toDateString();
  }

  // Função para verificar e resetar os períodos
  const checkAndResetPeriods = useCallback(() => {
    const now = new Date();
    const currentDate = now.toDateString();
    const currentMonday = getMondayOfCurrentWeek();
    const currentMonth = now.getMonth();

    // Verifica se mudou o dia (para resetar o filtro "hoje")
    if (currentDate !== lastResetDates.today) {
      setLastResetDates(prev => ({ ...prev, today: currentDate }));
      if (dateFilter === 'today') {
        loadLoanHistory();
      }
    }

    // Verifica se mudou a semana (segunda-feira diferente)
    if (currentMonday !== lastResetDates.week) {
      setLastResetDates(prev => ({ ...prev, week: currentMonday }));
      if (dateFilter === 'week') {
        loadLoanHistory();
      }
    }

    // Verifica se mudou o mês
    if (currentMonth !== lastResetDates.month) {
      setLastResetDates(prev => ({ ...prev, month: currentMonth }));
      if (dateFilter === 'month') {
        loadLoanHistory();
      }
    }
  }, [lastResetDates, dateFilter]);

  // Carrega o histórico
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
          user:usuario(nome, email),
          key:keys(name)
        `)
        .order('borrowed_at', { ascending: false });

      if (error) throw error;
      
      setLoans(data || []);
      applyFilters(data || [], searchQuery, dateFilter);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Aplica todos os filtros
  const applyFilters = (loansToFilter: Loan[], query: string, dateRange: string) => {
    let filtered = [...loansToFilter];
    
    // Filtro por texto
    if (query) {
      filtered = filtered.filter((loan) => {
        const keyName = loan.key?.name?.toLowerCase() || '';
        const userName = loan.user?.nome?.toLowerCase() || '';
        const userEmail = loan.user?.email?.toLowerCase() || '';
        
        return (
          keyName.includes(query.toLowerCase()) ||
          userName.includes(query.toLowerCase()) ||
          userEmail.includes(query.toLowerCase())
        );
      });
    }
    
    // Filtro por data
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          // Vai para a segunda-feira da semana atual
          startDate = new Date(getMondayOfCurrentWeek());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          startDate = selectedDate;
          break;
      }
      
      filtered = filtered.filter(loan => {
        const loanDate = new Date(loan.borrowed_at);
        return loanDate >= startDate && loanDate <= now;
      });
    }
    
    setFilteredLoans(filtered);
  };

  // Atualiza os filtros
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(loans, query, dateFilter);
  };

  const handleDateFilterChange = (range: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDateFilter(range);
    applyFilters(loans, searchQuery, range);
  };

  // Formata a data
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

  // Renderiza cada item
  const renderItem = ({ item }: { item: Loan }) => (
    <View style={styles.keyCard}>
      <View style={styles.keyCardContent}>
        <View style={styles.keyInfo}>
          <Text style={styles.keyName}>{item.key?.name || 'Chave sem nome'}</Text>
          
          <View style={styles.userInfo}>
            <Text style={styles.keyUser}>
              <Ionicons name="person" size={14} color={colors.slate[300]} /> {item.user?.nome || 'Usuário não encontrado'}
            </Text>
            <Text style={styles.keyEmail}>
              <Ionicons name="mail" size={14} color={colors.slate[300]} /> {item.user?.email || 'Email não disponível'}
            </Text>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              <Ionicons name="calendar" size={14} color={colors.slate[400]} /> Retirada: {formatDate(item.borrowed_at)}
            </Text>
          </View>
          
          {item.returned_at && (
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                <Ionicons name="checkmark-circle" size={14} color={colors.slate[400]} /> Devolução: {formatDate(item.returned_at)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Efeitos
  useEffect(() => {
    loadLoanHistory();
    
    // Configura o verificador de períodos
    const interval = setInterval(checkAndResetPeriods, 60000); // Verifica a cada minuto
    checkAndResetPeriods(); // Verifica imediatamente
    
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Empréstimos</Text>
        
        {/* Barra de busca */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.slate[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por chave, nome ou email..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close" size={20} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filtros de data */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'all' && styles.activeFilter]}
            onPress={() => handleDateFilterChange('all')}
          >
            <Text style={styles.filterText}>Todos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'today' && styles.activeFilter]}
            onPress={() => handleDateFilterChange('today')}
          >
            <Text style={styles.filterText}>Hoje</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'week' && styles.activeFilter]}
            onPress={() => handleDateFilterChange('week')}
          >
            <Text style={styles.filterText}>Semana</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'month' && styles.activeFilter]}
            onPress={() => handleDateFilterChange('month')}
          >
            <Text style={styles.filterText}>Mês</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.neon.aqua} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredLoans}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={50} color={colors.slate[500]} />
              <Text style={styles.emptyText}>
                {searchQuery || dateFilter !== 'all' 
                  ? 'Nenhum empréstimo encontrado' 
                  : 'Nenhum histórico disponível'}
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={loadLoanHistory}
        />
      )}
    </View>
  );
}

// Estilos (permanecem os mesmos)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[900],
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: colors.slate[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[700],
  },
  headerTitle: {
    fontSize: 22,
    color: colors.pearl,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[700],
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.pearl,
    fontSize: 15,
    paddingVertical: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.slate[700],
  },
  activeFilter: {
    backgroundColor: colors.neon.aqua,
  },
  filterText: {
    color: colors.pearl,
    fontSize: 14,
  },
  keyCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[700],
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  keyCardContent: {
    padding: 15,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.pearl,
    marginBottom: 10,
  },
  userInfo: {
    marginBottom: 10,
  },
  keyUser: {
    fontSize: 14,
    color: colors.slate[300],
    marginBottom: 5,
  },
  keyEmail: {
    fontSize: 14,
    color: colors.slate[300],
  },
  dateRow: {
    marginBottom: 5,
  },
  dateText: {
    fontSize: 13,
    color: colors.slate[400],
  },
  listContainer: {
    paddingBottom: 20,
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
    color: colors.slate[400],
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
});