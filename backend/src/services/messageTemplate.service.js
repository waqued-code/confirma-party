const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Diretrizes do WhatsApp Business API para validação de mensagens
 */
const WHATSAPP_GUIDELINES = {
  maxLength: 1024,
  minLength: 20,
  forbiddenPatterns: [
    /https?:\/\/[^\s]+/gi,                    // URLs
    /[A-Z]{5,}/g,                              // CAPS LOCK excessivo
    /!{3,}/g,                                  // Exclamações excessivas
    /\$\$\$/g,                                 // Símbolos de dinheiro repetidos
    /grátis|gratuito|promoção|desconto/gi,    // Palavras promocionais
    /clique aqui|acesse agora|última chance/gi, // CTAs agressivos
    /urgente|imperdível|exclusivo/gi,         // Linguagem de urgência
  ],
  requiredPatterns: [
    /\{nome_convidado\}/g,                    // Placeholder de nome
  ],
  recommendedPatterns: [
    /\?$/,                                     // Terminar com pergunta
  ]
};

/**
 * Valida uma mensagem de template segundo diretrizes do WhatsApp
 * @param {string} message - Mensagem a ser validada
 * @returns {Object} - { isValid: boolean, errors: string[], warnings: string[] }
 */
exports.validateMessage = (message) => {
  const errors = [];
  const warnings = [];

  if (!message || typeof message !== 'string') {
    return { isValid: false, errors: ['Mensagem é obrigatória'], warnings: [] };
  }

  const cleanMessage = message.trim();

  // Verificar tamanho
  if (cleanMessage.length < WHATSAPP_GUIDELINES.minLength) {
    errors.push(`Mensagem muito curta (mínimo ${WHATSAPP_GUIDELINES.minLength} caracteres)`);
  }

  if (cleanMessage.length > WHATSAPP_GUIDELINES.maxLength) {
    errors.push(`Mensagem muito longa (máximo ${WHATSAPP_GUIDELINES.maxLength} caracteres)`);
  }

  // Verificar padrões proibidos
  WHATSAPP_GUIDELINES.forbiddenPatterns.forEach((pattern, index) => {
    if (pattern.test(cleanMessage)) {
      const errorMessages = [
        'Não inclua links ou URLs na mensagem',
        'Evite usar LETRAS MAIÚSCULAS em excesso',
        'Evite usar exclamações em excesso (!!!)',
        'Evite símbolos de dinheiro repetidos',
        'Evite palavras promocionais (grátis, promoção, desconto)',
        'Evite chamadas agressivas (clique aqui, acesse agora)',
        'Evite linguagem de urgência (urgente, imperdível)',
      ];
      errors.push(errorMessages[index] || 'Padrão não permitido encontrado');
    }
  });

  // Verificar padrões obrigatórios
  if (!WHATSAPP_GUIDELINES.requiredPatterns[0].test(cleanMessage)) {
    errors.push('A mensagem deve conter {nome_convidado} para personalização');
  }

  // Verificar padrões recomendados (apenas warnings)
  if (!WHATSAPP_GUIDELINES.recommendedPatterns[0].test(cleanMessage)) {
    warnings.push('Recomendamos terminar a mensagem com uma pergunta para incentivar resposta');
  }

  // Verificar caracteres especiais problemáticos
  const problematicChars = cleanMessage.match(/[^\w\s\-.,!?áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ*_~{}]/g);
  if (problematicChars && problematicChars.length > 5) {
    warnings.push('A mensagem contém muitos caracteres especiais que podem não renderizar bem');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    characterCount: cleanMessage.length,
    maxCharacters: WHATSAPP_GUIDELINES.maxLength
  };
};

/**
 * Valida e atualiza o status do template de uma festa
 * @param {string} partyId - ID da festa
 * @returns {Object} - Resultado da validação
 */
exports.validatePartyTemplate = async (partyId) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId }
  });

  if (!party) {
    throw new Error('Festa não encontrada');
  }

  if (!party.inviteMessage) {
    return {
      isValid: false,
      status: 'DRAFT',
      errors: ['Nenhuma mensagem de convite cadastrada'],
      warnings: []
    };
  }

  const validation = exports.validateMessage(party.inviteMessage);

  // Atualizar status no banco
  const newStatus = validation.isValid ? 'APPROVED' : 'REJECTED';

  await prisma.party.update({
    where: { id: partyId },
    data: {
      messageTemplateStatus: newStatus,
      validationErrors: validation.errors.length > 0 ? JSON.stringify(validation.errors) : null
    }
  });

  return {
    ...validation,
    status: newStatus
  };
};

/**
 * Submete a mensagem para revisão (simula processo de aprovação)
 * @param {string} partyId - ID da festa
 * @param {string} message - Mensagem a ser submetida
 */
exports.submitForReview = async (partyId, message) => {
  // Valida a mensagem primeiro
  const validation = exports.validateMessage(message);

  if (!validation.isValid) {
    // Se não passa na validação automática, retorna rejeitado
    await prisma.party.update({
      where: { id: partyId },
      data: {
        inviteMessage: message,
        messageTemplateStatus: 'REJECTED',
        validationErrors: JSON.stringify(validation.errors)
      }
    });

    return {
      success: false,
      status: 'REJECTED',
      errors: validation.errors,
      warnings: validation.warnings,
      guidelines: getApprovalGuidelines()
    };
  }

  // Se passa na validação, aprova automaticamente
  await prisma.party.update({
    where: { id: partyId },
    data: {
      inviteMessage: message,
      messageTemplateStatus: 'APPROVED',
      validationErrors: null
    }
  });

  return {
    success: true,
    status: 'APPROVED',
    errors: [],
    warnings: validation.warnings,
    message: 'Mensagem aprovada! Você pode enviar mensagens de teste e para os convidados.'
  };
};

/**
 * Retorna diretrizes para aprovação de mensagens
 */
function getApprovalGuidelines() {
  return {
    title: 'Diretrizes para aprovação de mensagem',
    rules: [
      'A mensagem deve ter entre 20 e 1024 caracteres',
      'Não inclua links ou URLs',
      'Evite usar LETRAS MAIÚSCULAS em excesso',
      'Não use exclamações repetidas (!!!)',
      'Evite palavras promocionais como "grátis", "promoção", "desconto"',
      'Evite linguagem de urgência como "urgente", "imperdível"',
      'A mensagem deve conter {nome_convidado} para personalização',
      'Recomendamos terminar com uma pergunta para incentivar resposta'
    ],
    tips: [
      'Seja pessoal e caloroso, como se estivesse falando com um amigo',
      'Mencione o nome do evento e a data de forma clara',
      'Peça confirmação de presença de forma gentil',
      'Use formatação do WhatsApp com moderação: *negrito* para destaques'
    ]
  };
}

exports.getApprovalGuidelines = getApprovalGuidelines;

/**
 * Verifica se a mensagem está aprovada e pode ser enviada
 */
exports.canSendMessages = async (partyId) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      messageTemplateStatus: true,
      inviteMessage: true
    }
  });

  if (!party) {
    return { canSend: false, reason: 'Festa não encontrada' };
  }

  if (!party.inviteMessage) {
    return { canSend: false, reason: 'Nenhuma mensagem cadastrada' };
  }

  if (party.messageTemplateStatus !== 'APPROVED') {
    return {
      canSend: false,
      reason: 'A mensagem precisa ser aprovada antes do envio',
      status: party.messageTemplateStatus
    };
  }

  return { canSend: true };
};
