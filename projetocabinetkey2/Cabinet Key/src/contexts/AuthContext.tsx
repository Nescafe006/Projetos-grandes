import { User, Session } from '@supabase/supabase-js'
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

interface UserProfile {
  id: string
  nome: string
  tipo_usuario: 'usuario' | 'administrador'
  avatar_url?: string | null
}

interface AuthContextProps {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  setAuth: (user: User | null, profile?: UserProfile | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Função para atualizar tanto o user quanto o profile
  const setAuth = (authUser: User | null, authProfile?: UserProfile | null) => {
    setUser(authUser)
    setProfile(authProfile || null)
  }

  // Função de logout completa
  const signOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setAuth(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Carrega o perfil do usuário
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('id, nome, tipo_usuario, avatar_url')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Listener para mudanças de autenticação
  useEffect(() => {
    setIsLoading(true)
    
    // Primeiro verifica a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserProfile(session.user.id).then(profile => {
          setProfile(profile)
          setIsLoading(false)
        })
      } else {
        setAuth(null)
        setIsLoading(false)
      }
    })

    // Configura o listener para mudanças futuras
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id)
          setAuth(session.user, userProfile)
        } else {
          setAuth(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, setAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)