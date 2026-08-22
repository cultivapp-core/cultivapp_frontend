const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const getSupervisorEffectiveRole = (user) =>
  normalizeRole(
    user?.effective_role ||
    user?.active_role ||
    user?.role,
  );

export const getSupervisorRealRole = (user) =>
  normalizeRole(
    user?.real_role ||
    user?.role,
  );

export const getSupervisorEffectiveCompanyId = (user) =>
  user?.effective_company_id ||
  user?.active_company_id ||
  user?.company_id ||
  null;

export const getSupervisorOperationalUserId = (user) =>
  user?.effective_user_id ||
  user?.subject_user_id ||
  user?.acting_user_id ||
  user?.id ||
  null;

export const isRealRootUser = (user) =>
  getSupervisorRealRole(user) === "ROOT";

export const getSupervisorContext = (user) => ({
  role: getSupervisorEffectiveRole(user),
  companyId: getSupervisorEffectiveCompanyId(user),
  supervisorId: getSupervisorOperationalUserId(user),
  actorUserId: user?.id || null,
  realRole: getSupervisorRealRole(user),
  actingViaGerencia:
    getSupervisorRealRole(user) === "GERENCIA" &&
    Boolean(user?.id) &&
    Boolean(getSupervisorOperationalUserId(user)) &&
    String(user.id) !== String(getSupervisorOperationalUserId(user)),
});
