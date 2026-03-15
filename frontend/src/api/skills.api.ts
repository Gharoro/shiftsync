import { axiosInstance } from './axios.instance';
import type { SkillOption } from '../types/skill.types';

export async function getSkills(): Promise<{ data: SkillOption[] }> {
  return axiosInstance.get<SkillOption[]>('/skills');
}
