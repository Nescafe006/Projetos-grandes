import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import colors from '@/constants/colors';
import { router } from 'expo-router';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideOutLeft 
} from 'react-native-reanimated';


export default function RootLayout() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}


function MainLayout() {
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
  
      if (session?.user) {
        const { data: usuario, error } = await supabase
          .from('usuario')
          .select('tipo_usuario')
          .eq('id', session.user.id)
          .single();
  
        if (error || !usuario) {
          console.error('Erro ao buscar usuário:', error);
          setAuth(null);
          router.replace('/(auth)/signin/login');
        } else {
          setAuth(session.user);
          if (usuario.tipo_usuario === 'administrador') {
            router.replace('/(panel)/profile/menu-admin');
          } else {
            router.replace('/(panel)/profile/menu');
          }
        }
      } else {
        setAuth(null);
        router.replace('/(auth)/signin/login');
      }
  
      setLoading(false);
    };
  
    init();
  }, []);

 

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
        contentStyle: { backgroundColor: colors.noir },
      }}
    >
     

      <Stack.Screen name="(auth)/signin/login" />
      <Stack.Screen name="(auth)/signin/esqueceu-senha" />
      <Stack.Screen name="(auth)/signup/cadastro" />
      <Stack.Screen name="(panel)/profile/menu" />
      <Stack.Screen name="(panel)/profile/menu-admin" />
      <Stack.Screen name="(panel)/profile/gerenciar" />
      <Stack.Screen name="(panel)/profile/edit-profile" />
      <Stack.Screen name="(panel)/keys/borrow-key" />
      <Stack.Screen name="(panel)/keys/my-keys" />
      <Stack.Screen name="(panel)/keys/register-key" />
      <Stack.Screen name="(panel)/keys/chave-admin" />
      <Stack.Screen name="(panel)/keys/BorrowConfirmation/[keyId]" />
      
    </Stack>
  );
}