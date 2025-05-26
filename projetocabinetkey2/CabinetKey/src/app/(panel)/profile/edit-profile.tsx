import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { StyleSheet } from 'react-native';
import colors from '@/constants/colors';
import { useRouter } from 'expo-router';

export default function EditProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    (async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'É necessário permitir acesso à galeria.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
            setUserId(user.id);
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', user.id)
                .single();
            if (data && isMounted) {
                setNome(data.nome || '');
                setBio(data.bio || '');
                setWebsite(data.website || '');
                setAvatarUrl(data.avatar_url || '');
            }
            if (error) {
                console.error('Erro ao carregar perfil:', error.message);
                Alert.alert('Erro', 'Não foi possível carregar o perfil.');
            }
        }
    })();

    return () => {
        isMounted = false;
    };
  }, []);

  const pickImage = async () => {
    try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user authenticated');
            Alert.alert('Erro', 'Você precisa estar logado para fazer upload.');
            setLoading(false);
            return;
        }
        console.log('Authenticated user:', user.id);

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            console.error('Media library permission denied');
            Alert.alert('Permissão necessária', 'É necessário permitir acesso à galeria.');
            setLoading(false);
            return;
        }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

        if (result.canceled) {
            console.log('Image selection canceled');
            setLoading(false);
            return;
        }

        const file = result.assets[0];
        const ext = file.uri.split('.').pop()?.toLowerCase() ?? '';
        if (!['jpg', 'jpeg', 'png'].includes(ext)) {
            console.error('Unsupported file extension:', ext);
            Alert.alert('Erro', 'Apenas arquivos JPG ou PNG são suportados.');
            setLoading(false);
            return;
        }

        const fileName = `${user.id}-${Date.now()}.${ext}`;
        const filePath = `${fileName}`;
        console.log('Uploading to bucket: avatars, path:', filePath, 'contentType:', `image/${ext === 'jpg' ? 'jpeg' : ext}`);

        const response = await fetch(file.uri);
        const fileBuffer = await response.arrayBuffer();

       const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, fileBuffer, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: true,
            cacheControl: '3600',
          });

        if (error) {
            console.error('Upload error:', error);
            Alert.alert('Erro', `Falha ao enviar a imagem: ${error.message}`);
            setLoading(false);
            return;
        }
        console.log('Upload successful:', data);

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
            console.error('Failed to get public URL for path:', filePath);
            Alert.alert('Erro', 'Não foi possível obter a URL da imagem.');
            setLoading(false);
            return;
        }
        console.log('Public URL:', publicUrlData.publicUrl);
        setAvatarUrl(publicUrlData.publicUrl);

        if (avatarUrl) {
            const oldFilePath = avatarUrl.split('/avatars/')[1];
            if (oldFilePath) {
                console.log('Removing old avatar:', oldFilePath);
                const { error: removeError } = await supabase.storage
                    .from('avatars')
                    .remove([oldFilePath]);
                if (removeError) console.error('Error removing old avatar:', removeError);
            }
        }
    } catch (err) {
        console.error('Unexpected error in pickImage:', JSON.stringify(err, null, 2));
        Alert.alert('Erro', 'Ocorreu um erro inesperado ao processar a imagem.');
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
        console.error('No userId available');
        Alert.alert('Erro', 'Usuário não identificado.');
        return;
    }

    try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) {
            console.error('User ID mismatch:', { authUserId: user?.id, userId });
            Alert.alert('Erro', 'Usuário não autorizado.');
            return;
        }

        console.log('Saving profile:', { userId, nome, bio, website, avatar_url: avatarUrl });
        const { error } = await supabase
            .from('usuario')
            .update({
                nome: nome.trim() || 'Usuário',
                bio,
                website,
                avatar_url: avatarUrl,
                atualizado_em: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Erro ao salvar perfil', error.message);
            return;
        }

        console.log('Profile saved successfully');
        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      
    } catch (err) {
        console.error('Unexpected error in handleSave:', JSON.stringify(err, null, 2));
        Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o perfil.');
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) {
      console.error('No userId available');
      Alert.alert('Erro', 'Usuário não identificado.');
      return;
    }

    // Confirmação antes de deletar
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão permanentemente removidos.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // 1. Deletar avatar do storage se existir
              if (avatarUrl) {
                const oldFilePath = avatarUrl.split('/avatars/')[1];
                if (oldFilePath) {
                  console.log('Removing avatar:', oldFilePath);
                  const { error: removeError } = await supabase.storage
                      .from('avatars')
                      .remove([oldFilePath]);
                  if (removeError) console.error('Error removing avatar:', removeError);
                }
              }
              
              // 2. Deletar dados do usuário da tabela 'usuario'
              const { error: profileError } = await supabase
                .from('usuario')
                .delete()
                .eq('id', userId);
              
              if (profileError) {
                console.error('Error deleting user profile:', profileError);
                Alert.alert('Erro', 'Não foi possível excluir os dados do perfil.');
                return;
              }
              
              // 3. Deletar a conta de autenticação
              const { error: authError } = await supabase.auth.admin.deleteUser(userId);
              
              if (authError) {
                console.error('Error deleting auth user:', authError);
                Alert.alert('Erro', 'Não foi possível excluir a conta de autenticação.');
                return;
              }
              
              // 4. Deslogar o usuário
              await supabase.auth.signOut();
              
              // 5. Redirecionar para a tela inicial
              Alert.alert('Conta Excluída', 'Sua conta foi excluída com sucesso.');
              router.replace('/(auth)/signin/login');
              
            } catch (err) {
              console.error('Unexpected error in account deletion:', err);
              Alert.alert('Erro', 'Ocorreu um erro ao tentar excluir a conta.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveText, loading && { opacity: 0.5 }]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarEditContainer} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.neon.aqua} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={{ color: '#ccc' }}>Selecionar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          editable={!loading}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={styles.input}
          value={bio}
          onChangeText={setBio}
          multiline
          editable={!loading}
        />

        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          editable={!loading}
        />
      </View>

      <View style={styles.deleteSection}>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>Excluir Conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { 
    padding: 20, 
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    color: colors.pearl,
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveText: {
    color: colors.neon.aqua,
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarEditContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.glow.blue,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.slate[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.glow.blue,
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    color: colors.neon.lime,
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 5,
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
    textAlignVertical: 'top',
  },
  deleteSection: {
    marginTop: 'auto',
    paddingVertical: 20,
    alignItems: 'center',
  },
  deleteButton: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.red[500],
    width: '100%',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.pearl,
    fontWeight: 'bold',
  },
});