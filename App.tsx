import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type GameStatus = 'quero' | 'jogando' | 'zerado';
type Filter = 'todos' | GameStatus;

type GameItem = {
  id: string;
  title: string;
  status: GameStatus;
  createdAt: number;
};

const STORAGE_KEY = '@backlog_games_v1';

const STATUS_META: Record<
  GameStatus,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; background: string; border: string }
> = {
  quero: {
    label: 'Quero jogar',
    icon: 'bookmark-outline',
    background: '#1B2440',
    border: '#5B7CFF',
  },
  jogando: {
    label: 'Jogando',
    icon: 'controller-classic-outline',
    background: '#1C3A34',
    border: '#2DD4BF',
  },
  zerado: {
    label: 'Zerado',
    icon: 'trophy-outline',
    background: '#3A2A1B',
    border: '#F59E0B',
  },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'quero', label: 'Quero jogar' },
  { key: 'jogando', label: 'Jogando' },
  { key: 'zerado', label: 'Zerado' },
];

const SAMPLE_ITEMS: GameItem[] = [
  { id: '1', title: 'Hollow Knight', status: 'quero', createdAt: Date.now() - 100000 },
  { id: '2', title: 'Elden Ring', status: 'jogando', createdAt: Date.now() - 90000 },
  { id: '3', title: 'Celeste', status: 'zerado', createdAt: Date.now() - 80000 },
];

function cycleStatus(status: GameStatus): GameStatus {
  if (status === 'quero') return 'jogando';
  if (status === 'jogando') return 'zerado';
  return 'quero';
}

function formatCount(count: number) {
  return count.toString().padStart(2, '0');
}

export default function App() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setItems(JSON.parse(raw));
        } else {
          setItems(SAMPLE_ITEMS);
        }
      } catch (error) {
        console.log('Erro ao carregar itens:', error);
        setItems(SAMPLE_ITEMS);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  useEffect(() => {
    if (loading) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((error) => {
      console.log('Erro ao salvar itens:', error);
    });
  }, [items, loading]);

  const filteredItems = useMemo(() => {
    if (filter === 'todos') return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      quero: items.filter((item) => item.status === 'quero').length,
      jogando: items.filter((item) => item.status === 'jogando').length,
      zerado: items.filter((item) => item.status === 'zerado').length,
    };
  }, [items]);

  const handleAddItem = () => {
    const value = text.trim();

    if (!value) {
      Alert.alert('Campo vazio', 'Digite o nome de um jogo para adicionar ao backlog.');
      return;
    }

    const newItem: GameItem = {
      id: `${Date.now()}`,
      title: value,
      status: 'quero',
      createdAt: Date.now(),
    };

    setItems((current) => [newItem, ...current]);
    setText('');
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Remover jogo', 'Deseja excluir este item do backlog?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => setItems((current) => current.filter((item) => item.id !== id)),
      },
    ]);
  };

  const handleCycleItem = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: cycleStatus(item.status) } : item,
      ),
    );
  };

  const handleClearAll = () => {
    if (!items.length) return;

    Alert.alert('Limpar backlog', 'Apagar todos os itens salvos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => setItems([]) },
    ]);
  };

  const renderItem = ({ item }: { item: GameItem }) => {
    const meta = STATUS_META[item.status];

    return (
      <TouchableOpacity activeOpacity={0.88} onPress={() => handleCycleItem(item.id)}>
        <View style={[styles.card, { borderColor: meta.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: meta.background, borderColor: meta.border }]}>
              <MaterialCommunityIcons name={meta.icon} size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>{meta.label}</Text>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteItem(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${item.title}`}
            >
              <Ionicons name="trash-outline" size={18} color="#FF9AA9" />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardHint}>Toque no card para alterar o status.</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#050816', '#0B1020', '#111827']} style={styles.background}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.kicker}>ARQAPMO • React Native</Text>
                  <Text style={styles.title}>Backlog de Jogos</Text>
                </View>

                <View style={styles.heroIconWrap}>
                  <MaterialCommunityIcons name="gamepad-variant-outline" size={28} color="#E5E7EB" />
                </View>
              </View>

              <Text style={styles.subtitle}>
                Organize jogos que quer jogar, já está jogando ou já zerou em uma interface escura e moderna.
              </Text>

              <View style={styles.statsRow}>
                <StatBox value={formatCount(stats.total)} label="Total" />
                <StatBox value={formatCount(stats.jogando)} label="Jogando" />
                <StatBox value={formatCount(stats.zerado)} label="Zerados" />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.sectionLabel}>Novo jogo</Text>
              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Digite o nome do jogo"
                  placeholderTextColor="#7C879A"
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleAddItem}
                  returnKeyType="done"
                  style={styles.input}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddItem} activeOpacity={0.85}>
                  <Ionicons name="add" size={22} color="#0B1020" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((option) => {
                const active = filter === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setFilter(option.key)}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionLabel}>Lista de itens</Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearText}>Limpar tudo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listArea}>
              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loaderText}>Carregando backlog...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={filteredItems.length === 0 && styles.emptyContent}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="cards-outline" size={42} color="#9CA3AF" />
                      <Text style={styles.emptyTitle}>Sua lista está vazia</Text>
                      <Text style={styles.emptyText}>
                        Adicione seu primeiro jogo para começar a montar o backlog.
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  hero: {
    marginBottom: 18,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  kicker: {
    color: '#A5B4FC',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: 'rgba(15,23,42,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F9FAFB',
    fontSize: 15,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  filterText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0B1020',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clearText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  listArea: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardHint: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.7)',
    gap: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderWrap: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loaderText: {
    color: '#CBD5E1',
  },
});
