import { View, ActivityIndicator } from 'react-native';
import colors from '@/constants/colors';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // Simula um pequeno delay para garantir que o MainLayout processe a autenticação
    const timer = setTimeout(() => {
      router.replace('/(auth)/signin/login');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.noir }}>
      <ActivityIndicator size="large" color={colors.neon.aqua} />
    </View>
  );
}