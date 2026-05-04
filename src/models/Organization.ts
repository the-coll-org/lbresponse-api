export interface Provider {
  provider_id: string;
  provider_name: string;
  provider_name_ar?: string | null;
  provider_type?: string | null;
  description?: string | null;
  description_ar?: string | null;
  website?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_phones?: string[] | null;
  email?: string | null;
  contact_type?: string | null;
  is_active?: boolean | null;
  verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  location_ids?: string[] | null;
  social_media_accounts?: string[] | null;
}

export interface Location {
  location_id: string;
  governorate?: string | null;
  city?: string | null;
  city_ar?: string | null;
  district?: string | null;
  district_ar?: string | null;
}

export interface CategoryRecord {
  key: string;
  en_label: string;
  ar_label?: string | null;
  sort_order?: number | null;
}

export interface OrganizationDto {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  email: string | null;
  verified: boolean;
  phone_numbers: string[];
  social_media: string[];
  type: string | null;
  locations: string[];
  organization_type: string | null;
  updated_at: string | null;
}

export interface FilterOption {
  id: string;
  label: string;
  label_ar: string | null;
  result_count: number;
  display_order: number;
}

export interface FilterGroup {
  group_id: string;
  group_label: string;
  group_label_ar: string;
  options: FilterOption[];
}
