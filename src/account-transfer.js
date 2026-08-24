const ACCOUNT_COUNT = 4;

function accountTemplateText() {
  const lines = [
    '# IDLE POKE LAUNCHER - Cuentas vinculadas (plantilla v2)',
    '# ================================================================',
    '# PASOS: completa, importa una vez y luego edita siempre este archivo.',
    '# El launcher detectara los cambios guardados automaticamente.',
    '# Completa los datos después del signo = sin agregar comillas.',
    '# ADVERTENCIA: las contraseñas de este archivo quedan en texto plano.',
    '# Importa el archivo desde Cuentas y elimínalo cuando ya no lo necesites.',
    ''
  ];
  for (let index = 0; index < ACCOUNT_COUNT; index += 1) {
    lines.push(
      `[CUENTA ${index + 1}]`,
      `nombre_panel=Cuenta ${index + 1}`,
      'usuario=',
      'contrasena=',
      ''
    );
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function parseAccountsTemplate(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  if (!source.trim()) throw new Error('La plantilla está vacía.');
  if (Buffer.byteLength(source, 'utf8') > 64 * 1024) throw new Error('El archivo supera el límite de 64 KB.');

  const sections = new Map();
  let currentIndex = -1;
  for (const [lineIndex, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const section = line.match(/^\[(?:cuenta|account)\s+([1-4])\]$/i);
    if (section) {
      currentIndex = Number(section[1]) - 1;
      if (sections.has(currentIndex)) throw new Error(`La sección CUENTA ${currentIndex + 1} está repetida.`);
      sections.set(currentIndex, {});
      continue;
    }
    if (currentIndex < 0) throw new Error(`Línea ${lineIndex + 1}: falta una sección [CUENTA N].`);
    const separator = rawLine.indexOf('=');
    if (separator < 1) throw new Error(`Línea ${lineIndex + 1}: usa el formato campo=valor.`);
    const key = normalizeKey(rawLine.slice(0, separator).trim());
    const field = {
      nombre_panel: 'label', panel: 'label', label: 'label',
      usuario: 'username', usuario_o_email: 'username', username: 'username', email: 'username',
      contrasena: 'password', password: 'password'
    }[key];
    if (!field) throw new Error(`Línea ${lineIndex + 1}: campo desconocido “${key}”.`);
    const row = sections.get(currentIndex);
    if (Object.hasOwn(row, field)) throw new Error(`La sección CUENTA ${currentIndex + 1} repite el campo ${key}.`);
    row[field] = rawLine.slice(separator + 1).trim();
  }

  if (sections.size !== ACCOUNT_COUNT) throw new Error('El archivo debe contener las secciones [CUENTA 1] hasta [CUENTA 4].');
  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
    const row = sections.get(index);
    if (!row || !Object.hasOwn(row, 'label') || !Object.hasOwn(row, 'username') || !Object.hasOwn(row, 'password')) {
      throw new Error(`CUENTA ${index + 1} debe incluir nombre_panel, usuario y contrasena.`);
    }
    if (!row.username || !row.password) throw new Error(`CUENTA ${index + 1} necesita usuario y contraseña.`);
    if (row.label.length > 40 || row.username.length > 180 || row.password.length > 300) {
      throw new Error(`CUENTA ${index + 1} supera la longitud permitida.`);
    }
    return { label: row.label || `Cuenta ${index + 1}`, username: row.username, password: row.password };
  });
}

module.exports = { accountTemplateText, parseAccountsTemplate };
