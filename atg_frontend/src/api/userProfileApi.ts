import { apiClient as api } from './apiClient';

export interface UserProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: string;
  correspondenceLanguage?: string;
  nationalityAtBirth?: string;
  currentNationality?: string;
  legalResidency?: string;
  maritalStatus?: string;
  volunteerInterest?: string;
  disability?: boolean;
  refugeeStatus?: boolean;
  closestCity?: string;
}

export interface UserPhone {
  id: number;
  phoneType: string;
  phoneNumber: string;
}

export interface UserAddress {
  id: number;
  address: string;
  address2?: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
}

export interface UserAcademicQualification {
  id: number;
  degreeLevel: string;
  diplomaObtained: string;
  fromDate: string;
  toDate: string;
  mainField: string;
  university: string;
}

export interface UserLanguage {
  id: number;
  language: string;
  level: string;
}

export interface UserItSkill {
  id: number;
  description: string;
}

export interface UserOtherQualification {
  id: number;
  description: string;
}

export interface UserDocument {
  id: number;
  docType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface UserJobRole {
  id: number;
  userId: number;
  jobRoleId: number;
  jobRole?: {
    id: number;
    name: string;
  }
}

export interface UserExperience {
  id: number;
  jobTitle: string;
  employer: string;
  location?: string;
  employmentType?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities?: string;
  achievements?: string;
}

export interface UserReference {
  id: number;
  refName: string;
  relationship: string;
  organization?: string;
  position?: string;
  email?: string;
  phone?: string;
}

export interface FullUserProfile {
  id: number;
  email: string;
  name: string;
  profile?: UserProfile;
  phones: UserPhone[];
  addresses: UserAddress[];
  academicQualifications: UserAcademicQualification[];
  languages: UserLanguage[];
  itSkills: UserItSkill[];
  documents: UserDocument[];
  otherQualifications: UserOtherQualification[];
  userJobRoles: UserJobRole[];
  experiences: UserExperience[];
  references: UserReference[];
}

export const userProfileApi = {
  getProfile: async (userId: number): Promise<FullUserProfile> => {
    const res = await api.get(`/user-profile/${userId}`);
    return res.data;
  },

  updatePersonal: async (data: UserProfile) => {
    const res = await api.put('/user-profile/personal', data);
    return res.data;
  },

  updateJobRoles: async (jobRoleIds: number[]) => {
    const res = await api.put('/user-profile/jobroles', { jobRoleIds });
    return res.data;
  },

  getJobRoles: async (): Promise<{ userJobRoles: { id: number; userId: number; jobRoleId: number; jobRole: { id: number; name: string; status: string } }[] }> => {
    const res = await api.get('/user-profile/jobroles');
    return res.data;
  },

  addEntity: async (entity: string, data: any) => {
    const res = await api.post(`/user-profile/${entity}`, data);
    return res.data;
  },

  updateEntity: async (entity: string, id: number, data: any) => {
    const res = await api.put(`/user-profile/${entity}/${id}`, data);
    return res.data;
  },

  deleteEntity: async (entity: string, id: number) => {
    const res = await api.delete(`/user-profile/${entity}/${id}`);
    return res.data;
  },

  uploadDocument: async (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);
    
    const res = await api.post('/user-profile/document/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  deleteDocument: async (id: number) => {
    const res = await api.delete(`/user-profile/document/${id}`);
    return res.data;
  }
};
