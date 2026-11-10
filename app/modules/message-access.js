/*
 * Política local de visibilidade das mensagens do EducStat Tete.
 *
 * IMPORTANTE: esta função é uma segunda barreira na interface. Não substitui
 * autorização individual no servidor. A sincronização actual usa uma conta
 * Supabase por unidade (DPE/SDEJT), pelo que a RLS não consegue distinguir
 * utilizadores locais da mesma unidade.
 */
(function (root) {
  'use strict';

  function canViewMessage(message, session) {
    const m = message || {};
    const s = session || {};
    const user = typeof s.utilizador === 'string' ? s.utilizador.trim() : '';
    const unit = Number(s.dist) || 0;
    const profile = Number(s.perfil) || 0;
    if (!user) return false;

    // Visitantes não têm qualquer acesso a mensagens, nem mesmo avisos gerais.
    if (profile === 0) return false;

    // O remetente conserva acesso à mensagem que enviou.
    if (typeof m.deUtil === 'string' && m.deUtil === user) return true;

    // Mensagem individual: só remetente e destinatário.
    // O teste do remetente acima é deliberadamente anterior a este ramo.
    if (m.paraUtil != null && String(m.paraUtil).trim() !== '') {
      return String(m.paraUtil) === user;
    }

    // Pedidos de reposição de palavra-passe: apenas administradores
    // da unidade de origem ou administradores provinciais.
    if (m.tipo === 'senha') {
      return profile === 3 && (!unit || Number(m.deDist) === unit);
    }

    // Avisos gerais enviados pela DPE para todas as unidades.
    if ((Number(m.deDist) || 0) === 0 && (Number(m.para) || 0) === 0) return true;

    // Mensagens institucionais dirigidas à unidade do utilizador.
    return (Number(m.para) || 0) === unit;
  }

  function filterVisibleMessages(messages, session) {
    return (Array.isArray(messages) ? messages : []).filter((m) => canViewMessage(m, session));
  }

  const api = Object.freeze({ canViewMessage, filterVisibleMessages });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EducStatMessageAccess = api;
})(typeof window !== 'undefined' ? window : globalThis);
