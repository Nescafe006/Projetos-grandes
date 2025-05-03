interface CustomHref extends Record<string, string> {
    '/': string;
    '/(auth)/signin/page': string;
    '/(auth)/signup/page': string;
    '/(auth)/forgot-password': string;
    '/(panel)/profile/page': string;
    // Adicione outras rotas conforme necessário
  }