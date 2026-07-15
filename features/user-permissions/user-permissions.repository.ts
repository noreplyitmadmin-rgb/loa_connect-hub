import { supabase } from '@/lib/supabase';
import type { UserPermissionData, IUserPermissionRepository } from '@/lib/types';


export const userPermissionRepository: IUserPermissionRepository = {
  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error
    return (data || []) as UserPermissionData[];
  },

  async findByUserIdLight(userId) {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('resource_path, grants')
      .eq('user_id', userId);
    if (error) throw error
    return (data || []) as { resource_path: string; grants: string[] }[];
  },

  async upsertPermission(userId, resource_path, grants, denies) {
    const { data, error } = await supabase
      .from('user_permissions')
      .upsert(
        { user_id: userId, resource_path, grants: grants ?? [], denies: denies ?? [] },
        { onConflict: 'user_id,resource_path' }
      )
      .select('*')
      .single();
    if (error) throw error
    return data as UserPermissionData;
  },

  async deleteByUserId(userId) {
    const { error } = await supabase.from('user_permissions').delete().eq('user_id', userId);
    if (error) throw error;
  },

  async listAll() {
    const { data, error } = await supabase.from('user_permissions').select('*').order('user_id').order('resource_path');
    if (error) throw error;
    return (data || []) as UserPermissionData[];
  },

  async deleteAll() {
    const { error } = await supabase.from('user_permissions').delete().neq('id', 0);
    if (error) throw error;
  },

  async insertMany(perms) {
    if (perms.length === 0) return;
    const { error } = await supabase.from('user_permissions').insert(perms);
    if (error) throw error;
  },
}

// Legacy function exports for backward compatibility
import { auth } from '@/lib/auth';

export async function findByUserId(userId: string): Promise<UserPermissionData[] | null> {
  return userPermissionRepository.findByUserId(userId);
}

export async function upsertPermission(
  userId: string,
  resource: string,
  grants?: string[],
  denies?: string[]
): Promise<UserPermissionData | null> {
  const session = await auth();
  const role = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  if (!role?.includes('ADMIN')) {
    throw new Error('Unauthorized');
  }
  return userPermissionRepository.upsertPermission(userId, resource, grants, denies);
}
