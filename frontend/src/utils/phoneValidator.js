/**
 * Valida e formata número de telefone brasileiro
 * Aceita formatos:
 * - 11999999999 (DDD + celular)
 * - +5511999999999 (código internacional + DDD + celular)
 * - (11) 99999-9999 (formatado)
 * - 11 99999-9999 (com espaços)
 */

/**
 * Extrai apenas os dígitos do telefone, removendo código internacional se presente
 * @param {string} phone - Número de telefone em qualquer formato
 * @returns {string} - Apenas os dígitos do telefone nacional
 */
export function extractDigits(phone) {
  if (!phone) return '';

  let cleaned = phone.trim();

  // Remove o + do início se existir
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove todos os caracteres não numéricos
  cleaned = cleaned.replace(/\D/g, '');

  // Se começar com 55 (código do Brasil) e tiver mais de 11 dígitos, remove
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Valida se o telefone está no formato correto (11 dígitos: DDD + celular)
 * @param {string} phone - Número de telefone
 * @returns {{ valid: boolean, phone: string, error?: string, formatted?: string }}
 */
export function validatePhone(phone) {
  const digits = extractDigits(phone);

  if (!digits) {
    return {
      valid: false,
      phone: '',
      error: 'Telefone não informado'
    };
  }

  // Deve ter exatamente 11 dígitos (DDD 2 dígitos + celular 9 dígitos)
  if (digits.length !== 11) {
    return {
      valid: false,
      phone: digits,
      error: `Deve ter 11 dígitos (DDD + celular). Tem ${digits.length}`
    };
  }

  // Verifica se o DDD é válido (11-99)
  const ddd = parseInt(digits.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return {
      valid: false,
      phone: digits,
      error: `DDD inválido: ${ddd}`
    };
  }

  // Celular deve começar com 9
  const firstDigit = digits.charAt(2);
  if (firstDigit !== '9') {
    return {
      valid: false,
      phone: digits,
      error: 'Celular deve começar com 9'
    };
  }

  return {
    valid: true,
    phone: digits,
    formatted: `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`
  };
}

/**
 * Formata um telefone para exibição
 * @param {string} phone - Número de telefone
 * @returns {string} - Telefone formatado ou original se inválido
 */
export function formatPhoneDisplay(phone) {
  const result = validatePhone(phone);
  return result.valid ? result.formatted : phone;
}

/**
 * Máscara de input para telefone
 * @param {string} value - Valor do input
 * @returns {string} - Valor com máscara aplicada
 */
export function phoneMask(value) {
  if (!value) return '';

  // Remove tudo que não é dígito
  let digits = value.replace(/\D/g, '');

  // Limita a 11 dígitos
  if (digits.length > 11) {
    digits = digits.substring(0, 11);
  }

  // Aplica a máscara
  if (digits.length <= 2) {
    return `(${digits}`;
  } else if (digits.length <= 7) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
  } else {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }
}
