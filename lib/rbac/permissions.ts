export const ROLES = {
  ADMIN: 'admin',
  RELIABILITY_ENGINEER: 'reliability_engineer',
  MAINT_PLANNER: 'maint_planner',
  TECHNICIAN: 'technician',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  // User management
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // FMECA
  CREATE_FMECA_STUDY: 'create_fmeca_study',
  EDIT_FMECA_STUDY: 'edit_fmeca_study',
  APPROVE_FMECA_STUDY: 'approve_fmeca_study',
  VIEW_FMECA_STUDY: 'view_fmeca_study',
  
  // CM Tasks
  CREATE_CM_TASK: 'create_cm_task',
  EDIT_CM_TASK: 'edit_cm_task',
  LOG_CM_READING: 'log_cm_reading',
  VIEW_CM_TASK: 'view_cm_task',
  
  // Actions
  CREATE_ACTION: 'create_action',
  ASSIGN_ACTION: 'assign_action',
  UPDATE_ACTION_STATUS: 'update_action_status',
  VIEW_ACTION: 'view_action',
  
  // Assets
  CREATE_ASSET: 'create_asset',
  EDIT_ASSET: 'edit_asset',
  VIEW_ASSET: 'view_asset',
  
  // Attachments
  UPLOAD_ATTACHMENT: 'upload_attachment',
  VIEW_ATTACHMENT: 'view_attachment',
  
  // Audit
  VIEW_AUDIT_LOG: 'view_audit_log',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.CREATE_FMECA_STUDY,
    PERMISSIONS.EDIT_FMECA_STUDY,
    PERMISSIONS.APPROVE_FMECA_STUDY,
    PERMISSIONS.VIEW_FMECA_STUDY,
    PERMISSIONS.CREATE_CM_TASK,
    PERMISSIONS.EDIT_CM_TASK,
    PERMISSIONS.LOG_CM_READING,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.CREATE_ACTION,
    PERMISSIONS.ASSIGN_ACTION,
    PERMISSIONS.UPDATE_ACTION_STATUS,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.CREATE_ASSET,
    PERMISSIONS.EDIT_ASSET,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.UPLOAD_ATTACHMENT,
    PERMISSIONS.VIEW_ATTACHMENT,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  [ROLES.RELIABILITY_ENGINEER]: [
    PERMISSIONS.CREATE_FMECA_STUDY,
    PERMISSIONS.EDIT_FMECA_STUDY,
    PERMISSIONS.APPROVE_FMECA_STUDY,
    PERMISSIONS.VIEW_FMECA_STUDY,
    PERMISSIONS.CREATE_CM_TASK,
    PERMISSIONS.EDIT_CM_TASK,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.CREATE_ACTION,
    PERMISSIONS.ASSIGN_ACTION,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.UPLOAD_ATTACHMENT,
    PERMISSIONS.VIEW_ATTACHMENT,
  ],
  [ROLES.MAINT_PLANNER]: [
    PERMISSIONS.VIEW_FMECA_STUDY,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.CREATE_ACTION,
    PERMISSIONS.ASSIGN_ACTION,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.UPLOAD_ATTACHMENT,
    PERMISSIONS.VIEW_ATTACHMENT,
  ],
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.LOG_CM_READING,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.UPDATE_ACTION_STATUS,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.UPLOAD_ATTACHMENT,
    PERMISSIONS.VIEW_ATTACHMENT,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.APPROVE_FMECA_STUDY,
    PERMISSIONS.VIEW_FMECA_STUDY,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.ASSIGN_ACTION,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.VIEW_ATTACHMENT,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_FMECA_STUDY,
    PERMISSIONS.VIEW_CM_TASK,
    PERMISSIONS.VIEW_ACTION,
    PERMISSIONS.VIEW_ASSET,
    PERMISSIONS.VIEW_ATTACHMENT,
  ],
};

export function hasPermission(userRoles: string[], permission: Permission): boolean {
  return userRoles.some(role => 
    ROLE_PERMISSIONS[role as Role]?.includes(permission)
  );
}

export function hasAnyRole(userRoles: string[], roles: Role[]): boolean {
  return userRoles.some(role => roles.includes(role as Role));
}

export function canApproveStudy(userRoles: string[]): boolean {
  return hasAnyRole(userRoles, [ROLES.ADMIN, ROLES.MANAGER, ROLES.RELIABILITY_ENGINEER]);
}

export function canManageUsers(userRoles: string[]): boolean {
  return hasAnyRole(userRoles, [ROLES.ADMIN]);
}