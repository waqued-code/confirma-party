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
function extractDigits(phone) {
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
 * @returns {{ valid: boolean, phone: string, error?: string }}
 */
function validatePhone(phone) {
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
      error: `Telefone deve ter 11 dígitos (DDD + celular). Recebido: ${digits.length} dígitos`
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
      error: 'Número de celular deve começar com 9'
    };
  }

  return {
    valid: true,
    phone: digits,
    formatted: `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`
  };
}

/**
 * Valida uma lista de telefones e retorna os válidos e inválidos
 * @param {Array} items - Lista de itens com propriedade phone
 * @returns {{ valid: Array, invalid: Array }}
 */
function validatePhoneList(items) {
  const valid = [];
  const invalid = [];

  for (const item of items) {
    const result = validatePhone(item.phone);
    if (result.valid) {
      valid.push({ ...item, phone: result.phone });
    } else {
      invalid.push({ ...item, phoneError: result.error });
    }
  }

  return { valid, invalid };
}

module.exports = {
  extractDigits,
  validatePhone,
  validatePhoneList
};
