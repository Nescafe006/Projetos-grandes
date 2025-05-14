// 1. Primeiro, crie um utilitário de navegação (em @/lib/navigation.ts)
export const navigateAfterLogin = (
    userType: 'usuario' | 'administrador',
    router: any,
    userId: string
  ) => {
    // Adicione um timeout para garantir que a navegação ocorra após o estado ser atualizado
    setTimeout(() => {
      const routes = {
        administrador: '(panel)/profile/menu-admin',
        usuario: '(panel)/profile/menu',
      };
      
      const path = routes[userType];
      
      if (path) {
        router.replace(path); // Use replace em vez de navigate para limpar o histórico
      } else {
        console.error('Tipo de usuário inválido:', userType);
        router.replace(routes.usuario); // Fallback seguro
      }
    }, 100);
  };