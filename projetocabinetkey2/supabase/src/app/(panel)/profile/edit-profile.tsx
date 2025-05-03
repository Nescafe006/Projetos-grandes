import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '@/constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Stack } from 'expo-router';

export default function EditProfile() {
  const { currentName, currentAvatar, currentBio, currentWebsite } = useLocalSearchParams();
  const { user } = useAuth();
  const userId = user?.id;

  const [name, setName] = useState(currentName?.toString() || '');
  const [bio, setBio] = useState(currentBio?.toString() || '');
  const [website, setWebsite] = useState(currentWebsite?.toString() || '');
  const [avatar, setAvatar] = useState(() => {
    const url = currentAvatar?.toString();
    return url ? `${url}?t=${Date.now()}` : '';
  });
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return false;
    }
    return true;
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) throw new Error('Usuário não autenticado');

    const timestamp = Date.now();
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${timestamp}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        });

      if (error) {
        console.error('Erro ao fazer upload do avatar:', error);
        throw error;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error('Falha ao obter a URL pública do avatar');
      }

      return data.publicUrl;
    } catch (error) {
      console.error('Erro no uploadAvatar:', error);
      throw error;
    }
  };

  const handleAvatarChange = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria para mudar a foto');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !userId) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('usuario')
        .select('tipo_usuario')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar tipo_usuario:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        });
        throw fetchError;
      }

      const tipoUsuario = profile?.tipo_usuario || 'usuario';

      let avatarUrl = avatar;

      if (avatar && (avatar.startsWith('file:') || avatar.startsWith('content:'))) {
        try {
          avatarUrl = await uploadAvatar(avatar);
        } catch (uploadError) {
          console.warn('Falha no upload do avatar, salvando sem avatar:', uploadError);
        }
      }

      const { error } = await supabase
        .from('usuario')
        .upsert({
          id: userId,
          nome: name.trim(),
          bio: bio.trim(),
          website: website.trim(),
          avatar_url: avatarUrl || null,
          tipo_usuario: tipoUsuario,
        });

      if (error) {
        console.error('Erro no upsert do usuario:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      router.replace({
        pathname: '/(panel)/profile/menu',
        params: {
          updatedName: name,
          updatedBio: bio,
          updatedWebsite: website,
          updatedAvatar: avatarUrl || '',
        },
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      Alert.alert('Erro', error.message || 'Falha ao salvar alterações', [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.slate[900], colors.slate[700]]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.pearl} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neon.aqua} />
            ) : (
              <Text style={styles.saveText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarChange} style={styles.avatarEditContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={colors.pearl} />
              </View>
            )}
            <LinearGradient
              colors={colors.gradients.cyberpunk}
              style={styles.editBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="camera" size={16} color={colors.noir} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.slate[500]}
            style={styles.input}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Conte sobre você"
            placeholderTextColor={colors.slate[500]}
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Website</Text>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            placeholder="Seu site ou link pessoal"
            placeholderTextColor={colors.slate[500]}
            style={styles.input}
            keyboardType="url"
          />
        </View>

        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Excluir Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  headerTitle: { 
    color: colors.pearl, 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  saveText: { 
    color: colors.neon.aqua, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  avatarSection: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  avatarEditContainer: { 
    position: 'relative' 
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3, 
    borderColor: colors.glow.blue 
  },
  avatarPlaceholder: {
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: colors.slate[700], 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 3, 
    borderColor: colors.glow.blue
  },
  editBadge: { 
    position: 'absolute', 
    right: 0, 
    bottom: 0, 
    borderRadius: 20, 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  formContainer: { 
    marginBottom: 30 
  },
  label: { 
    color: colors.neon.lime, 
    fontSize: 14, 
    marginBottom: 8, 
    marginLeft: 5 
  },
  input: { 
    width: '100%', 
    minHeight: 50, 
    backgroundColor: colors.slate[700], 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    color: colors.pearl, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: colors.slate[700], 
    fontSize: 16,
    textAlignVertical: 'top'
  },
  deleteButton: { 
    padding: 15, 
    alignItems: 'center', 
    backgroundColor: colors.glass.dark, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.state.error 
  },
  deleteButtonText: { 
    color: colors.state.error, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});