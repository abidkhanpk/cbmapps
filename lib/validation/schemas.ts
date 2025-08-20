import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').optional(),
  is_active: z.boolean().optional(),
});

// Organization schemas
export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  code: z.string().min(1, 'Company code is required'),
});

export const siteSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  name: z.string().min(1, 'Site name is required'),
  code: z.string().min(1, 'Site code is required'),
});

export const areaSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  name: z.string().min(1, 'Area name is required'),
  code: z.string().min(1, 'Area code is required'),
});

export const systemSchema = z.object({
  area_id: z.string().min(1, 'Area is required'),
  name: z.string().min(1, 'System name is required'),
  code: z.string().min(1, 'System code is required'),
});

export const assetSchema = z.object({
  system_id: z.string().min(1, 'System is required'),
  name: z.string().min(1, 'Asset name is required'),
  tag_code: z.string().min(1, 'Tag code is required'),
  criticality: z.enum(['low', 'medium', 'high']).default('low'),
});

export const componentSchema = z.object({
  asset_id: z.string().min(1, 'Asset is required'),
  name: z.string().min(1, 'Component name is required'),
  component_code: z.string().min(1, 'Component code is required'),
  type: z.enum(['mechanical', 'electrical', 'instrumentation', 'rotating', 'static', 'other']).default('other'),
});

// FMECA schemas
export const fmecaStudySchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  scope: z.string().optional(),
});

export const fmecaItemSchema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  component_id: z.string().min(1, 'Component is required'),
  function: z.string().min(1, 'Function is required'),
  failure_mode_id: z.string().min(1, 'Failure mode is required'),
  effect: z.string().min(1, 'Effect is required'),
  cause: z.string().min(1, 'Cause is required'),
  detection: z.string().min(1, 'Detection is required'),
  severity: z.number().int().min(1).max(10),
  occurrence: z.number().int().min(1).max(10),
  detectability: z.number().int().min(1).max(10),
  recommended_actions: z.string().optional(),
  monitoring_techniques: z.any().optional(),
});

export const fmecaApprovalSchema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  status: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

// Library schemas
export const fmecaCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Description is required'),
});

export const failureModeSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  code: z.string().min(1, 'Code is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  typical_causes: z.string().optional(),
  typical_effects: z.string().optional(),
  detection_methods: z.string().optional(),
});

export const ratingScaleSchema = z.object({
  name: z.string().min(1, 'Scale name is required'),
  dimension: z.enum(['severity', 'occurrence', 'detectability']),
  min_value: z.number().int().min(1),
  max_value: z.number().int().max(10),
  description: z.string().min(1, 'Description is required'),
});

export const ratingScaleValueSchema = z.object({
  scale_id: z.string().min(1, 'Scale is required'),
  value: z.number().int().min(1).max(10),
  label: z.string().min(1, 'Label is required'),
  description: z.string().min(1, 'Description is required'),
});

export const criticalityRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().min(1, 'Description is required'),
  rpn_thresholds: z.object({
    low: z.object({ min: z.number(), max: z.number() }),
    medium: z.object({ min: z.number(), max: z.number() }),
    high: z.object({ min: z.number(), max: z.number() }),
  }),
  color_map: z.object({
    low: z.string(),
    medium: z.string(),
    high: z.string(),
  }),
});

// CM schemas
export const cmTaskSchema = z.object({
  component_id: z.string().min(1, 'Component is required'),
  technique: z.enum(['vibration', 'thermography', 'ultrasound', 'oil', 'visual', 'motor_current', 'acoustic', 'other']),
  interval_days: z.number().int().min(1, 'Interval must be at least 1 day'),
  procedure: z.string().min(1, 'Procedure is required'),
  acceptance_criteria: z.string().min(1, 'Acceptance criteria is required'),
});

export const cmReadingSchema = z.object({
  task_id: z.string().min(1, 'Task is required'),
  result: z.any(),
  status: z.enum(['ok', 'warning', 'alarm']).default('ok'),
  notes: z.string().optional(),
});

// Action schemas
export const actionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  entity_type: z.enum(['fmeca_item', 'cm_reading', 'component']),
  entity_id: z.string().min(1, 'Entity is required'),
  assignee_user_id: z.string().min(1, 'Assignee is required'),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateActionStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'blocked', 'done', 'cancelled']),
});

export const actionCommentSchema = z.object({
  action_id: z.string().min(1, 'Action is required'),
  note: z.string().min(1, 'Comment is required'),
});

// Search schema
export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['assets', 'components', 'all']).default('all'),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type SiteInput = z.infer<typeof siteSchema>;
export type AreaInput = z.infer<typeof areaSchema>;
export type SystemInput = z.infer<typeof systemSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;
export type FmecaStudyInput = z.infer<typeof fmecaStudySchema>;
export type FmecaItemInput = z.infer<typeof fmecaItemSchema>;
export type FmecaApprovalInput = z.infer<typeof fmecaApprovalSchema>;
export type CmTaskInput = z.infer<typeof cmTaskSchema>;
export type CmReadingInput = z.infer<typeof cmReadingSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type UpdateActionStatusInput = z.infer<typeof updateActionStatusSchema>;
export type ActionCommentInput = z.infer<typeof actionCommentSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;